/**
 * Import Courses Data from JSON File
 * Usage: node scripts/import-courses-json.js <path-to-json-file>
 * 
 * Accepts either format:
 * 1. { "courses": [...] }
 * 2. [...]
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { connect } = require('../src/db');
const Course = require('../src/models/Course');

const loadJSONFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    
    // Handle both formats: { courses: [...] } and [...]
    let data = Array.isArray(parsed) ? parsed : parsed.courses;
    
    if (!Array.isArray(data)) {
      throw new Error('JSON must contain an array of courses or { courses: [...] }');
    }

    console.log(`✅ Loaded ${data.length} records from JSON file`);
    return data;
  } catch (err) {
    console.error('❌ Error reading JSON file:', err.message);
    process.exit(1);
  }
};

const validateCourseData = (rawData) => {
  const required = ['courseId', 'subjectCode', 'subjectName', 'shortName', 'program', 'courseType'];
  const valid = [];
  const errors = [];
  const processedIds = new Set();

  rawData.forEach((row, index) => {
    // Skip empty objects
    if (!row || typeof row !== 'object') {
      return;
    }

    if (!row.courseId && !row.subjectCode) {
      return;
    }

    // Check required fields
    const missing = required.filter(field => !row[field] || String(row[field]).trim() === '');
    if (missing.length > 0) {
      errors.push(`Record ${index + 1}: Missing required fields - ${missing.join(', ')}`);
      return;
    }

    // Check for duplicate courseId
    const courseId = Number(row.courseId);
    if (isNaN(courseId)) {
      errors.push(`Record ${index + 1}: courseId must be a number - "${row.courseId}"`);
      return;
    }

    if (processedIds.has(courseId)) {
      errors.push(`Record ${index + 1}: Duplicate courseId - ${courseId}`);
      return;
    }
    processedIds.add(courseId);

    // Validate program
    const program = String(row.program).trim();
    if (!['B.Tech', 'M.Tech', 'B Tech', 'M Tech'].includes(program)) {
      errors.push(`Record ${index + 1}: Invalid program - "${program}"`);
      return;
    }

    // Parse L, T, P, C
    const L = Number(row.L) || 0;
    const T = Number(row.T) || 0;
    const P = Number(row.P) || 0;
    const C = Number(row.C) || 0;

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
    console.log(`⚠️  Found ${errors.length} validation errors:`);
    errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
    if (errors.length > 10) console.log(`  ... and ${errors.length - 10} more`);
  }

  console.log(`✅ Validated ${valid.length} course records`);
  return valid;
};

const importCourses = async (validData) => {
  try {
    await connect();
    console.log('📊 Connected to MongoDB');

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
    console.log(`✅ Imported ${inserted.length} new course records`);

    // Display summary
    console.log('\n📊 Import Summary:');
    inserted.slice(0, 5).forEach((c, i) => {
      console.log(`  ${i + 1}. [${c.courseId}] ${c.subjectCode} - ${c.subjectName}`);
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
    console.error('❌ Usage: node scripts/import-courses-json.js <path-to-json-file>');
    console.error('Example: npm run import-courses-json ../sample-courses.json');
    process.exit(1);
  }

  console.log('📂 Reading JSON file...');
  const rawData = loadJSONFile(filePath);

  console.log('\n🔍 Validating data...');
  const validData = validateCourseData(rawData);

  if (validData.length === 0) {
    console.error('❌ No valid course records to import');
    process.exit(1);
  }

  console.log('\n💾 Importing to database...');
  await importCourses(validData);
};

main();
