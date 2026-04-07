/**
 * routes/submissions.js
 *
 * GET    /api/submissions              — list all (admin)
 * GET    /api/submissions/by-faculty/:empId — get one (self or admin)
 * POST   /api/submissions              — submit preferences (auth)
 * PUT    /api/submissions/by-faculty/:empId — update preferences (self or admin, form/edit must be open)
 * DELETE /api/submissions/:id          — delete (admin)
 */

'use strict';

const express     = require('express');
const { body, validationResult } = require('express-validator');
const Submission  = require('../models/Submission');
const Course      = require('../models/Course');
const Faculty     = require('../models/Faculty');
const Setting     = require('../models/Setting');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { logAuditEvent } = require('../utils/audit');
const { requireAuth, requireAdmin, requireSelfOrAdmin } = require('../middleware/auth');
const { sendSuccess, sendError, sendValidationError, sendPaginated, sendCreated, sendConflict, sendNotFound, sendForbidden } = require('../utils/response');
const logger = require('../utils/logger');
const { validateSubmissionCreate, validatePagination } = require('../middleware/validators');

const router = express.Router();

const toClient = (doc) => ({
  id:          doc._id?.toString() || '',
  empId:       String(doc.empId || '').trim(),
  empName:     String(doc.empName || '').trim(),
  designation: String(doc.designation || '').trim() || 'N/A',
  mobile:      String(doc.mobile || '').trim() || 'N/A',
  prefs:       Array.isArray(doc.prefs) ? doc.prefs : [],
  submittedAt: doc.createdAt?.toISOString() || null,
  updatedAt:   doc.updatedAt?.toISOString() || null,
});

const validatePrefsAgainstCourses = async (prefs = []) => {
  const ids = Array.from(new Set((prefs || []).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)));
  if (!ids.length) return { ok: false, message: 'At least one valid course ID is required in preferences.' };

  const rows = await Course.find({ courseId: { $in: ids } }).select({ courseId: 1 }).lean();
  const found = new Set(rows.map((row) => Number(row.courseId)));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length) {
    return { ok: false, message: `Invalid course preference ID(s): ${missing.join(', ')}` };
  }
  return { ok: true };
};

// GET /api/submissions  (admin)
router.get('/', requireAuth, requireAdmin, validatePagination, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.search) {
      const q = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ empId: { $regex: q, $options: 'i' } }, { empName: { $regex: q, $options: 'i' } }];
    }
    const [total, docs] = await Promise.all([
      Submission.countDocuments(filter),
      Submission.find(filter)
        .select('empId empName designation mobile prefs createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);
    logger.info('Submissions listed', { userId: req.user.id, filter, total, page, limit });
    sendPaginated(res, docs.map(toClient), { total, page, limit }, 200);
  } catch (err) { 
    logger.error('Error listing submissions', { error: err.message, userId: req.user.id });
    next(err); 
  }
});

// GET /api/submissions/by-faculty/:empId  (self or admin)
router.get('/by-faculty/:empId', requireAuth, requireSelfOrAdmin, async (req, res, next) => {
  try {
    const doc = await Submission.findOne({ empId: req.params.empId }).lean();
    if (!doc) {
      logger.warn('Submission not found', { empId: req.params.empId, userId: req.user.id });
      return sendNotFound(res, 'No submission found for this faculty.');
    }
    logger.info('Submission retrieved', { empId: req.params.empId, userId: req.user.id });
    sendSuccess(res, toClient(doc), 200);
  } catch (err) { 
    logger.error('Error retrieving submission', { error: err.message, empId: req.params.empId, userId: req.user.id });
    next(err); 
  }
});

