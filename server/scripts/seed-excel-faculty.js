/**
 * seed-excel-faculty.js
 * 
 * Import faculty data from Excel (FL-1.xlsx):
 * 1. Clear existing Faculty and User data
 * 2. Parse Excel file to extract faculty details
 * 3. Seed Faculty collection
 * 4. Create corresponding User accounts with mobile-based passwords
 */

// Load environment variables FIRST
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Database connection - from environment or fallback
const MONGO_URI = 'mongodb+srv://raavanaasura87_db_user:Chani8877@chani.irvyksk.mongodb.net/wlm?retryWrites=true&w=majority';

// Models
const Faculty = require('../src/models/Faculty');
const User = require('../src/models/User');

// Helper: Validate designation
const validateDesignation = (designation) => {
  const valid = [
    'Professor & Dean, SOCI',
    'Professor & HOD',
    'Associate Professor',
    'Assistant Professor',
    'Assistant Professor (Contract)',
    'CAP',
    'Teaching Associate',
    'Teaching Instructor',
  ];
  
  const trimmed = String(designation).trim();
  return valid.includes(trimmed) ? trimmed : 'Assistant Professor';
};

async function seedFacultyFromExcel() {
  try {
    console.log('🔌 Connecting to database...');
    console.log(`   URI: ${MONGO_URI.substring(0, 50)}...`);
    
    // Set connection timeout
    const connectPromise = mongoose.connect(MONGO_URI, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });

    // Race between connection and timeout
    await Promise.race([
      connectPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 12000)
      ),
    ]);
    
    console.log('✅ Connected to MongoDB\n');

    // Read Excel file
    const excelPath = path.join(__dirname, '..', '..', 'FL-1.xlsx');
    console.log(`📂 Reading Excel file: ${excelPath}`);
    
    if (!fs.existsSync(excelPath)) {
      console.error('❌ Excel file not found');
      process.exit(1);
    }

    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const allRows = xlsx.utils.sheet_to_json(worksheet);

    // Extract faculty data (skip header rows - first 2 rows are title and column headers)
    const facultyRecords = allRows.slice(2).filter(row => 
      row.__EMPTY && // Has empId
      row.__EMPTY_1 && // Has name
      row.__EMPTY_2 && // Has designation
      row.__EMPTY_3 // Has mobile
    );

    console.log(`✅ Found ${facultyRecords.length} faculty records in Excel\n`);

    // Display summary of data
    console.log('📋 Data Summary:');
    console.log(`   Total Records: ${facultyRecords.length}`);
    console.log(`   Sample: ${facultyRecords[0].__EMPTY_1} (EmpID: ${facultyRecords[0].__EMPTY})\n`);

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    const facultyDeleteResult = await Faculty.deleteMany({});
    const userDeleteResult = await User.deleteMany({});
    console.log(`   ✅ Deleted ${facultyDeleteResult.deletedCount} faculty records`);
    console.log(`   ✅ Deleted ${userDeleteResult.deletedCount} user records\n`);

    // Prepare faculty and user records
    console.log('🔄 Processing faculty data...\n');
    
    let createdCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < facultyRecords.length; i++) {
      const row = facultyRecords[i];
      const empId = String(row.__EMPTY).trim();
      const name = String(row.__EMPTY_1).trim();
      const designation = validateDesignation(row.__EMPTY_2);
      const mobile = String(row.__EMPTY_3).trim();
      const email = row.__EMPTY_4 ? String(row.__EMPTY_4).trim() : `${empId}@university.edu`;

      try {
        // Create Faculty record
        const facultyDoc = new Faculty({
          empId,
          name,
          designation,
          mobile,
          email,
          department: 'CSE',
        });

        await facultyDoc.save();

        // Create User account with mobile-based password
        const passwordHash = bcrypt.hashSync(mobile, 10);
        
        const userDoc = new User({
          empId,
          name,
          designation,
          mobile,
          email,
          passwordHash,
          role: 'faculty',
          canAccessAdmin: false,
        });

        await userDoc.save();

        createdCount++;
        
        if ((i + 1) % 20 === 0) {
          console.log(`   ✅ Processed ${i + 1}/${facultyRecords.length} records...`);
        }

      } catch (err) {
        errorCount++;
        errors.push({ empId, name, error: err.message });
        console.log(`   ⚠️  Error for ${empId} (${name}): ${err.message}`);
      }
    }

    console.log(`\n✅ Completed!\n`);
    console.log('📊 Results:');
    console.log(`   • Successfully created: ${createdCount} faculty + user pairs`);
    console.log(`   • Errors: ${errorCount}\n`);

    if (errors.length > 0) {
      console.log('❌ Error Details:');
      errors.forEach(e => {
        console.log(`   - ${e.empId}: ${e.error}`);
      });
    }

    // Verify data
    console.log('\n🔍 Verification:');
    const facultyCount = await Faculty.countDocuments();
    const userCount = await User.countDocuments();
    
    console.log(`   • Faculty collection: ${facultyCount} records`);
    console.log(`   • User collection: ${userCount} records`);

    if (facultyCount > 0) {
      const sample = await Faculty.findOne().lean();
      console.log(`\n📝 Sample Faculty Record:`);
      console.log(`   ID: ${sample.empId}`);
      console.log(`   Name: ${sample.name}`);
      console.log(`   Designation: ${sample.designation}`);
      console.log(`   Mobile: ${sample.mobile}`);
      console.log(`   Email: ${sample.email}`);
    }

    console.log('\n✨ Seeding complete!');
    
    // Display login info for testing
    console.log('\n🔑 Sample Login Credentials (use mobile as password):');
    const sampleFaculty = await Faculty.find().limit(3).lean();
    sampleFaculty.forEach(f => {
      console.log(`   • ${f.empId}: password=${f.mobile}`);
    });

    process.exit(0);

  } catch (err) {
    console.error('❌ Fatal Error:', err);
    process.exit(1);
  }
}

seedFacultyFromExcel();
