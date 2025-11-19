const axios = require('axios');

async function testTopPerformers() {
  try {
    console.log('🔍 Testing Top Performers Logic...\n');
    
    const response = await axios.get('http://localhost:8080/api/analytics');
    
    const { topPerformers } = response.data.data;
    
    console.log('📊 Top Performers Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    topPerformers.forEach((performer, index) => {
      const { employee, attendanceRate, punctualityScore, presentDays, totalDays, lateCount } = performer;
      const onTimeDays = presentDays - lateCount;
      
      console.log(`${index + 1}. ${employee.firstName} ${employee.lastName} (${employee.employeeId})`);
      console.log(`   Attendance Rate: ${attendanceRate}% (${presentDays}/${totalDays} days showed up)`);
      console.log(`   Punctuality Score: ${punctualityScore}% (${onTimeDays}/${totalDays} on-time)`);
      console.log(`   Late Count: ${lateCount}`);
      console.log('   ─────────────────────────────────────────────────────');
    });
    
    console.log('\n✅ Analysis Complete!');
    console.log('🎯 Victor Francis should now show 0% punctuality (not 100%)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
  }
}

testTopPerformers();