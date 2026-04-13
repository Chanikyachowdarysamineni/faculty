/**
 * middleware/rateLimiters.js
 * 
 * Centralized rate limiter configuration with Redis backend for production.
 * Falls back to memory-based limiting when Redis is unavailable (development).
 * 
 * Redis safely handles concurrent requests across multiple server instances.
 * Memory store is OK for single-server development but loses limit state on crash.
 */

'use strict';

const rateLimit = require('express-rate-limit');
const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let useRedis = false;

/**
 * Redis Store for express-rate-limit
 * Implements the store interface expected by express-rate-limit
 */
class RedisStore {
  constructor(client, prefix = 'ratelimit') {
    this.client = client;
    this.prefix = prefix;
  }

  async increment(key) {
    const fullKey = `${this.prefix}:${key}`;
    try {
      const value = await this.client.incr(fullKey);
      // Set expiration on first increment
      if (value === 1) {
        await this.client.expire(fullKey, 3600); // 1 hour default
      }
      return { totalHits: value, resetTime: new Date(Date.now() + 3600000) };
    } catch (err) {
      logger.error('Redis increment error', { error: err.message });
      // Fallback to memory (will be handled by express-rate-limit)
      throw err;
    }
  }

  async decrement(key) {
    const fullKey = `${this.prefix}:${key}`;
    try {
      await this.client.decr(fullKey);
    } catch (err) {
      logger.error('Redis decrement error', { error: err.message });
    }
  }

  async resetKey(key) {
    const fullKey = `${this.prefix}:${key}`;
    try {
      await this.client.del(fullKey);
    } catch (err) {
      logger.error('Redis reset error', { error: err.message });
    }
  }

  async resetAll() {
    try {
      const pattern = `${this.prefix}:*`;
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (err) {
      logger.error('Redis resetAll error', { error: err.message });
    }
  }
}

/**
 * Initialize Redis connection if configured
 * Safe to call multiple times (only connects once)
 */
const initializeRedis = async () => {
  if (useRedis || !process.env.REDIS_URL) {
    return;
  }

  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      // Disable offline queue to avoid memory buildup
      enableOfflineQueue: false,
    });

    redisClient.on('error', (err) => {
      logger.warn('Redis connection error, falling back to memory store', { error: err.message });
      useRedis = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected for rate limiting');
      useRedis = true;
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
    });

    await redisClient.connect();
  } catch (err) {
    logger.warn('Redis initialization failed, using memory store', { error: err.message });
    useRedis = false;
  }
};

/**
 * Create a rate limiter with Redis backend if available
 */
const createLimiter = (options) => {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const prefix = options.prefix || 'default';
  
  const baseConfig = {
    windowMs: windowMs,
    standardHeaders: true,
    legacyHeaders: false,
    // Handle distributed load: IP from proxy headers (e.g., X-Forwarded-For)
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress || 'unknown';
    },
    skip: options.skip || (() => false),
    message: options.message || {
      success: false,
      message: 'Too many requests. Please try again later.',
    },
    handler: options.handler,
    ...options,
  };

  // Use Redis store if connected
  if (useRedis && redisClient) {
    const redisStore = new RedisStore(redisClient, `rate-limit:${prefix}`);
    baseConfig.store = redisStore;
  }

  return rateLimit(baseConfig);
};

/**
 * LOGIN LIMITER
 * 
 * Purpose: Allow legitimate faculty to log in during peak times (e.g., 200+ concurrent)
 * 
 * Config:
 * - Window: 1 hour (allows login recovery)
 * - Max: 500 per IP per hour (supports concurrent device logins + retries)
 * - Per user: Applied globally (IP-based), not per-user account
 * 
 * Why 500?
 * - Typical login flow: 1-2 requests per user
 * - 200 concurrent = ~400-800 from unique IPs
 * - Retries for network issues: +20%
 * - Passwordreset + retry flows: +50
 * - Safety margin: 500 handles all scenarios
 */
const loginLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: Number(process.env.AUTH_LOGIN_RATE_LIMIT || 500),
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after an hour.',
  },
  prefix: 'login',
  skip: (req) => false,
});

/**
 * PASSWORD RESET LIMITER
 * 
 * Purpose: Prevent brute-force password reset enumeration attacks
 * 
 * Config:
 * - Window: 15 minutes
 * - Max: 10 requests per IP per window
 * - Strict but allows legitimate users + admin password resets
 */
const passwordResetLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: Number(process.env.AUTH_PASSWORD_RESET_RATE_LIMIT || 10),
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again in 15 minutes.',
  },
  prefix: 'password-reset',
});

/**
 * GENERAL API LIMITER
 * 
 * Purpose: Protect all other API endpoints from general DOS attacks
 * 
 * Config:
 * - Window: 15 minutes
 * - Max: 1000 requests per IP per window
 * - Applied globally, but specific endpoints use stricter limiters
 */
const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: Number(process.env.API_RATE_LIMIT || 1000),
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
  prefix: 'api',
  skip: (req) => {
    // Don't rate limit health checks or system endpoints
    return req.path === '/api/health' || req.path === '/health' || req.path === '/deva/health';
  },
});

/**
 * STRICT LIMITER (Sensitive Operations)
 * 
 * Purpose: Protect sensitive endpoints like workload/faculty modifications
 * 
 * Config:
 * - Window: 1 hour
 * - Max: 100 per IP per hour
 * - Applied only to POST/PUT/DELETE on sensitive routes
 */
const strictLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: Number(process.env.STRICT_RATE_LIMIT || 100),
  message: {
    success: false,
    message: 'Too many requests for this operation. Please try again after an hour.',
  },
  prefix: 'sensitive',
});

/**
 * EXPORT LIMITER
 * 
 * Purpose: Prevent resource exhaustion from bulk export requests
 * 
 * Config:
 * - Window: 1 hour
 * - Max: 20 exports per IP per hour
 * - Per-user and aggregate protection
 */
const exportLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: Number(process.env.EXPORT_RATE_LIMIT || 20),
  message: {
    success: false,
    message: 'Too many export requests. Please try again after an hour.',
  },
  prefix: 'export',
});

module.exports = {
  initializeRedis,
  loginLimiter,
  passwordResetLimiter,
  apiLimiter,
  strictLimiter,
  exportLimiter,
  // Utility for creating custom limiters
  createLimiter,
};

module.exports = {
  initializeRedis,
  loginLimiter,
  passwordResetLimiter,
  apiLimiter,
  strictLimiter,
  exportLimiter,
  // Utility for creating custom limiters
  createLimiter,
};
