// XO5 Test Script - Test the webhook endpoint
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test data that simulates XO5 device record
const testRecord = {
  recordId: "test-001",
  deviceKey: "XO5-DEVICE-001",
  recordTime: Date.now().toString(),
  recordTimeStr: new Date().toISOString().replace('T', ' ').substring(0, 19),
  personSn: "1001", // This should match an employee's Device ID
  personName: "Test User",
  resultFlag: "1", // Success
  personType: "1", // Registered user
  direction: "1",  // Check-in
  faceFlag: "1",   // Face verification used
  fingerFlag: "0",
  cardFlag: "0",
  pwdFlag: "0"
};

async function testXO5Integration() {
  console.log('🧪 Testing XO5 Integration...\n');
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/xo5/health`);
    console.log('✅ Health check passed:', healthResponse.data.message);
    console.log('   Server uptime:', Math.round(healthResponse.data.server.uptime), 'seconds\n');
    
    // Test 2: Send test record
    console.log('2️⃣ Testing webhook endpoint...');
    console.log('   Sending test record:', JSON.stringify(testRecord, null, 2));
    
    const recordResponse = await axios.post(`${BASE_URL}/api/xo5/record`, testRecord);
    console.log('✅ Webhook test result:', recordResponse.data.status);
    console.log('   Message:', recordResponse.data.message);
    
    if (recordResponse.data.attendanceId) {
      console.log('   Attendance ID:', recordResponse.data.attendanceId);
    }
    
    console.log('\n🎉 XO5 Integration Test Completed Successfully!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Configure your XO5 device webhook URL: http://YOUR-SERVER-IP:5000/api/xo5/record');
    console.log('   2. Ensure employee Device IDs match XO5 personSn values');
    console.log('   3. Assign shifts to all employees');
    console.log('   4. Test with real XO5 device');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server is not running. Start it with:');
      console.log('   npm run dev');
    } else if (error.response?.status === 400) {
      console.log('\n💡 This error is expected if:');
      console.log('   - Employee with Device ID "1001" does not exist');
      console.log('   - Employee has no shift assigned');
      console.log('   - Database is not properly configured');
    }
  }
}

// Run the test
testXO5Integration();