/**
 * read-excel.js
 * Read and display data from FL-1.xlsx
 */

const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

try {
  const filePath = path.join(__dirname, '..', '..', 'FL-1.xlsx');
  console.log(`📂 Reading file: ${filePath}\n`);
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath);
    process.exit(1);
  }

  // Read the workbook
  const workbook = xlsx.readFile(filePath);
  
  console.log('📄 Sheets in workbook:');
  workbook.SheetNames.forEach((name, idx) => {
    console.log(`   ${idx + 1}. ${name}`);
  });
  console.log();

  // Read the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  console.log(`📊 Reading sheet: "${sheetName}"`);
  console.log('─'.repeat(100));

  // Convert to JSON
  const data = xlsx.utils.sheet_to_json(worksheet);
  
  console.log(`\n✅ Found ${data.length} records\n`);
  
  // Display headers
  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    console.log('📋 Columns:');
    headers.forEach((h, i) => {
      console.log(`   ${i + 1}. ${h}`);
    });
    console.log('\n' + '═'.repeat(100));
    
    // Display first 5 records as preview
    console.log('\n🔍 PREVIEW - First 5 Faculty Records:\n');
    for (let i = 0; i < Math.min(5, data.length); i++) {
      console.log(`\n[Record ${i + 1}]`);
      headers.forEach(header => {
        const value = data[i][header];
        console.log(`   ${header}: ${value !== undefined ? value : '(empty)'}`);
      });
    }
    
    // Display all records in compact format
    console.log('\n' + '═'.repeat(100));
    console.log('\n📋 ALL FACULTY RECORDS:\n');
    data.forEach((row, idx) => {
      console.log(`${idx + 1}. `, row);
    });
    
    // Save to JSON for inspection
    const outputPath = path.join(__dirname, '..', '..', 'faculty-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`\n✅ Data saved to: ${outputPath}`);
  }

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
