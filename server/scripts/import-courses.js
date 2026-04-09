/**
 * Import Courses Data from Excel File
 * Usage: node scripts/import-courses.js <path-to-excel-file>
 * 
 * This script:
 * 1. Reads course data from an Excel file
 * 2. Validates the data
 * 3. Clears existing courses collection
 * 4. Inserts new course records
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const XLSX = require('xlsx');
const { connect } = require('../src/db');
const Course = require('../src/models/Course');

const parseExcelFile = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    console.log(`📑 Found sheets: ${workbook.SheetNames.join(', ')}`);
    
    // Collect all sheets (multiple sheets for different years/sections)
    const allData = [];
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      console.log(`✅ Loaded ${data.length} rows from sheet: "${sheetName}"`);
      allData.push(...data);
    });
    
    console.log(`\n📊 Total: ${allData.length} course records from all sheets\n`);
    return allData;
  } catch (err) {
    console.error('❌ Error reading Excel file:', err.message);
    process.exit(1);
  }
};

const validateCourseData = (rawData) => {
  // Required fields based on Course model
  const required = ['courseId', 'subjectCode', 'subjectName', 'shortName', 'program', 'courseType'];
  const valid = [];
  const errors = [];
  const processedIds = new Set();

  rawData.forEach((row, index) => {
    // Skip empty rows
    if (!row.courseId && !row.subjectCode) {
      return;
    }

    // Check required fields
    const missing = required.filter(field => !row[field] || String(row[field]).trim() === '');
    if (missing.length > 0) {
      errors.push(`Row ${index + 1}: Missing required fields - ${missing.join(', ')}`);
      return;
    }

    // Check for duplicate courseId
    const courseId = Number(row.courseId);
    if (isNaN(courseId)) {
      errors.push(`Row ${index + 1}: courseId must be a number - "${row.courseId}"`);
      return;
    }

    if (processedIds.has(courseId)) {
      errors.push(`Row ${index + 1}: Duplicate courseId - ${courseId} (skipping duplicate)`);
      return;
    }
    processedIds.add(courseId);

    // Validate program enum
    const program = String(row.program).trim();
    if (!['B.Tech', 'M.Tech', 'B Tech', 'M Tech'].includes(program)) {
      errors.push(`Row ${index + 1}: Invalid program - "${program}" (use B.Tech or M.Tech)`);
      return;
    }

    // Parse L, T, P, C values
    const L = Number(row.L) || 0;
    const T = Number(row.T) || 0;
    const P = Number(row.P) || 0;
    const C = Number(row.C) || 0;

    if (isNaN(L) || isNaN(T) || isNaN(P) || isNaN(C)) {
      errors.push(`Row ${index + 1}: L, T, P, C must be numbers`);
      return;
    }

    valid.push({
      courseId: courseId,
      program: program === 'B Tech' ? 'B.Tech' : program === 'M Tech' ? 'M.Tech' : program,
      courseType: String(row.courseType).trim(),
      year: row.year ? String(row.year).trim() : '',
      subjectCode: String(row.subjectCode).trim().toUpperCase(),
      subjectName: String(row.subjectName).trim(),
      shortName: String(row.shortName).trim(),
      L: L,
      T: T,
      P: P,
      C: C,
      mainFacultyId: row.mainFacultyId ? String(row.mainFacultyId).trim() : '',
    });
  });

  if (errors.length > 0) {
    console.log(`\n⚠️  Found ${errors.length} validation errors:`);
    errors.slice(0, 15).forEach(e => console.log(`  - ${e}`));
    if (errors.length > 15) console.log(`  ... and ${errors.length - 15} more`);
  }

  console.log(`✅ Validated ${valid.length} course records\n`);
  return valid;
};

const importCourses = async (validData) => {
  try {
    await connect();
    console.log('📊 Connected to MongoDB\n');

    // Count existing records
    const existingCount = await Course.countDocuments();
    console.log(`📋 Existing course records: ${existingCount}`);

    // Clear existing data
    if (existingCount > 0) {
      const result = await Course.deleteMany({});
      console.log(`🗑️  Deleted ${result.deletedCount} existing course records`);
    }

    // Insert new data
    const inserted = await Course.insertMany(validData, { ordered: false });
    console.log(`✅ Imported ${inserted.length} new course records\n`);

    // Display summary by program and year
    const summary = {};
    inserted.forEach(course => {
      const key = `${course.program} - ${course.year || 'N/A'}`;
      if (!summary[key]) summary[key] = 0;
      summary[key]++;
    });

    console.log('📊 Import Summary by Program & Year:');
    Object.entries(summary).forEach(([key, count]) => {
      console.log(`  • ${key}: ${count} courses`);
    });

    // Display sample courses
    console.log(`\n📚 Sample Courses (first 5):`);
    inserted.slice(0, 5).forEach((c, i) => {
      console.log(`  ${i + 1}. [${c.courseId}] ${c.subjectCode} - ${c.subjectName} (${c.program})`);
    });
    if (inserted.length > 5) {
      console.log(`  ... and ${inserted.length - 5} more`);
    }

    // Verify import
    const finalCount = await Course.countDocuments();
    console.log(`\n📊 Final course count in database: ${finalCount}`);

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
    console.error('❌ Usage: node scripts/import-courses.js <path-to-excel-file>');
    console.error('Example: npm run import-courses ../courses.xlsx');
    process.exit(1);
  }

  console.log('📂 Reading Excel file...\n');
  const rawData = parseExcelFile(filePath);

  console.log('🔍 Validating data...');
  const validData = validateCourseData(rawData);

  if (validData.length === 0) {
    console.error('❌ No valid course records to import');
    process.exit(1);
  }

  console.log('💾 Importing to database...');
  await importCourses(validData);
};

main();
