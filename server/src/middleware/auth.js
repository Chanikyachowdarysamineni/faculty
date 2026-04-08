/**
 * middleware/auth.js — JWT authentication & role guards
 */

'use strict';

const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Require a valid Bearer token.
 * Attaches `req.user = { id, role, name? }` on success.
 */
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token required.' });
  }

  try {
    req.user = verifyToken(token);
    req.token = token; // Store token for session validation
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

/**
 * Validate that the user's current token is their active session token.
 * Must be used AFTER requireAuth.
 * Prevents using old/invalidated tokens.
 */
const validateActiveSession = async (req, res, next) => {
  try {
    if (!req.user || !req.token) {
      return res.status(401).json({ success: false, message: 'Session validation failed.' });
    }

    const user = await User.findOne({ empId: req.user.id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Check if the provided token matches the active session token
    if (user.activeSessionToken !== req.token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Your session has expired or you have logged in from another device. Please log in again.',
        code: 'SESSION_EXPIRED'
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Session validation error.' });
  }
};

/**
 * Require the authenticated user to have the 'admin' role OR canAccessAdmin flag.
 * Must be used after requireAuth.
 */
const requireAdmin = (req, res, next) => {
  const { role, canAccessAdmin } = req.user || {};
  if (role === 'admin' || canAccessAdmin === true) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Admin access required.' });
};

/**
 * Require the authenticated user to be either an admin (or canAccessAdmin) OR the same faculty
 * member referenced by `req.params.empId`.
 */
const requireSelfOrAdmin = (req, res, next) => {
  const { role, id, canAccessAdmin } = req.user || {};
  if (role === 'admin' || canAccessAdmin === true || id === req.params.empId) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied.' });
};

module.exports = { requireAuth, validateActiveSession, requireAdmin, requireSelfOrAdmin };
