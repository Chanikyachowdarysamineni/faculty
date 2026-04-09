/**
 * Import Courses from "2026-27 I Sem Courses - CSE.xlsx"
 * Handles the specific format with Program, Year, Sem, Course Code, Course Name, etc.
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const XLSX = require('xlsx');
const { connect } = require('../src/db');
const Course = require('../src/models/Course');

const normalizeYear = (year) => {
  const yearMap = {
    '1': 'I', '2': 'II', '3': 'III', '4': 'IV',
    'I': 'I', 'II': 'II', 'III': 'III', 'IV': 'IV',
    'First': 'I', 'Second': 'II', 'Third': 'III', 'Fourth': 'IV',
    '1st': 'I', '2nd': 'II', '3rd': 'III', '4th': 'IV',
  };
  const val = String(year).trim();
  return yearMap[val] || val;
};

const normalizeProgram = (program) => {
  const val = String(program).trim();
  if (val.includes('B.Tech') || val.includes('B. Tech')) return 'B.Tech';
  if (val.includes('M.Tech') || val.includes('M. Tech')) return 'M.Tech';
  return val;
};

const parseExcelFile = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    console.log(`📄 Found sheets: ${workbook.SheetNames.join(', ')}`);
    
    const allCourses = [];
    
    // Process each sheet
    workbook.SheetNames.forEach((sheetName) => {
      try {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        console.log(`  Sheet "${sheetName}": ${data.length} rows`);
        allCourses.push(...data);
      } catch (err) {
        console.warn(`  ⚠️  Error reading sheet "${sheetName}": ${err.message}`);
      }
    });
    
    return allCourses;
  } catch (err) {
    console.error('❌ Error reading Excel file:', err.message);
    process.exit(1);
  }
};

const extractCoursesData = (rawData) => {
  const courses = [];
  let courseId = 1;
  
  rawData.forEach((row, index) => {
    // Extract fields based on the Excel format
    const courseCode = row['Course Code'] || row['courseCode'] || '';
    const courseName = row['Course name'] || row['Course Name'] || row['courseName'] || '';
    const program = row['Program'] || 'B.Tech';
    const year = row['Year'] || 'I';
    const courseType = row['Course Type'] || row['courseType'] || 'Mandatory';
    const l = Number(row['L'] || 0);
    const t = Number(row['T'] || 0);
    const p = Number(row['P'] || 0);
    const c = Number(row['C'] || 0);
    
    // Skip if no course code or name, or if it's the header row
    if (!courseCode || !courseName || courseCode.toLowerCase() === 'course code') {
      return;
    }
    
    // Skip if "To be assigned" courses (placeholder)
    if (courseCode.toLowerCase().includes('to be assigned')) {
      console.log(`  ⚠️  Skipping: ${courseName} (code not assigned)`);
      return;
    }
    
    // Create short name from course code (last 3 chars) or first few words
    let shortName = courseCode;
    if (courseName.length > 0) {
      const words = courseName.split(' ');
      shortName = words.slice(0, 2).join('').substring(0, 10) || courseCode;
    }
    
    courses.push({
      courseId: courseId++,
      subjectCode: String(courseCode).trim(),
      subjectName: String(courseName).trim(),
      shortName: String(shortName).trim(),
      courseType: String(courseType).trim() || 'Mandatory',
      program: normalizeProgram(program),
      year: normalizeYear(year),
      L: l,
      T: t,
      P: p,
      C: c,
    });
  });
  
  return courses;
};

const importCourses = async () => {
  try {
    const filePath = process.argv[2];
    if (!filePath) {
      console.error('❌ Usage: node import-excel-courses.js <path-to-excel>');
      process.exit(1);
    }

    console.log(`📂 Reading file: ${filePath}\n`);
    const rawData = parseExcelFile(filePath);
    console.log(`✅ Loaded ${rawData.length} rows\n`);
    
    const courses = extractCoursesData(rawData);
    console.log(`✅ Extracted ${courses.length} valid course records\n`);

    if (courses.length === 0) {
      console.log('❌ No valid course records found');
      process.exit(1);
    }

    await connect();
    console.log('✅ Connected to MongoDB\n');

    const existingCount = await Course.countDocuments();
    console.log(`📋 Existing course records: ${existingCount}`);

    // Clear and insert
    console.log('🗑️  Clearing existing data...');
    await Course.deleteMany({});

    console.log('💾 Importing new records...');
    const result = await Course.insertMany(courses);
    console.log(`✅ Imported ${result.length} course records\n`);

    console.log('📊 Import Summary (First 15):');
    courses.slice(0, 15).forEach((c, i) => {
      console.log(`  ${i + 1}. [${c.subjectCode}] ${c.subjectName} (${c.program} Year ${c.year}, ${c.courseType})`);
    });
    
    if (courses.length > 15) {
      console.log(`  ... and ${courses.length - 15} more courses`);
    }

    // Group by year
    const byYear = {};
    courses.forEach(c => {
      if (!byYear[c.year]) byYear[c.year] = 0;
      byYear[c.year]++;
    });
    
    console.log('\n📊 Courses by Year:');
    Object.keys(byYear).sort().forEach(year => {
      console.log(`  Year ${year}: ${byYear[year]} courses`);
    });

    const finalCount = await Course.countDocuments();
    console.log(`\n✅ Final course count in database: ${finalCount}`);
    console.log('🎉 Import completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

importCourses();
