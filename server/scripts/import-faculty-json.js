/**
 * Import Faculty Data from JSON File
 * Usage: node scripts/import-faculty-json.js <path-to-json-file>
 * 
 * This script:
 * 1. Reads faculty data from a JSON file
 * 2. Validates the data
 * 3. Clears existing faculty collection
 * 4. Inserts new faculty records
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { connect } = require('../src/db');
const Faculty = require('../src/models/Faculty');

const parseJsonFile = (filePath) => {
  try {
    const absolutePath = path.resolve(filePath);
    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    
    // Handle both { faculty: [...] } and [...] formats
    const data = Array.isArray(jsonData) ? jsonData : (jsonData.faculty || []);
    
    console.log(`✅ Loaded ${data.length} records from JSON file`);
    return data;
  } catch (err) {
    console.error('❌ Error reading JSON file:', err.message);
    process.exit(1);
  }
};

const validateFacultyData = (rawData) => {
  const required = ['empId', 'name', 'email', 'department'];
  const valid = [];
  const errors = [];

  rawData.forEach((row, index) => {
    const missing = required.filter(field => !row[field] || String(row[field]).trim() === '');
    
    if (missing.length > 0) {
      errors.push(`Record ${index + 1}: Missing fields - ${missing.join(', ')}`);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email)) {
      errors.push(`Record ${index + 1}: Invalid email format - ${row.email}`);
      return;
    }

    valid.push({
      empId: String(row.empId).trim(),
      name: String(row.name).trim(),
      email: String(row.email).trim().toLowerCase(),
      department: String(row.department).trim(),
      designation: row.designation ? String(row.designation).trim() : 'Faculty', // Default to 'Faculty'
      mobile: row.phone ? String(row.phone).trim() : row.mobile ? String(row.mobile).trim() : '',
      // Optional: specialization, officeLocation, bio are stored as additional notes
      _additionalInfo: {
        specialization: row.specialization ? String(row.specialization).trim() : '',
        officeLocation: row.officeLocation ? String(row.officeLocation).trim() : '',
        bio: row.bio ? String(row.bio).trim() : '',
      }
    });
  });

  if (errors.length > 0) {
    console.log(`⚠️  Found ${errors.length} validation errors:`);
    errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
    if (errors.length > 10) console.log(`  ... and ${errors.length - 10} more`);
  }

  console.log(`✅ Validated ${valid.length} faculty records`);
  return valid;
};

const importFaculty = async (validData) => {
  try {
    await connect();
    console.log('📊 Connected to MongoDB');

    // Count existing records
    const existingCount = await Faculty.countDocuments();
    console.log(`📋 Existing faculty records: ${existingCount}`);

    // Clear existing data
    if (existingCount > 0) {
      const result = await Faculty.deleteMany({});
      console.log(`🗑️  Deleted ${result.deletedCount} existing faculty records`);
    }

    // Insert new data
    const inserted = await Faculty.insertMany(validData, { ordered: false });
    console.log(`✅ Imported ${inserted.length} new faculty records`);

    // Display summary
    console.log('\n📊 Import Summary:');
    inserted.slice(0, 5).forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name} (${f.empId}) - ${f.email}`);
    });
    if (inserted.length > 5) {
      console.log(`  ... and ${inserted.length - 5} more`);
    }

    // Verify import
    const finalCount = await Faculty.countDocuments();
    console.log(`\n📊 Final faculty count in database: ${finalCount}`);

    if (finalCount === validData.length) {
      console.log('🎉 Import completed successfully!');
      process.exit(0);
    } else {
      console.error(`❌ Import count mismatch: Expected ${validData.length}, got ${finalCount}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Import error:', err.message);
    process.exit(1);
  }
};

// Main execution
const main = async () => {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('❌ Usage: node scripts/import-faculty-json.js <path-to-json-file>');
    console.error('Example: node scripts/import-faculty-json.js ../sample-faculty-data.json');
    process.exit(1);
  }

  console.log(`📂 Reading file: ${filePath}`);
  const rawData = parseJsonFile(filePath);

  console.log('\n🔍 Validating data...');
  const validData = validateFacultyData(rawData);

  if (validData.length === 0) {
    console.error('❌ No valid faculty records to import');
    process.exit(1);
  }

  console.log('\n💾 Importing to database...');
  await importFaculty(validData);
};

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
