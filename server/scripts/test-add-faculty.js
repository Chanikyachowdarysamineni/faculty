/**
 * test-add-faculty.js
 * Test adding new faculty and verify user account is created
 */

const API = 'http://localhost:5000/deva';
const TOKEN = 'your_admin_token_here'; // Will be provided by admin login

const TEST_FACULTY = {
  empId: 'TEST_001',
  name: 'Test Faculty User',
  designation: 'Assistant Professor',
  mobile: '9999999999',
  email: 'testfaculty@test.com',
  department: 'CSE',
};

async function testAddFaculty() {
  try {
    console.log('🧪 Testing Faculty Addition with User Account Creation\n');
    
    // First, get admin token by logging in
    console.log('1️⃣ Logging in as admin...');
    // Use admin from seed: empId: 189, password: 9959949221
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empId: '189',
        password: '9959949221',
      }),
    });
    
    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      console.error('❌ Login failed:', loginData.message);
      return;
    }
    
    const token = loginData.data.token;
    console.log('✅ Login successful, token obtained\n');
    
    // Now test adding faculty
    console.log(`2️⃣ Adding new faculty: ${TEST_FACULTY.name}`);
    const addRes = await fetch(`${API}/faculty`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(TEST_FACULTY),
    });
    
    const addData = await addRes.json();
    if (!addRes.ok) {
      console.error('❌ Faculty addition failed:', addData.message);
      return;
    }
    
    console.log('✅ Faculty added successfully');
    console.log(`   Faculty ID: ${TEST_FACULTY.empId}`);
    console.log(`   Name: ${TEST_FACULTY.name}\n`);
    
    // Now try logging in as the new faculty with mobile as password
    console.log('3️⃣ Testing login as new faculty with mobile number as password...');
    console.log(`   Username: ${TEST_FACULTY.empId}`);
    console.log(`   Password: ${TEST_FACULTY.mobile}`);
    
    const newFacultyLoginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empId: TEST_FACULTY.empId,
        password: TEST_FACULTY.mobile,
      }),
    });
    
    const newFacultyLoginData = await newFacultyLoginRes.json();
    if (!newFacultyLoginRes.ok) {
      console.error('❌ New faculty login failed:', newFacultyLoginData.message);
      console.log('   This means the user account was NOT created with the mobile password\n');
      return;
    }
    
    console.log('✅ New faculty login successful!');
    console.log('   User account was created with mobile number as password\n');
    
    const newToken = newFacultyLoginData.data.token;
    console.log(`4️⃣ Verifying new faculty can access profile with token...`);
    
    const profileRes = await fetch(`${API}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${newToken}`,
      },
    });
    
    const profileData = await profileRes.json();
    if (!profileRes.ok) {
      console.error('❌ Profile access failed:', profileData.message);
      return;
    }
    
    console.log('✅ Profile access successful!');
    console.log(`   User ID: ${profileData.data.id}`);
    console.log(`   Name: ${profileData.data.name}`);
    console.log(`   Role: ${profileData.data.role}\n`);
    
    console.log('🎉 ALL TESTS PASSED!');
    console.log('   ✓ Faculty added successfully');
    console.log('   ✓ User account created automatically');
    console.log('   ✓ Mobile number works as password');
    console.log('   ✓ New faculty can login and access profile');
    
  } catch (err) {
    console.error('❌ Test error:', err.message);
  }
}

// Run the test
testAddFaculty();
