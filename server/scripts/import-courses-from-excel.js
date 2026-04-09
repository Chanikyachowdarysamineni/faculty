/**
 * Import Courses Data from Excel File
 * Handles multiple Excel formats for course data
 * Usage: node import-courses-from-excel.js <path-to-excel>
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
  const val = String(program).trim().toLowerCase();
  if (val.includes('b.tech') || val === 'btech') return 'B.Tech';
  if (val.includes('m.tech') || val === 'mtech') return 'M.Tech';
  return program;
};

const parseExcelFile = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    console.log(`📄 Found sheets: ${workbook.SheetNames.join(', ')}`);
    
    const allCourses = [];
    
    // Process each sheet (each sheet = different year/section)
    workbook.SheetNames.forEach((sheetName, idx) => {
      try {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        console.log(`  Sheet "${sheetName}": ${data.length} rows`);
        
        // Add sheet name info for context
        data.forEach(row => {
          row.__sheetName = sheetName;
        });
        
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
    // Try different column header possibilities
    const subjectCode = row['Subject Code'] || row['Code'] || row['Course Code'] || row['subjectCode'] || '';
    const subjectName = row['Subject Name'] || row['Name'] || row['Course Name'] || row['subjectName'] || '';
    const shortName = row['Short Name'] || row['Short Code'] || row['shortName'] || subjectCode || '';
    const courseType = row['Course Type'] || row['Type'] || row['courseType'] || 'Mandatory';
    const program = row['Program'] || row['Degree'] || row['program'] || 'B.Tech';
    let year = row['Year'] || row['Semester'] || row['year'] || 'I';
    const l = Number(row['L'] || row['Lecture'] || row['l'] || 0);
    const t = Number(row['T'] || row['Tutorial'] || row['t'] || 0);
    const p = Number(row['P'] || row['Practical'] || row['p'] || 0);
    const c = Number(row['C'] || row['Credit'] || row['c'] || 0);
    
    // If no course code/name, skip
    if (!subjectCode || !subjectName) return;
    
    // Try to extract year from sheet name if not in row
    if ((!year || year === 'I') && row.__sheetName) {
      const sheetLower = row.__sheetName.toLowerCase();
      if (sheetLower.includes('i sem') || sheetLower.includes('first')) year = 'I';
      else if (sheetLower.includes('ii sem') || sheetLower.includes('second')) year = 'II';
      else if (sheetLower.includes('iii sem') || sheetLower.includes('third')) year = 'III';
      else if (sheetLower.includes('iv sem') || sheetLower.includes('fourth')) year = 'IV';
    }
    
    courses.push({
      courseId: courseId++,
      subjectCode: String(subjectCode).trim(),
      subjectName: String(subjectName).trim(),
      shortName: String(shortName).trim() || String(subjectCode).trim(),
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
      console.error('❌ Usage: node import-courses-from-excel.js <path-to-excel>');
      process.exit(1);
    }

    console.log(`📂 Reading file: ${filePath}\n`);
    const rawData = parseExcelFile(filePath);
    console.log(`✅ Loaded ${rawData.length} rows\n`);
    
    const courses = extractCoursesData(rawData);
    console.log(`✅ Extracted ${courses.length} course records\n`);

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

    console.log('📊 Import Summary (First 20):');
    courses.slice(0, 20).forEach((c, i) => {
      console.log(`  ${i + 1}. [${c.courseId}] ${c.subjectCode} - ${c.subjectName} (${c.program}, Year: ${c.year})`);
    });
    
    if (courses.length > 20) {
      console.log(`  ... and ${courses.length - 20} more courses`);
    }

    const finalCount = await Course.countDocuments();
    console.log(`\n📊 Final course count in database: ${finalCount}`);
    console.log('🎉 Import completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

importCourses();
