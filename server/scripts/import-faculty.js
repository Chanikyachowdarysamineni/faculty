/**
 * Import Faculty Data from Excel File
 * Usage: node scripts/import-faculty.js <path-to-excel-file>
 * 
 * This script:
 * 1. Reads faculty data from an Excel file
 * 2. Validates the data
 * 3. Clears existing faculty collection
 * 4. Inserts new faculty records
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const XLSX = require('xlsx');
const { connect } = require('../src/db');
const Faculty = require('../src/models/Faculty');

const parseExcelFile = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log(`✅ Loaded ${data.length} rows from Excel file`);
    return data;
  } catch (err) {
    console.error('❌ Error reading Excel file:', err.message);
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
      errors.push(`Row ${index + 1}: Missing fields - ${missing.join(', ')}`);
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

    // Verify import
    const finalCount = await Faculty.countDocuments();
    console.log(`📊 Final faculty count in database: ${finalCount}`);

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
    console.error('❌ Usage: node scripts/import-faculty.js <path-to-excel-file>');
    console.error('Example: node scripts/import-faculty.js ../FL-1.xlsx');
    process.exit(1);
  }

  console.log(`📂 Reading file: ${filePath}`);
  const rawData = parseExcelFile(filePath);

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