// PUT /api/submissions/by-faculty/:empId  (self or admin — update preferences)
router.put(
  '/by-faculty/:empId',
  requireAuth, requireSelfOrAdmin,
  [
    body('prefs').isArray({ min: 1, max: 5 }).withMessage('Provide 1–5 course preferences.'),
    body('prefs.*').isInt({ min: 1 }).withMessage('Each preference must be a valid course ID.'),
  ],
  async (req, res, next) => {
    try {
      // Check that editing is allowed
      const editSetting = await Setting.findOne({ key: 'edit_enabled' }).lean();
      const isEditEnabled = editSetting ? editSetting.value === 'true' : true;
      if (!isEditEnabled && req.user.role !== 'admin') {
        logger.warn('Edit disabled attempt', { empId: req.params.empId, userId: req.user.id });
        return sendForbidden(res, 'Editing submissions is currently disabled by the administrator.');
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Submission update validation failed', { empId: req.params.empId, userId: req.user.id, errors: errors.array() });
        return sendValidationError(res, errors.array());
      }

      const { prefs } = req.body;

      if (new Set(prefs).size !== prefs.length) {
        logger.warn('Duplicate preferences in update', { empId: req.params.empId, userId: req.user.id });
        return sendError(res, 'Duplicate course preferences are not allowed.', 400);
      }

      const prefCheck = await validatePrefsAgainstCourses(prefs);
      if (!prefCheck.ok) {
        logger.warn('Invalid course preference in update', { empId: req.params.empId, userId: req.user.id, message: prefCheck.message });
        return sendError(res, prefCheck.message, 400);
      }

      const doc = await Submission.findOneAndUpdate(
        { empId: req.params.empId },
        { prefs },
        { new: true }
      ).lean();
      if (!doc) {
        logger.warn('Submission not found for update', { empId: req.params.empId, userId: req.user.id });
        return sendNotFound(res, 'No submission found to update.');
      }

      await logAuditEvent({ req, action: 'submission.update', entity: 'submission', entityId: String(doc._id), metadata: { empId: doc.empId, prefCount: prefs.length } });
      logger.info('Submission updated', { empId: req.params.empId, prefCount: prefs.length, userId: req.user.id });

      sendSuccess(res, toClient(doc), 200);
    } catch (err) { 
      logger.error('Error updating submission', { error: err.message, empId: req.params.empId, userId: req.user.id });
      next(err); 
    }
  }
);

// POST /api/submissions  (auth)
router.post(
  '/',
  requireAuth,
  validateSubmissionCreate,
  async (req, res, next) => {
    try {
      // Check form open (defaults to open if setting not yet seeded)
      const setting = await Setting.findOne({ key: 'form_enabled' }).lean();
      const isFormOpen = setting ? setting.value === 'true' : true;
      if (!isFormOpen) {
        logger.warn('Submission form not open', { empId: req.body.empId, userId: req.user.id });
        return sendForbidden(res, 'The submission form is currently closed.');
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Submission creation validation failed', { empId: req.body.empId, userId: req.user.id, errors: errors.array() });
        return sendValidationError(res, errors.array());
      }

      const { empId, prefs } = req.body;

      if (new Set(prefs).size !== prefs.length) {
        logger.warn('Duplicate preferences in submission', { empId, userId: req.user.id });
        return sendError(res, 'Duplicate course preferences are not allowed.', 400);
      }

      const prefCheck = await validatePrefsAgainstCourses(prefs);
      if (!prefCheck.ok) {
        logger.warn('Invalid course preference in submission', { empId, userId: req.user.id, message: prefCheck.message });
        return sendError(res, prefCheck.message, 400);
      }

      // Look up faculty — fall back to request body if not seeded in DB
      const member = await Faculty.findOne({ empId: empId.trim() }).lean();
      const empName     = member?.name        ?? (req.body.empName     || empId);
      const designation = member?.designation ?? (req.body.designation || '');
      const mobile      = member?.mobile      ?? (req.body.mobile      || '');

      const existing = await Submission.findOne({ empId: empId.trim() });
      if (existing) {
        logger.warn('Duplicate submission attempt', { empId, userId: req.user.id });
        return sendConflict(res, 'This faculty already submitted preferences.');
      }

      const doc = await Submission.create({
        empId:       empId.trim(),
        empName,
        designation,
        mobile,
        prefs,
      });

      await logAuditEvent({ req, action: 'submission.create', entity: 'submission', entityId: String(doc._id), metadata: { empId: doc.empId, prefCount: prefs.length } });
      logger.info('Submission created', { empId: doc.empId, prefCount: prefs.length, userId: req.user.id });

      sendCreated(res, toClient(doc));
    } catch (err) { 
      logger.error('Error creating submission', { error: err.message, empId: req.body.empId, userId: req.user.id });
      next(err); 
    }
  }
);

// DELETE /api/submissions/:id  (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const doc = await Submission.findByIdAndDelete(req.params.id);
    if (!doc) {
      logger.warn('Submission not found for deletion', { id: req.params.id, userId: req.user.id });
      return sendNotFound(res, 'Submission not found.');
    }
    await logAuditEvent({ req, action: 'submission.delete', entity: 'submission', entityId: String(req.params.id), metadata: { empId: doc.empId } });
    logger.info('Submission deleted', { id: req.params.id, empId: doc.empId, userId: req.user.id });
    sendSuccess(res, { message: 'Submission deleted.' }, 200);
  } catch (err) { 
    logger.error('Error deleting submission', { error: err.message, id: req.params.id, userId: req.user.id });
    next(err); 
  }
});

module.exports = router;

