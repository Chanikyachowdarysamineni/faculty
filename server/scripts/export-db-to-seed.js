/**
 * export-db-to-seed.js — Export existing database to production seed file
 * 
 * This script connects to your existing MongoDB and exports collections
 * to create a production-ready seed file with your actual data.
 * 
 * Usage:
 *   npx ts-node server/scripts/export-db-to-seed.js [--output path/to/seed-file.js]
 *   npm run export:seed
 * 
 * What it does:
 *   1. Connects to MongoDB (uses MONGO_URI from .env)
 *   2. Exports users, faculty, courses, workloads, settings, etc.
 *   3. Generates seed-production-import.js with your actual data
 *   4. Creates formatted seed file ready for npm run seed:prod
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Models
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Course = require('../models/Course');
const Workload = require('../models/Workload');
const Submission = require('../models/Submission');
const CourseAllocation = require('../models/CourseAllocation');
const Setting = require('../models/Setting');
const AuditLog = require('../models/AuditLog');
const { connect } = require('../db');

// ────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────

const OUTPUT_FILE = process.argv[3] || 
  path.join(__dirname, '..', 'seed-production-import.js');

const COLLECTIONS_TO_EXPORT = [
  { name: 'users', model: User, maxRecords: null },
  { name: 'faculty', model: Faculty, maxRecords: null },
  { name: 'courses', model: Course, maxRecords: null },
  { name: 'workloads', model: Workload, maxRecords: null },
  { name: 'submissions', model: Submission, maxRecords: 100 }, // Limit to recent
  { name: 'courseAllocations', model: CourseAllocation, maxRecords: null },
  { name: 'settings', model: Setting, maxRecords: null },
  { name: 'auditLogs', model: AuditLog, maxRecords: 500 }, // Limit to recent logs
];

// ────────────────────────────────────────────────────────────
// Export Function
// ────────────────────────────────────────────────────────────

const exportDatabaseToSeed = async () => {
  try {
    console.log('📤 Database Export Tool');
    console.log('═'.repeat(60));
    console.log(`\n🔗 Connecting to MongoDB...\n`);

    await connect();
    console.log('✅ Connected to MongoDB\n');

    const exportedData = {};
    let totalRecords = 0;

    // ── Export each collection ──────────────────────────────
    for (const collection of COLLECTIONS_TO_EXPORT) {
      try {
        console.log(`📦 Exporting ${collection.name}...`);

        let query = collection.model.find().lean();
        if (collection.maxRecords) {
          query = query.sort({ createdAt: -1 }).limit(collection.maxRecords);
        }

        const records = await query.exec();
        exportedData[collection.name] = records;
        totalRecords += records.length;

        console.log(`   ✅ ${records.length} records exported\n`);
      } catch (err) {
        console.log(`   ⚠️  Skipped (might not exist): ${err.message}\n`);
        exportedData[collection.name] = [];
      }
    }

    // ── Generate seed file ─────────────────────────────────
    console.log('📝 Generating seed file...\n');
    const seedContent = generateSeedFile(exportedData);

    // ── Write to file ──────────────────────────────────────
    fs.writeFileSync(OUTPUT_FILE, seedContent);
    console.log(`✅ Seed file created: ${OUTPUT_FILE}\n`);

    // ── Summary ────────────────────────────────────────────
    console.log('═'.repeat(60));
    console.log('📊 Export Summary:');
    console.log('═'.repeat(60));
    console.log(`Total Records Exported: ${totalRecords}\n`);
    console.log('Export Details:');
    for (const [name, records] of Object.entries(exportedData)) {
      console.log(`  • ${name}: ${records.length} records`);
    }
    console.log(`\n📁 Output: ${OUTPUT_FILE}`);
    console.log('\n🚀 Next Steps:');
    console.log('   1. Review the exported seed file');
    console.log('   2. Test it: npm run seed:prod');
    console.log('   3. Deploy to production\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Export failed:');
    console.error(error.message);
    console.error(error);
    process.exit(1);
  }
};

// ────────────────────────────────────────────────────────────
// Seed File Generator
// ────────────────────────────────────────────────────────────

const generateSeedFile = (data) => {
  // Sanitize data for safe JSON stringification
  const sanitized = JSON.parse(JSON.stringify(data, (key, value) => {
    // Remove sensitive fields
    if (key === 'passwordHash' || key === '__v' || key === 'createdAt' || key === 'updatedAt') {
      return undefined;
    }
    return value;
  }));

  return `/**
 * seed-production-import.js — Production seed data (exported from existing database)
 * 
 * This file was auto-generated from your existing database.
 * It contains all your current collections, ready for production deployment.
 * 
 * Usage:  npm run seed:prod:import
 * 
 * WARNING: This file contains your actual data. Handle with care!
 *          - Do not commit sensitive information to version control
 *          - Use environment variables for MongoDB credentials
 *          - Change passwords after first login
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const User = require('./models/User');
const Faculty = require('./models/Faculty');
const Course = require('./models/Course');
const Workload = require('./models/Workload');
const Submission = require('./models/Submission');
const CourseAllocation = require('./models/CourseAllocation');
const Setting = require('./models/Setting');
const AuditLog = require('./models/AuditLog');
const { connect } = require('./db');

// ────────────────────────────────────────────────────────────
// Exported Data from Existing Database
// ────────────────────────────────────────────────────────────

const EXPORTED_USERS = ${JSON.stringify(sanitized.users, null, 2)};

const EXPORTED_FACULTY = ${JSON.stringify(sanitized.faculty, null, 2)};

const EXPORTED_COURSES = ${JSON.stringify(sanitized.courses, null, 2)};

const EXPORTED_WORKLOADS = ${JSON.stringify(sanitized.workloads, null, 2)};

const EXPORTED_SUBMISSIONS = ${JSON.stringify(sanitized.submissions, null, 2)};

const EXPORTED_ALLOCATIONS = ${JSON.stringify(sanitized.courseAllocations, null, 2)};

const EXPORTED_SETTINGS = ${JSON.stringify(sanitized.settings, null, 2)};

const EXPORTED_AUDIT_LOGS = ${JSON.stringify(sanitized.auditLogs.slice(0, 50), null, 2)};

// ────────────────────────────────────────────────────────────
// Seed Function
// ────────────────────────────────────────────────────────────

const seedDatabase = async () => {
  try {
    console.log('🌱 Importing production data from exported collections...\\n');

    // Connect to database
    await connect();
    console.log('✅ Connected to MongoDB\\n');

    // ── USERS ──────────────────────────────────────────────
    console.log('👤 Importing users...');
    let usersCreated = 0;
    for (const user of EXPORTED_USERS) {
      const exists = await User.findOne({ empId: user.empId });
      if (!exists) {
        // Ensure password is hashed
        const passwordHash = user.passwordHash || bcrypt.hashSync('password123', 10);
        await User.create({
          ...user,
          passwordHash
        });
        usersCreated++;
      }
    }
    if (usersCreated > 0) {
      console.log(\`   ✅ \${usersCreated} users imported\\n\`);
    } else {
      console.log('   ⏭️  All users already exist\\n');
    }

    // ── FACULTY ────────────────────────────────────────────
    console.log('👥 Importing faculty...');
    let facultyCreated = 0;
    for (const fac of EXPORTED_FACULTY) {
      const exists = await Faculty.findOne({ empId: fac.empId });
      if (!exists) {
        await Faculty.create(fac);
        facultyCreated++;
      }
    }
    if (facultyCreated > 0) {
      console.log(\`   ✅ \${facultyCreated} faculty records imported\\n\`);
    } else {
      console.log('   ⏭️  Faculty records already exist\\n');
    }

    // ── COURSES ────────────────────────────────────────────
    console.log('📖 Importing courses...');
    let coursesCreated = 0;
    for (const course of EXPORTED_COURSES) {
      const exists = await Course.findOne({ courseId: course.courseId });
      if (!exists) {
        await Course.create(course);
        coursesCreated++;
      }
    }
    if (coursesCreated > 0) {
      console.log(\`   ✅ \${coursesCreated} courses imported\\n\`);
    } else {
      console.log('   ⏭️  Courses already exist\\n');
    }

    // ── WORKLOADS ──────────────────────────────────────────
    console.log('💼 Importing workloads...');
    let workloadsCreated = 0;
    for (const workload of EXPORTED_WORKLOADS) {
      const exists = await Workload.findOne({
        empId: workload.empId,
        academicYearStart: workload.academicYearStart,
        semester: workload.semester
      });
      if (!exists) {
        await Workload.create(workload);
        workloadsCreated++;
      }
    }
    if (workloadsCreated > 0) {
      console.log(\`   ✅ \${workloadsCreated} workloads imported\\n\`);
    } else {
      console.log('   ⏭️  Workloads already exist\\n');
    }

    // ── SETTINGS ───────────────────────────────────────────
    console.log('⚙️  Importing settings...');
    let settingsCreated = 0;
    for (const setting of EXPORTED_SETTINGS) {
      const exists = await Setting.findOne({ key: setting.key });
      if (!exists) {
        await Setting.create(setting);
        settingsCreated++;
      }
    }
    if (settingsCreated > 0) {
      console.log(\`   ✅ \${settingsCreated} settings imported\\n\`);
    } else {
      console.log('   ⏭️  Settings already exist\\n');
    }

    // ── ALLOCATIONS ────────────────────────────────────────
    if (EXPORTED_ALLOCATIONS && EXPORTED_ALLOCATIONS.length > 0) {
      console.log('📋 Importing allocations...');
      let allocationsCreated = 0;
      for (const allocation of EXPORTED_ALLOCATIONS) {
        const exists = await CourseAllocation.findOne({ _id: allocation._id });
        if (!exists) {
          await CourseAllocation.create(allocation);
          allocationsCreated++;
        }
      }
      if (allocationsCreated > 0) {
        console.log(\`   ✅ \${allocationsCreated} allocations imported\\n\`);
      }
    }

    // ── SUCCESS MESSAGE ────────────────────────────────────
    console.log('═'.repeat(60));
    console.log('🎉 Production data import completed!');
    console.log('═'.repeat(60));
    console.log('\\n📊 Import Summary:');
    console.log(\`   - Users: \${EXPORTED_USERS.length}\`);
    console.log(\`   - Faculty: \${EXPORTED_FACULTY.length}\`);
    console.log(\`   - Courses: \${EXPORTED_COURSES.length}\`);
    console.log(\`   - Workloads: \${EXPORTED_WORKLOADS.length}\`);
    console.log(\`   - Settings: \${EXPORTED_SETTINGS.length}\`);
    console.log(\`   - Allocations: \${EXPORTED_ALLOCATIONS.length}\`);
    console.log('\\n🚀 Production ready for deployment!\\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// Run seed
seedDatabase();
`;
};

// ────────────────────────────────────────────────────────────
// Run Export
// ────────────────────────────────────────────────────────────

exportDatabaseToSeed();
