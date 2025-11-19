const mongoose = require('mongoose');
const axios = require('axios');

async function testLateMinutes() {
  try {
    console.log('🔍 Testing Late Minutes API Response...\n');
    
    // Test the attendance API to see if late minutes are returned correctly
    const response = await axios.get('http://localhost:8080/api/attendance', {
      params: {
        employee: '673b1b25d1d5f832449e6ffc', // Victor Francis's employee ID
        limit: 5
      },
      headers: {
        'Authorization': 'Bearer your-token-here' // You might need to add proper auth
      }
    });
    
    console.log('📊 API Response for Victor Francis attendance:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const attendanceRecords = response.data.data || [];
    
    if (attendanceRecords.length === 0) {
      console.log('❌ No attendance records found');
      return;
    }
    
    attendanceRecords.forEach((record, index) => {
      console.log(`Record ${index + 1}:`);
      console.log(`  Date: ${record.date}`);
      console.log(`  Status: ${record.status}`);
      console.log(`  Check In: ${record.checkIn?.time || 'N/A'}`);
      console.log(`  Check Out: ${record.checkOut?.time || 'N/A'}`);
      console.log(`  Late Arrival: ${record.lateArrival || 0} minutes`);
      console.log(`  Late Minutes: ${record.lateMinutes || 0} minutes`);
      console.log(`  Work Hours: ${record.workHours || 0} hours`);
      console.log('  ─────────────────────────────────────────\n');
    });
    
    // Check if lateMinutes field exists and has correct value
    const lateRecord = attendanceRecords.find(r => r.status === 'late');
    if (lateRecord) {
      console.log('✅ Found late record:');
      console.log(`   lateArrival: ${lateRecord.lateArrival}`);
      console.log(`   lateMinutes: ${lateRecord.lateMinutes}`);
      
      if (lateRecord.lateMinutes > 0) {
        console.log('🎉 SUCCESS: Late minutes are now being returned correctly!');
      } else {
        console.log('⚠️  WARNING: Late minutes still showing as 0');
      }
    } else {
      console.log('ℹ️  No late records found in the response');
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Network Error:', error.message);
      console.log('\n💡 This might be because:');
      console.log('   1. Server is not running on port 8080');
      console.log('   2. Authentication is required');
      console.log('   3. API endpoint has changed');
    }
  }
}

testLateMinutes().catch(console.error);