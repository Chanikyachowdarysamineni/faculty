require('dotenv').config({ path: '.env' });
const { connect } = require('./src/db');
const Course = require('./src/models/Course');

(async () => {
  try {
    await connect();
    const count = await Course.countDocuments();
    const byProgram = await Course.aggregate([
      { $group: { _id: '$program', count: { $sum: 1 } } }
    ]);
    const byYear = await Course.aggregate([
      { $group: { _id: '$year', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    console.log('Total courses:', count);
    console.log('By program:', byProgram);
    console.log('By year:', byYear);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
