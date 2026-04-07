/**
 * utils/jwt.js — sign & verify JSON Web Tokens
 * 
 * ⚠️  AUTHENTICATION DISABLED FOR DEVELOPMENT
 * JWT signing/verification is bypassed. All requests use default dev user.
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const jwt = require('jsonwebtoken');

// ⚠️  JWT authentication is disabled - use dummy secret for compatibility
const SECRET  = process.env.JWT_SECRET || 'dev-secret-disabled-for-testing';
const EXPIRES = process.env.JWT_EXPIRES_IN || '8h';

// Stub validation - no-op
const validateJwtSecret = () => {
  console.log('ℹ️  JWT validation disabled (development mode)');
  return SECRET;
};

/**
 * Create a signed JWT for a user.
 * @param {{ id: string, role: 'admin'|'faculty', name?: string }} payload
 * @returns {string} signed token
 */
const signToken = (payload) =>
  jwt.sign(payload, SECRET, { expiresIn: EXPIRES });

/**
 * Verify and decode a JWT.
 * @param {string} token
 * @returns {object} decoded payload
 * @throws {JsonWebTokenError} if invalid
 */
const verifyToken = (token) =>
  jwt.verify(token, SECRET);

module.exports = { signToken, verifyToken };
