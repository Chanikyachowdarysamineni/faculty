/**
 * Delete M.Tech 4 Courses from Database
 * Removes all courses where program='M.Tech' and year='IV'
 * Usage: node delete-mtech4-courses.js
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { connect } = require('../src/db');
const Course = require('../src/models/Course');

const deleteMTech4Courses = async () => {
  try {
    console.log('🔍 Connecting to database...');
    await connect();
    console.log('✅ Connected to database');

    // Find all M.Tech IV courses
    const courses = await Course.find({ 
      program: 'M.Tech', 
      year: 'IV' 
    }).lean();

    if (courses.length === 0) {
      console.log('ℹ️  No M.Tech IV courses found to delete.');
      process.exit(0);
    }

    console.log(`\n📋 Found ${courses.length} M.Tech IV course(s) to delete:`);
    courses.forEach((c, idx) => {
      console.log(`  ${idx + 1}. [${c.subjectCode}] ${c.subjectName} (ID: ${c.courseId})`);
    });

    // Delete the courses
    const result = await Course.deleteMany({ 
      program: 'M.Tech', 
      year: 'IV' 
    });

    console.log(`\n✅ Successfully deleted ${result.deletedCount} M.Tech IV course(s)!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error deleting M.Tech IV courses:', err.message);
    process.exit(1);
  }
};

deleteMTech4Courses();
