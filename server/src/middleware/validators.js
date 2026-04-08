'use strict';

const { body, validationResult, param, query } = require('express-validator');

/**
 * Validation middleware error handler
 * Use this after validation chains to return errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
        .array()
        .map((err) => ({
          field: err.param,
          value: err.value,
          message: err.msg,
        })),
    });
  }
  next();
};

/**
 * ═══════════════════════════════════════════════════════════
 * WORKLOAD VALIDATORS
 * ═══════════════════════════════════════════════════════════
 */

const validateWorkloadCreate = [
  body('empId')
    .trim()
    .notEmpty()
    .withMessage('Employee ID is required')
    .isLength({ min: 2, max: 10 })
    .withMessage('Employee ID must be 2-10 characters'),

  body('courseId')
    .isInt({ min: 1 })
    .withMessage('Valid course ID is required'),

  body('year')
    .trim()
    .isIn(['I', 'II', 'III', 'IV', 'M.Tech'])
    .withMessage('Invalid year. Must be I, II, III, IV, or M.Tech'),

  body('section')
    .trim()
    .notEmpty()
    .withMessage('Section is required'),

  body('fixedL')
    .isInt({ min: 0, max: 10 })
    .withMessage('Lecture hours (L) must be 0-10'),

  body('fixedT')
    .isInt({ min: 0, max: 10 })
    .withMessage('Tutorial hours (T) must be 0-10'),

  body('fixedP')
    .isInt({ min: 0, max: 10 })
    .withMessage('Practical hours (P) must be 0-10'),

  body('C')
    .isInt({ min: 0, max: 5 })
    .withMessage('Credits must be 0-5'),

  handleValidationErrors,
];

const validateWorkloadUpdate = [
  param('id')
    .isMongoId()
    .withMessage('Invalid workload ID'),

  ...validateWorkloadCreate,
];

const validateWorkloadDelete = [
  param('id')
    .isMongoId()
    .withMessage('Invalid workload ID'),

  handleValidationErrors,
];

/**
 * ═══════════════════════════════════════════════════════════
 * FACULTY VALIDATORS
 * ═══════════════════════════════════════════════════════════
 */

const validateFacultyCreate = [
  body('empId')
    .trim()
    .notEmpty()
    .withMessage('Employee ID is required')
    .matches(/^[A-Z0-9]{3,10}$/)
    .withMessage('Employee ID must be 3-10 alphanumeric characters (uppercase)'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email address is required'),

  body('mobile')
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be exactly 10 digits'),

  body('designation')
    .trim()
    .notEmpty()
    .withMessage('Designation is required'),

  handleValidationErrors,
];

const validateFacultyUpdate = [
  // Only validate body fields, not the URL parameter
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .if((value) => value && String(value).trim() !== '')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),

  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .if((value) => value && String(value).trim() !== '')
    .isEmail()
    .withMessage('Valid email address is required'),

  body('mobile')
    .optional({ checkFalsy: true })
    .trim()
    .if((value) => value && String(value).trim() !== '')
    .matches(/^[0-9\s\-\+\(\)]{7,15}$/)
    .withMessage('Mobile number must be 7-15 characters (digits, spaces, hyphens, plus, parentheses)'),

  body('designation')
    .optional({ checkFalsy: true })
    .trim()
    .if((value) => value && String(value).trim() !== '')
    .isLength({ min: 2, max: 100 })
    .withMessage('Designation must be 2-100 characters'),

  body('department')
    .optional({ checkFalsy: true })
    .trim(),

  body('slNo')
    .optional({ checkFalsy: true })
    .if((value) => value !== undefined && value !== null && value !== '')
    .isInt({ min: 1 })
    .withMessage('Serial number must be a positive integer'),

  handleValidationErrors,
];

/**
 * ═══════════════════════════════════════════════════════════
 * COURSE VALIDATORS
 * ═══════════════════════════════════════════════════════════
 */

const validateCourseCreate = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Course code is required')
    .isLength({ min: 2, max: 20 })
    .withMessage('Course code must be 2-20 characters'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Course name is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Course name must be 3-200 characters'),

  body('credits')
    .isInt({ min: 0, max: 5 })
    .withMessage('Credits must be 0-5'),

  handleValidationErrors,
];

/**
 * ═══════════════════════════════════════════════════════════
 * PAGINATION VALIDATORS
 * ═══════════════════════════════════════════════════════════
 */

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be >= 1')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be 1-1000')
    .toInt(),

  handleValidationErrors,
];

/**
 * ═══════════════════════════════════════════════════════════
 * SEARCH VALIDATORS
 * ═══════════════════════════════════════════════════════════
 */

const validateSearch = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be 2-100 characters'),

  handleValidationErrors,
];

/**
 * ═══════════════════════════════════════════════════════════
 * SUBMISSION VALIDATORS
 * ═══════════════════════════════════════════════════════════
 */

const validateSubmissionCreate = [
  body('empId')
    .trim()
    .notEmpty()
    .withMessage('Employee ID is required'),

  body('prefs')
    .custom((value) => {
      if (!Array.isArray(value)) {
        throw new Error('Preferences must be an array');
      }
      if (value.length === 0) {
        throw new Error('At least one course must be selected');
      }
      for (const item of value) {
        const num = Number(item);
        if (!Number.isInteger(num) || num < 1) {
          throw new Error('Each course ID must be a valid number');
        }
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * ═══════════════════════════════════════════════════════════
 * AUTHENTICATION VALIDATORS
 * ═══════════════════════════════════════════════════════════
 */

const validateLogin = [
  body('employeeId')
    .trim()
    .notEmpty()
    .withMessage('Employee ID is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors,
];

const validatePasswordReset = [
  body('token')
    .trim()
    .isLength({ min: 32 })
    .withMessage('Valid reset token is required'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),

  handleValidationErrors,
];

const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  // Workload validators
  validateWorkloadCreate,
  validateWorkloadUpdate,
  validateWorkloadDelete,
  // Faculty validators
  validateFacultyCreate,
  validateFacultyUpdate,
  // Course validators
  validateCourseCreate,
  // Pagination
  validatePagination,
  // Search
  validateSearch,
  // Submissions
  validateSubmissionCreate,
  // Authentication
  validateLogin,
  validatePasswordReset,
  validateChangePassword,
};
