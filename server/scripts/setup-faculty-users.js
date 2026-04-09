/**
 * Setup Faculty Users - Create user accounts with mobile as password (OPTIMIZED)
 * 
 * This script:
 * 1. Gets all faculty members
 * 2. Hashes their mobile number as password using bcryptjs
 * 3. Updates Faculty collection with hashed passwords (batch)
 * 4. Creates/updates User records for each faculty (batch)
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { connect } = require('../src/db');
const Faculty = require('../src/models/Faculty');
const User = require('../src/models/User');

const hashPassword = (plaintext) => {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plaintext, salt);
};

const setupFacultyUsers = async () => {
  try {
    await connect();
    console.log('✅ Connected to MongoDB\n');

    // Get all faculty
    const faculty = await Faculty.find().select('_id empId name designation mobile email');
    console.log(`📋 Found ${faculty.length} faculty members\n`);

    if (faculty.length === 0) {
      console.log('❌ No faculty records found');
      process.exit(1);
    }

    console.log('🔐 Hashing passwords and preparing data...');
    
    // Prepare data for batch update
    const facultyUpdateOps = [];
    const userUpsertOps = [];

    faculty.forEach(fac => {
      const mobile = fac.mobile || 'defaultpass';
      const passwordHash = hashPassword(mobile);

      // Faculty update operation
      facultyUpdateOps.push({
        updateOne: {
          filter: { _id: fac._id },
          update: { $set: { passwordHash } }
        }
      });

      // User upsert operation
      userUpsertOps.push({
        updateOne: {
          filter: { empId: fac.empId },
          update: {
            $set: {
              empId: fac.empId,
              name: fac.name,
              designation: fac.designation,
              mobile: fac.mobile,
              email: fac.email,
              passwordHash,
              role: 'faculty',
              canAccessAdmin: false
            }
          },
          upsert: true
        }
      });
    });

    // Execute batch updates
    console.log('\n💾 Updating Faculty collection...');
    if (facultyUpdateOps.length > 0) {
      await Faculty.bulkWrite(facultyUpdateOps);
      console.log(`✅ Updated ${facultyUpdateOps.length} faculty with passwords`);
    }

    console.log('💾 Creating/Updating User records...');
    if (userUpsertOps.length > 0) {
      await User.bulkWrite(userUpsertOps);
      console.log(`✅ Created/Updated ${userUpsertOps.length} user accounts`);
    }

    // Show sample results
    console.log('\n📊 Sample Faculty (First 15):\n');
    faculty.slice(0, 15).forEach((fac, i) => {
      console.log(`  ${i + 1}. ${fac.empId} - ${fac.name}`);
      console.log(`     └─ Password: ${fac.mobile || 'N/A'} (will be hashed)`);
    });

    if (faculty.length > 15) {
      console.log(`\n  ... and ${faculty.length - 15} more faculty members`);
    }

    // Verify
    const facultyWithPassword = await Faculty.countDocuments({ passwordHash: { $exists: true, $ne: null } });
    const userCount = await User.countDocuments();
    const facCount = await Faculty.countDocuments();

    console.log(`\n✅ Verification Complete:`);
    console.log(`  Faculty total: ${facCount}`);
    console.log(`  Faculty with password: ${facultyWithPassword}`);
    console.log(`  User accounts: ${userCount}`);

    if (facultyWithPassword === facCount && userCount === facCount) {
      console.log('\n🎉 All faculty users setup successfully!');
    }

    console.log(`\n📝 Login Instructions for Faculty:`);
    console.log(`  URL: http://localhost:3002/csefaculty`);
    console.log(`  Username: Employee ID (e.g., 163, F001, etc.)`);
    console.log(`  Password: Mobile number (e.g., 9490647678)`);
    console.log(`\n💡 After first login, faculty can change password in Profile → Change Password`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
};

setupFacultyUsers();
