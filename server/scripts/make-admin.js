const User = require('../src/models/User');
const { connect } = require('../src/db');

(async () => {
  try {
    await connect();
    console.log('✅ Connected to MongoDB\n');

    const empId = process.argv[2] || '189';
    
    // Find the user first
    const user = await User.findOne({ empId });
    if (!user) {
      console.log(`❌ User with empId ${empId} not found`);
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${empId})`);
    console.log(`Current role: ${user.role}`);
    console.log(`Can access admin: ${user.canAccessAdmin}\n`);

    // Update to admin
    await User.updateOne(
      { empId },
      {
        $set: {
          role: 'admin',
          canAccessAdmin: true
        }
      }
    );

    const updated = await User.findOne({ empId });
    console.log(`✅ Successfully updated!\n`);
    console.log(`Updated user: ${updated.name} (${empId})`);
    console.log(`New role: ${updated.role}`);
    console.log(`Can access admin: ${updated.canAccessAdmin}`);
    console.log(`\n🎉 Employee ${empId} is now an admin!`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
