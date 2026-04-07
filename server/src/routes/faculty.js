/**
 * routes/faculty.js
 *
 * GET    /api/faculty          — list all faculty
 * GET    /api/faculty/:empId   — get one
 * POST   /api/faculty          — add (admin)
 * PUT    /api/faculty/:empId   — update (admin)
 * DELETE /api/faculty/:empId   — delete (admin)
 */

'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const Faculty  = require('../models/Faculty');
const Workload = require('../models/Workload');
const CourseAllocation = require('../models/CourseAllocation');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { nextSequence } = require('../utils/counters');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { logAuditEvent } = require('../utils/audit');
const { requireAuth, requireAdmin, requireSelfOrAdmin } = require('../middleware/auth');
const { sendSuccess, sendError, sendValidationError, sendPaginated, sendCreated, sendConflict, sendNotFound } = require('../utils/response');
const logger = require('../utils/logger');
const { validateFacultyCreate, validateFacultyUpdate, validatePagination } = require('../middleware/validators');

const router = express.Router();

const toClient = (doc) => ({
  id:          doc._id?.toString() || '',
  empId:       String(doc.empId || '').trim(),
  name:        String(doc.name || '').trim(),
  email:       String(doc.email || '').trim(),
  mobile:      String(doc.mobile || '').trim() || 'N/A',
  designation: String(doc.designation || '').trim() || 'N/A',
  department:  String(doc.department || '').trim() || 'CSE',
  createdAt:   doc.createdAt?.toISOString() || null,
  updatedAt:   doc.updatedAt?.toISOString() || null,
});

// GET /api/faculty
router.get('/', requireAuth, validatePagination, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.search) {
      const q = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { empId: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
        { designation: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } },
      ];
    }
    const [total, docs] = await Promise.all([
      Faculty.countDocuments(filter),
      Faculty.find(filter)
        .select('empId name email mobile designation department createdAt updatedAt')
        .sort({ empId: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);
    logger.info('Faculty listed', { userId: req.user.id, filter, total, page, limit });
    sendPaginated(res, docs.map(toClient), { total, page, limit }, 200);
  } catch (err) { 
    logger.error('Error listing faculty', { error: err.message, userId: req.user.id });
    next(err); 
  }
});

// GET /api/faculty/:empId
router.get('/:empId', requireAuth, async (req, res, next) => {
  try {
    const doc = await Faculty.findOne({ empId: req.params.empId }).lean();
    if (!doc) {
      logger.warn('Faculty member not found', { empId: req.params.empId, userId: req.user.id });
      return sendNotFound(res, 'Faculty member not found.');
    }
    logger.info('Faculty retrieved', { empId: req.params.empId, userId: req.user.id });
    sendSuccess(res, toClient(doc), 200);
  } catch (err) { 
    logger.error('Error retrieving faculty', { error: err.message, empId: req.params.empId, userId: req.user.id });
    next(err); 
  }
});

// POST /api/faculty  (admin)
router.post(
  '/',
  requireAuth, requireAdmin,
  validateFacultyCreate,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Faculty creation validation failed', { userId: req.user.id, errors: errors.array() });
        return sendValidationError(res, errors.array());
      }

      const { empId, name, department = 'CSE', designation, mobile = '', email = '' } = req.body;

      const existing = await Faculty.findOne({ empId: empId.trim() });
      if (existing) {
        logger.warn('Faculty with duplicate empId attempted', { empId, userId: req.user.id });
        return sendConflict(res, 'Employee ID already exists.');
      }

      const maxDoc = await Faculty.findOne().sort({ slNo: -1 }).lean();
      const slNo   = await nextSequence('faculty_slno', Number(maxDoc?.slNo || 0));

      const doc = await Faculty.create({
        slNo,
        empId: empId.trim(),
        name: name.trim(),
        department: String(department || 'CSE').trim() || 'CSE',
        designation: designation.trim(),
        mobile,
        email,
      });
      await logAuditEvent({ req, action: 'faculty.create', entity: 'faculty', entityId: doc.empId });
      logger.info('Faculty created', { empId: doc.empId, name: doc.name, userId: req.user.id });
      sendCreated(res, toClient(doc));
    } catch (err) { 
      logger.error('Error creating faculty', { error: err.message, userId: req.user.id });
      next(err); 
    }
  }
);

