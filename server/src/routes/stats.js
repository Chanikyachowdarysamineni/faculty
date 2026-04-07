/**
 * routes/stats.js
 *
 * GET /api/stats — dashboard overview (auth)
 */

'use strict';

const express     = require('express');
const Faculty     = require('../models/Faculty');
const Course      = require('../models/Course');
const Submission  = require('../models/Submission');
const Workload    = require('../models/Workload');
const CourseAllocation = require('../models/CourseAllocation');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/integrity', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [
      facultyRows,
      courseRows,
      workloadRows,
      allocationRows,
      submissionRows,
      duplicateWorkloads,
      duplicateAllocations,
      duplicateFaculty,
      duplicateCourses,
      nullCriticalCounts,
    ] = await Promise.all([
      Faculty.find().select({ empId: 1 }).lean(),
      Course.find().select({ courseId: 1 }).lean(),
      Workload.find().select({ _id: 1, empId: 1, courseId: 1, year: 1, section: 1, subjectCode: 1, subjectName: 1 }).lean(),
      CourseAllocation.find().select({ _id: 1, courseId: 1, year: 1, section: 1, lectureSlot: 1, lectureSlots: 1, tutorialSlots: 1, practicalSlots: 1 }).lean(),
      Submission.find().select({ _id: 1, empId: 1, prefs: 1 }).lean(),
      Workload.aggregate([
        { $group: { _id: { courseId: '$courseId', year: '$year', section: '$section' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } },
      ]),
      CourseAllocation.aggregate([
        { $group: { _id: { courseId: '$courseId', year: '$year', section: '$section' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } },
      ]),
      Faculty.aggregate([
        { $group: { _id: '$empId', count: { $sum: 1 }, ids: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } },
      ]),
      Course.aggregate([
        { $group: { _id: '$subjectCode', count: { $sum: 1 }, ids: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } },
      ]),
      Promise.all([
        Faculty.countDocuments({ $or: [{ empId: null }, { empId: '' }, { name: null }, { name: '' }] }),
        Course.countDocuments({ $or: [{ courseId: null }, { subjectCode: null }, { subjectCode: '' }, { subjectName: null }, { subjectName: '' }] }),
        Workload.countDocuments({ $or: [{ empId: null }, { empId: '' }, { subjectCode: null }, { subjectCode: '' }, { year: null }, { year: '' }, { section: null }, { section: '' }] }),
        Submission.countDocuments({ $or: [{ empId: null }, { empId: '' }] }),
      ]),
    ]);

    const facultySet = new Set(facultyRows.map((row) => row.empId));
    const courseSet = new Set(courseRows.map((row) => Number(row.courseId)));

    const orphanWorkloads = workloadRows.filter((row) => !facultySet.has(row.empId) || !courseSet.has(Number(row.courseId)));

    const orphanAllocationCourses = allocationRows.filter((row) => !courseSet.has(Number(row.courseId)));
    const orphanAllocationFaculty = [];
    allocationRows.forEach((row) => {
      const slots = [
        ...(row.lectureSlot?.empId ? [row.lectureSlot] : []),
        ...(Array.isArray(row.lectureSlots) ? row.lectureSlots : []),
        ...(Array.isArray(row.tutorialSlots) ? row.tutorialSlots : []),
        ...(Array.isArray(row.practicalSlots) ? row.practicalSlots : []),
      ].filter((slot) => slot?.empId);

      const bad = slots.filter((slot) => !facultySet.has(String(slot.empId)));
      if (bad.length) {
        orphanAllocationFaculty.push({
          allocationId: String(row._id),
          courseId: row.courseId,
          year: row.year,
          section: row.section,
          missingEmpIds: Array.from(new Set(bad.map((slot) => String(slot.empId)))),
        });
      }
    });

    const orphanSubmissionRows = [];
    submissionRows.forEach((row) => {
      const missingPrefs = (row.prefs || []).filter((prefId) => !courseSet.has(Number(prefId)));
      const hasFaculty = facultySet.has(row.empId);
      if (!hasFaculty || missingPrefs.length) {
        orphanSubmissionRows.push({
          submissionId: String(row._id),
          empId: row.empId,
          facultyExists: hasFaculty,
          missingPrefs,
        });
      }
    });

    const [nullFaculty, nullCourses, nullWorkloads, nullSubmissions] = nullCriticalCounts;

    res.json({
      success: true,
      data: {
        summary: {
          orphanWorkloads: orphanWorkloads.length,
          orphanAllocationCourses: orphanAllocationCourses.length,
          orphanAllocationFaculty: orphanAllocationFaculty.length,
          orphanSubmissions: orphanSubmissionRows.length,
          duplicateWorkloadKeys: duplicateWorkloads.length,
          duplicateAllocationKeys: duplicateAllocations.length,
          duplicateFacultyEmpId: duplicateFaculty.length,
          duplicateCourseSubjectCode: duplicateCourses.length,
          nullCriticalRecords: nullFaculty + nullCourses + nullWorkloads + nullSubmissions,
        },
        duplicates: {
          workloads: duplicateWorkloads,
          allocations: duplicateAllocations,
          faculty: duplicateFaculty,
          courses: duplicateCourses,
        },
        orphans: {
          workloads: orphanWorkloads,
          allocationCourses: orphanAllocationCourses.map((row) => ({
            allocationId: String(row._id),
            courseId: row.courseId,
            year: row.year,
            section: row.section,
          })),
          allocationFaculty: orphanAllocationFaculty,
          submissions: orphanSubmissionRows,
        },
        nullCritical: {
          faculty: nullFaculty,
          courses: nullCourses,
          workloads: nullWorkloads,
          submissions: nullSubmissions,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [
      totalFaculty,
      totalCourses,
      totalSubmissions,
      totalWorkloads,
      creditAgg,
      facultyByDesignation,
      coursesByProgram,
      coursesByType,
      workloadByFaculty,
    ] = await Promise.all([
      Faculty.countDocuments(),
      Course.countDocuments(),
      Submission.countDocuments(),
      Workload.countDocuments(),
      Course.aggregate([{ $group: { _id: null, total: { $sum: '$C' } } }]),
      Faculty.aggregate([{ $group: { _id: '$designation', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Course.aggregate([{ $group: { _id: '$program', count: { $sum: 1 } } }]),
      Course.aggregate([{ $group: { _id: '$courseType', count: { $sum: 1 } } }]),
      Workload.aggregate([
        {
          $group: {
            _id: '$empId',
            empName:          { $first: '$empName' },
            designation:      { $first: '$designation' },
            coursesAssigned:  { $sum: 1 },
            totalCredits:     { $sum: '$C' },
            totalHours:       { $sum: { $add: ['$manualL', '$manualT', '$manualP'] } },
          },
        },
        { $sort: { totalHours: -1 } },
        { $limit: 20 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        counts: {
          faculty:     totalFaculty,
          courses:     totalCourses,
          credits:     creditAgg[0]?.total || 0,
          workloads:   totalWorkloads,
          submissions: totalSubmissions,
        },
        facultyByDesignation: facultyByDesignation.map(r => ({ designation: r._id, count: r.count })),
        coursesByProgram:     coursesByProgram.map(r => ({ program: r._id, count: r.count })),
        coursesByType:        coursesByType.map(r => ({ courseType: r._id, count: r.count })),
        workloadByFaculty:    workloadByFaculty.map(r => ({
          empId:           r._id,
          empName:         r.empName,
          designation:     r.designation,
          coursesAssigned: r.coursesAssigned,
          totalCredits:    r.totalCredits,
          totalHours:      r.totalHours,
        })),
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;

