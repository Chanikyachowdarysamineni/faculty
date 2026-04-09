require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { connect } = require('../src/db');
const Faculty = require('../src/models/Faculty');
const Course = require('../src/models/Course');

const checkData = async () => {
  try {
    await connect();
    console.log('✅ Connected to MongoDB\n');

    const facultyCount = await Faculty.countDocuments();
    const courseCount = await Course.countDocuments();

    console.log(`📊 Database Status:`);
    console.log(`  Faculty records: ${facultyCount}`);
    console.log(`  Course records: ${courseCount}\n`);

    if (facultyCount > 0) {
      console.log('✅ Faculty Sample:');
      const faculty = await Faculty.find().limit(3);
      faculty.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.name} (${f.empId}) - ${f.department}`);
      });
    } else {
      console.log('❌ No faculty records found');
    }

    console.log();

    if (courseCount > 0) {
      console.log('✅ Courses Sample:');
      const courses = await Course.find().limit(3);
      courses.forEach((c, i) => {
        console.log(`  ${i + 1}. [${c.courseId}] ${c.subjectCode} - ${c.subjectName} (${c.program}, Year: ${c.year})`);
      });
    } else {
      console.log('❌ No course records found');
    }

    console.log('\n✅ Check completed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

checkData();
