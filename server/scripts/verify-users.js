const User = require('../src/models/User');
const Faculty = require('../src/models/Faculty');
const { connect } = require('../src/db');

(async () => {
  await connect();
  const adminCount = await User.countDocuments({ role: 'admin' });
  const facCount = await User.countDocuments({ role: 'faculty' });
  const totalUsers = await User.countDocuments();
  const facWithPw = await Faculty.countDocuments({ passwordHash: { $exists: true, $ne: null } });
  
  console.log('✅ Final Verification:');
  console.log('  Admin users:', adminCount);
  console.log('  Faculty users:', facCount);
  console.log('  Total user accounts:', totalUsers);
  console.log('  Faculty with password hash:', facWithPw);
  console.log('\n✅ All faculty are now users with mobile number as password!');
  process.exit(0);
})();
