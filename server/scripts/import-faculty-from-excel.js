/**
 * Import Faculty Data from FL-1.xlsx
 * This script handles the specific Excel format with merged cells
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
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return data;
  } catch (err) {
    console.error('❌ Error reading Excel file:', err.message);
    process.exit(1);
  }
};

const extractFacultyData = (rawData) => {
  // Parse the complex Excel format
  // Row 1: Title (skip)
  // Row 2: Headers: Sl.No | Employee id | Name | Designation | Mobile
  // Rows 3+: Faculty data
  
  const faculty = [];
  
  // Start from row 3 (index 2, after header row 2 at index 1)
  for (let i = 2; i < rawData.length; i++) {
    const row = rawData[i];
    
    // Get values from the columns
    const slNo = row['VFSTR DEEMED TO BE UNIVERSITY'];
    const empId = row['__EMPTY'];
    const name = row['__EMPTY_1'];
    const designation = row['__EMPTY_2'];
    const mobile = row['__EMPTY_3'];
    
    // Skip empty rows
    if (!empId || !name) continue;
    
    faculty.push({
      empId: String(empId).trim(),
      name: String(name).trim(),
      designation: String(designation).trim() || 'Faculty',
      mobile: String(mobile).trim() || 'N/A',
      department: 'CSE',
      email: `${String(name).toLowerCase().replace(/\s+/g, '.')}@university.edu`
    });
  }
  
  return faculty;
};

const importFaculty = async () => {
  try {
    const filePath = process.argv[2];
    if (!filePath) {
      console.error('❌ Usage: node import-faculty-from-excel.js <path-to-excel>');
      process.exit(1);
    }

    console.log(`📂 Reading file: ${filePath}`);
    const rawData = parseExcelFile(filePath);
    
    const faculty = extractFacultyData(rawData);
    console.log(`✅ Extracted ${faculty.length} faculty records\n`);

    if (faculty.length === 0) {
      console.log('❌ No valid faculty records found');
      process.exit(1);
    }

    await connect();
    console.log('✅ Connected to MongoDB\n');

    const existingCount = await Faculty.countDocuments();
    console.log(`📋 Existing faculty records: ${existingCount}`);

    // Clear and insert
    console.log('🗑️  Clearing existing data...');
    await Faculty.deleteMany({});

    console.log('💾 Importing new records...');
    const result = await Faculty.insertMany(faculty);
    console.log(`✅ Imported ${result.length} faculty records\n`);

    console.log('📊 Import Summary:');
    faculty.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name} (${f.empId}) - ${f.designation}`);
    });

    const finalCount = await Faculty.countDocuments();
    console.log(`\n📊 Final faculty count in database: ${finalCount}`);
    console.log('🎉 Import completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

importFaculty();
