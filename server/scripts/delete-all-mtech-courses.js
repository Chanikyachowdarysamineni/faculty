/**
 * Delete All M.Tech Courses from Database
 * Usage: node delete-all-mtech-courses.js
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { connect } = require('../src/db');
const Course = require('../src/models/Course');

(async () => {
  try {
    console.log('🔍 Connecting to database...');
    await connect();
    console.log('✅ Connected to database');

    // Find all M.Tech courses
    const courses = await Course.find({ program: 'M.Tech' }).lean();

    if (courses.length === 0) {
      console.log('ℹ️  No M.Tech courses found to delete.');
      process.exit(0);
    }

    console.log(`\n📋 Found ${courses.length} M.Tech course(s) to delete:`);
    courses.forEach((c, idx) => {
      console.log(`  ${idx + 1}. [${c.subjectCode}] ${c.subjectName} (Year: ${c.year}, ID: ${c.courseId})`);
    });

    // Delete the courses
    const result = await Course.deleteMany({ program: 'M.Tech' });

    console.log(`\n✅ Successfully deleted ${result.deletedCount} M.Tech course(s)!`);
    
    // Verify count
    const totalCourses = await Course.countDocuments();
    console.log(`📊 Total courses remaining: ${totalCourses}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
