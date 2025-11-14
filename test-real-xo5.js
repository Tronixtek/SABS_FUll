// Test with REAL XO5 data from your system
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// This is the ACTUAL data format from your XO5 device
const realXO5Data = {
  "capFlag": "",
  "idCard": "",
  "resultFlag": "1",
  "fingerFlag": "",
  "cardNo": "",
  "verifyStyle": "0",
  "openDoorFlag": "1",
  "recordId": "114",
  "palmFlag": "",
  "temperature": "",
  "attach": "",
  "personType": "1",
  "recordTimeStr": "2025-11-03 20:50:17",
  "voucherCode": "",
  "direction": "1",
  "pwdFlag": "",
  "idCardFlag": "",
  "maskFlag": "",
  "cardFlag": "",
  "deviceKey": "020e7096a03c670f63",
  "personName": "vic",
  "recordTime": "1762199417000",
  "strangerFlag": "0",
  "personSn": "111",
  "faceFlag": "1"
};

async function testRealXO5Data() {
  console.log('🧪 Testing with REAL XO5 Data...\n');
  
  try {
    console.log('📋 Real XO5 Record:');
    console.log(JSON.stringify(realXO5Data, null, 2));
    console.log('\n🔍 Analyzing data:');
    console.log(`   Person ID: ${realXO5Data.personSn} (vic)`);
    console.log(`   Result: ${realXO5Data.resultFlag === '1' ? 'SUCCESS ✅' : 'FAILED ❌'}`);
    console.log(`   Person Type: ${realXO5Data.personType === '1' ? 'REGISTERED ✅' : 'STRANGER ❌'}`);
    console.log(`   Direction: ${realXO5Data.direction === '1' ? 'CHECK-IN ✅' : realXO5Data.direction === '4' ? 'CHECK-OUT ✅' : 'OTHER ❌'}`);
    console.log(`   Verification: ${realXO5Data.faceFlag === '1' ? 'FACE ✅' : ''} ${realXO5Data.fingerFlag === '1' ? 'FINGER ✅' : ''} ${realXO5Data.cardFlag === '1' ? 'CARD ✅' : ''}`);
    console.log(`   Time: ${realXO5Data.recordTimeStr}`);
    
    console.log('\n🚀 Sending to XO5 endpoint...');
    
    const recordResponse = await axios.post(`${BASE_URL}/api/xo5/record`, realXO5Data);
    
    console.log('\n✅ RESPONSE:');
    console.log(`   Status: ${recordResponse.data.status}`);
    console.log(`   Message: ${recordResponse.data.message}`);
    
    if (recordResponse.data.attendanceId) {
      console.log(`\n🎯 SUCCESS! Attendance ID: ${recordResponse.data.attendanceId}`);
      console.log('✅ *** REAL XO5 DATA WAS SAVED TO DATABASE! ***');
    } else {
      console.log('\n⚠️ No attendance ID returned');
      console.log('   Possible reasons:');
      console.log(`   - Employee with Device ID "${realXO5Data.personSn}" (vic) does not exist in SABS`);
      console.log('   - Employee has no shift assigned');
      console.log('   - Database connection issue');
    }
    
    console.log(`\n📊 Details:`);
    console.log(`   Person ID: ${recordResponse.data.personId}`);
    console.log(`   Record ID: ${recordResponse.data.recordId}`);
    console.log(`   Device ID: ${recordResponse.data.deviceId}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server is not running. Start it with: npm start');
    } else if (error.response?.status === 400) {
      console.log('\n💡 This is likely because:');
      console.log(`   - Employee with Device ID "${realXO5Data.personSn}" (vic) needs to be created in SABS`);
      console.log('   - Employee needs a shift assignment');
    }
  }
  
  console.log('\n🏁 Real data test complete!');
  console.log('\n📝 Next Steps:');
  console.log('   1. Create employee "vic" with Device ID "111" in SABS');
  console.log('   2. Assign a shift to the employee');
  console.log('   3. Test again - data should save successfully!');
}

testRealXO5Data();