const XLSX = require('xlsx');

const wb = XLSX.readFile('../2026-27 I Sem Courses - CSE.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

console.log('Total rows:', data.length);
console.log('\nAll courses:');
data.forEach((r, i) => {
  console.log(`${i+1}. ${r['Course Code']} - ${r['Course name']} (${r['Year']}, ${r['Course Type']})`);
});
