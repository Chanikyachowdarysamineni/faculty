/**
 * seed.js — Initialize database with sample data
 * 
 * Usage:  npm run seed
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Faculty = require('./models/Faculty');
const Course = require('./models/Course');
const Setting = require('./models/Setting');
const { connect } = require('./db');

const SAMPLE_COURSES = [
  { courseId: 101, program: 'B.Tech', courseType: 'Mandatory', year: 'I', subjectCode: 'CS101', subjectName: 'Programming Fundamentals', shortName: 'PROG', L: 3, T: 1, P: 0, C: 4 },
  { courseId: 102, program: 'B.Tech', courseType: 'Mandatory', year: 'I', subjectCode: 'CS102', subjectName: 'Data Structures', shortName: 'DS', L: 3, T: 1, P: 2, C: 4 },
  { courseId: 103, program: 'B.Tech', courseType: 'Mandatory', year: 'II', subjectCode: 'CS201', subjectName: 'Database Management', shortName: 'DBMS', L: 3, T: 1, P: 0, C: 4 },
  { courseId: 104, program: 'B.Tech', courseType: 'Department Elective', year: 'III', subjectCode: 'CS301', subjectName: 'Artificial Intelligence', shortName: 'AI', L: 3, T: 0, P: 0, C: 3 },
  { courseId: 105, program: 'B.Tech', courseType: 'Department Elective', year: 'III', subjectCode: 'CS302', subjectName: 'Web Technologies', shortName: 'WEB', L: 3, T: 0, P: 2, C: 4 },
];

const SAMPLE_FACULTY = [
  { empId: 'FAC001', name: 'Dr. Ramesh Kumar', email: 'ramesh@college.edu', mobile: '9876543210', designation: 'Associate Professor', department: 'CSE' },
  { empId: 'FAC002', name: 'Prof. Priya Singh', email: 'priya@college.edu', mobile: '9876543211', designation: 'Professor', department: 'CSE' },
  { empId: 'FAC003', name: 'Ms. Anjali Sharma', email: 'anjali@college.edu', mobile: '9876543212', designation: 'Assistant Professor', department: 'CSE' },
  { empId: 'FAC004', name: 'Mr. Vikram Patel', email: 'vikram@college.edu', mobile: '9876543213', designation: 'Lecturer', department: 'CSE' },
];

const DEFAULT_SECTIONS = {
  I: Array.from({ length: 19 }, (_, i) => String(i + 1)),
  II: Array.from({ length: 22 }, (_, i) => String(i + 1)),
  III: Array.from({ length: 19 }, (_, i) => String(i + 1)),
  IV: Array.from({ length: 9 }, (_, i) => String(i + 1)),
  'M.Tech': ['1', '2'],
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seed...\n');

    // Connect to database
    await connect();

    // ── USERS ──────────────────────────────────────────────
    console.log('👤 Creating admin user...');
    const adminExists = await User.findOne({ empId: 'ADMIN001' });
    if (!adminExists) {
      const adminPassword = bcrypt.hashSync('admin123', 10);
      await User.create({
        empId: 'ADMIN001',
        name: 'System Administrator',
        email: 'admin@college.edu',
        designation: 'Administrator',
        passwordHash: adminPassword,
        role: 'admin',
      });
      console.log('✅ Admin user created (empId: ADMIN001, password: admin123)');
    } else {
      console.log('⏭️  Admin user already exists');
    }

    // ── FACULTY USERS ──────────────────────────────────────
    console.log('\n👥 Creating faculty users...');
    for (const fac of SAMPLE_FACULTY) {
      const exists = await User.findOne({ empId: fac.empId });
      if (!exists) {
        const facPassword = bcrypt.hashSync('faculty123', 10);
        await User.create({
          ...fac,
          passwordHash: facPassword,
          role: 'faculty',
        });
        console.log(`✅ Faculty user created: ${fac.empId}`);
      }
    }

    // ── FACULTY RECORDS ────────────────────────────────────
    console.log('\n📚 Creating faculty records...');
    for (const fac of SAMPLE_FACULTY) {
      const exists = await Faculty.findOne({ empId: fac.empId });
      if (!exists) {
        await Faculty.create(fac);
        console.log(`✅ Faculty record created: ${fac.empId}`);
      }
    }

    // ── COURSES ────────────────────────────────────────────
    console.log('\n📖 Creating courses...');
    for (const course of SAMPLE_COURSES) {
      const exists = await Course.findOne({ courseId: course.courseId });
      if (!exists) {
        await Course.create(course);
        console.log(`✅ Course created: ${course.subjectCode}`);
      }
    }

    // ── SETTINGS ───────────────────────────────────────────
    console.log('\n⚙️  Creating settings...');
    const sectionsConfig = await Setting.findOne({ key: 'sections_config' });
    if (!sectionsConfig) {
      await Setting.create({
        key: 'sections_config',
        value: JSON.stringify(DEFAULT_SECTIONS),
      });
      console.log('✅ Sections config created');
    }

    const maxWorkload = await Setting.findOne({ key: 'max_workload_hours' });
    if (!maxWorkload) {
      await Setting.create({
        key: 'max_workload_hours',
        value: '40',
      });
      console.log('✅ Max workload setting created');
    }

    console.log('\n✨ Database seeding completed successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('   Admin - empId: ADMIN001, password: admin123');
    console.log('   Faculty - empId: FAC001, password: faculty123');
    console.log('   Faculty - empId: FAC002, password: faculty123');
    console.log('   (And more...)');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    if (err.stack) console.error(err.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