// PUT /api/faculty/:empId  (admin or self)
router.put(
  '/:empId',
  requireAuth, requireSelfOrAdmin,
  validateFacultyUpdate,
  async (req, res, next) => {
    try {
      // Validate empId parameter
      const empId = String(req.params.empId || '').trim();
      if (!empId) {
        logger.warn('Faculty update - invalid empId parameter', { empId: req.params.empId, userId: req.user.id });
        return sendError(res, 'Invalid Employee ID', 400);
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Faculty update validation failed', { empId, userId: req.user.id, errors: errors.array(), body: req.body });
        return sendValidationError(res, errors.array());
      }

      const { name, department, designation, mobile, email, slNo } = req.body;
      const isAdmin = req.user.role === 'admin' || req.user.canAccessAdmin === true;
      const isSelf = String(req.user.id) === String(empId);
      
      logger.debug('Faculty update request received', { empId, userId: req.user.id, bodyKeys: Object.keys(req.body), isAdmin, isSelf });

      const allowedUpdates = {};
      
      // Both admin and self can update: name, designation, mobile, email
      if (name !== undefined && String(name).trim()) {
        allowedUpdates.name = String(name).trim();
        logger.debug('Setting name', { value: allowedUpdates.name });
      }
      if (designation !== undefined && String(designation).trim()) {
        allowedUpdates.designation = String(designation).trim();
        logger.debug('Setting designation', { value: allowedUpdates.designation });
      }
      if (mobile !== undefined) {
        allowedUpdates.mobile = String(mobile).trim();
        logger.debug('Setting mobile', { value: allowedUpdates.mobile });
      }
      if (email !== undefined && String(email).trim()) {
        allowedUpdates.email = String(email).trim();
        logger.debug('Setting email', { value: allowedUpdates.email });
      }
      
      // Only admin can update: department, slNo
      if (isAdmin) {
        if (department !== undefined && String(department).trim()) {
          allowedUpdates.department = String(department).trim();
          logger.debug('Setting department', { value: allowedUpdates.department });
        }
        if (slNo !== undefined) {
          allowedUpdates.slNo = Number(slNo);
          logger.debug('Setting slNo', { value: allowedUpdates.slNo });
        }
      }

      // Always update the timestamp
      allowedUpdates.updatedAt = new Date();

      logger.info('Faculty update - preparing database update', { empId, userId: req.user.id, updates: allowedUpdates });

      const doc = await Faculty.findOneAndUpdate(
        { empId },
        { $set: allowedUpdates },
        { new: true, runValidators: true }
      ).lean();

      if (!doc) {
        logger.warn('Faculty member not found for update', { empId, userId: req.user.id });
        return sendNotFound(res, 'Faculty member not found.');
      }

      await logAuditEvent({ req, action: 'faculty.update', entity: 'faculty', entityId: empId, metadata: { fields: Object.keys(allowedUpdates), isSelfEdit: isSelf } });
      logger.info('Faculty updated successfully', { empId, fields: Object.keys(allowedUpdates), userId: req.user.id, isSelfEdit: isSelf });
      sendSuccess(res, toClient(doc), 200);
    } catch (err) { 
      logger.error('Error updating faculty', { error: err.message, stack: err.stack, empId: req.params.empId, userId: req.user.id });
      next(err); 
    }
  }
);

// DELETE /api/faculty/:empId  (admin)
router.delete('/:empId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const empId = String(req.params.empId || '').trim();

    const inWorkload = await Workload.exists({ empId });
    const inSubmission = await Submission.exists({ empId });
    const inUser = await User.exists({ empId });
    const inAllocation = await CourseAllocation.exists({
      $or: [
        { 'lectureSlot.empId': empId },
        { lectureSlots: { $elemMatch: { empId } } },
        { tutorialSlots: { $elemMatch: { empId } } },
        { practicalSlots: { $elemMatch: { empId } } },
      ],
    });

    if (inWorkload || inSubmission || inUser || inAllocation) {
      logger.warn('Attempt to delete faculty with related records', { empId, userId: req.user.id, hasWorkload: inWorkload, hasSubmission: inSubmission, hasUser: inUser, hasAllocation: inAllocation });
      return sendConflict(res, 'Cannot delete faculty. Existing related records found (workload/allocation/submission/user).');
    }

    const doc = await Faculty.findOneAndDelete({ empId });
    if (!doc) {
      logger.warn('Faculty member not found for deletion', { empId, userId: req.user.id });
      return sendNotFound(res, 'Faculty member not found.');
    }
    await logAuditEvent({ req, action: 'faculty.delete', entity: 'faculty', entityId: empId });
    logger.info('Faculty deleted', { empId, name: doc.name, userId: req.user.id });
    sendSuccess(res, { message: 'Faculty member deleted.' }, 200);
  } catch (err) { 
    logger.error('Error deleting faculty', { error: err.message, empId: req.params.empId, userId: req.user.id });
    next(err); 
  }
});

module.exports = router;

