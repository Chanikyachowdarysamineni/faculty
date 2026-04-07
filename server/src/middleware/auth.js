/**
 * middleware/auth.js — JWT authentication & role guards
 */

'use strict';

const { verifyToken } = require('../utils/jwt');

/**
 * Require a valid Bearer token.
 * Attaches `req.user = { id, role, name? }` on success.
 * 
 * TEMPORARILY DISABLED: Auth is bypassed for development.
 * All requests treated as admin user.
 */
const requireAuth = (req, res, next) => {
  // BYPASS: No token required - all requests treated as admin for testing
  req.user = {
    id: 'admin',
    role: 'admin',
    name: 'Development User',
    canAccessAdmin: true,
  };
  next();
};

// Backup: Original token-based auth (commented out)
/*
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token required.' });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};
*/

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

module.exports = { requireAuth, requireAdmin, requireSelfOrAdmin };
