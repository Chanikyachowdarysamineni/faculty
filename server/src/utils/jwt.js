/**
 * utils/jwt.js — sign & verify JSON Web Tokens
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const jwt = require('jsonwebtoken');

const validateJwtSecret = () => {
  const secret = String(process.env.JWT_SECRET || '').trim();
  
  if (!secret) {
    throw new Error('❌ JWT_SECRET is required in .env file');
  }
  
  if (secret.length < 64) {
    throw new Error(
      `❌ JWT_SECRET must be at least 64 characters (current: ${secret.length} chars)\n` +
      `Generate a strong secret: openssl rand -base64 64`
    );
  }
  
  // Check for common weak patterns
  const weakPatterns = ['secret', 'password', 'admin', '123', 'test', 'dev', 'example', 'change_me', 'placeholder'];
  const lowerSecret = secret.toLowerCase();
  
  for (const pattern of weakPatterns) {
    if (lowerSecret.includes(pattern)) {
      console.warn(`⚠️  WARNING: JWT_SECRET contains "${pattern}" - consider regenerating with: openssl rand -base64 64`);
      break;
    }
  }
  
  console.log('✅ JWT_SECRET validation passed');
  return secret;
};

const SECRET  = validateJwtSecret();
const EXPIRES = process.env.JWT_EXPIRES_IN || '8h';

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
