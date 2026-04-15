/**
 * middleware/rateLimiters.js
 * 
 * Rate limiter configuration with Redis backend for production.
 * Falls back to memory-based limiting when Redis is unavailable (development).
 * 
 * DISABLE FOR TESTING:
 * Set environment variable: DISABLE_RATE_LIMIT=true
 * This disables ALL rate limiting for easier development/testing
 * 
 * PRODUCTION CONFIGURATION:
 * Set AUTH_LOGIN_RATE_LIMIT, API_RATE_LIMIT, STRICT_RATE_LIMIT, etc. as needed
 * Each limiter can be independently adjusted via environment variables
 * 
 * REDIS BACKEND:
 * Set REDIS_URL environment variable for distributed rate limiting
 * Example: REDIS_URL=redis://:password@hostname:port
 * This disables ALL rate limiting for easier development/testing
 * 
 * PRODUCTION CONFIGURATION:
 * Set AUTH_LOGIN_RATE_LIMIT, API_RATE_LIMIT, STRICT_RATE_LIMIT, etc. as needed
 * Each limiter can be independently adjusted via environment variables
 * 
 * REDIS BACKEND:
 * Set REDIS_URL environment variable for distributed rate limiting
 * Example: REDIS_URL=redis://:password@hostname:port
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
  
  // Allow disabling rate limiting via environment variable
  const disableLimiting = process.env.DISABLE_RATE_LIMIT === 'true';
  
  // Extract options that shouldn't be passed to rateLimit
  const { skip, message, handler, prefix: _prefix, ...rateLimitOptions } = options;
  
  // If rate limiting is disabled, return a no-op middleware
  if (disableLimiting) {
    return (req, res, next) => next();
  }
  
  const baseConfig = {
    windowMs: windowMs,
    max: rateLimitOptions.max || 100,
    standardHeaders: true,
    legacyHeaders: false,
    // Use default IP detection (handles IPv6 correctly)
    skip: skip || (() => false),
    message: message || {
      success: false,
      message: 'Too many requests. Please try again later.',
    },
    handler: handler,
    ...rateLimitOptions,
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
 * Purpose: Allow legitimate faculty to log in during peak times
 * 
 * Config:
 * - Window: 1 hour
 * - Max: 500 per IP per hour (supports concurrent device logins + retries)
 * - Can be disabled with DISABLE_RATE_LIMIT=true for testing
 * 
 * Why 500?
 * - Typical login flow: 1-2 requests per user
 * - 200+ concurrent users: ~400-800 unique IPs
 * - Retries for network issues: +20%
 * - Safety margin: handles all scenarios
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
 * - Max: 20 requests per IP per window (allows retries)
 * - Can be disabled with DISABLE_RATE_LIMIT=true
 */
const passwordResetLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: Number(process.env.AUTH_PASSWORD_RESET_RATE_LIMIT || 20),
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
 * - Max: 2000 requests per IP per window (very generous for testing)
 * - Applied globally, but specific endpoints use stricter limiters
 * - Skips health checks
 * 
 * Development Note:
 * Disable with: DISABLE_RATE_LIMIT=true
 */
const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: Number(process.env.API_RATE_LIMIT || 2000),
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
 * - Max: 500 per IP per hour (allows ~8 per minute - very generous)
 * - Applied only to POST/PUT/DELETE on sensitive routes
 * - Development: Can be disabled with DISABLE_RATE_LIMIT=true
 */
const strictLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: Number(process.env.STRICT_RATE_LIMIT || 500),
  message: {
    success: false,
    message: 'Too many requests for this operation. Please try again later.',
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
 * - Max: 50 exports per IP per hour (very generous for testing)
 * - Prevents abuse of data export features
 */
const exportLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: Number(process.env.EXPORT_RATE_LIMIT || 50),
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
