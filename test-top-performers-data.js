const mongoose = require('mongoose');
const Attendance = require('./server/models/Attendance');
const Employee = require('./server/models/Employee');

async function testTopPerformersData() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/attendance-tracking', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('📊 Testing Top Performers Data Structure');
    console.log('=' .repeat(60));
    
    // Get all attendance records to see the aggregation
    const attendanceRecords = await Attendance.find({})
      .populate('employee', 'employeeId firstName lastName')
      .sort({ date: -1 });
    
    console.log('📋 Raw Attendance Records:');
    attendanceRecords.forEach(record => {
      console.log(`  ${record.employee.firstName} ${record.employee.lastName}: ${record.type} - ${record.status} (Late: ${record.lateArrival || 0}min)`);
    });
    
    // Test the aggregation logic
    const employeeStats = {};
    
    attendanceRecords.forEach(record => {
      const empId = record.employee._id.toString();
      if (!employeeStats[empId]) {
        employeeStats[empId] = {
          employee: record.employee,
          totalDays: 0,
          presentDays: 0,
          lateCount: 0,
          totalWorkHours: 0,
          totalLateMinutes: 0
        };
      }
      
      const dateKey = record.date.toISOString().split('T')[0];
      
      // Only count each day once
      if (!employeeStats[empId][dateKey]) {
        employeeStats[empId][dateKey] = true;
        employeeStats[empId].totalDays++;
        
        if (['present', 'late'].includes(record.status)) {
          employeeStats[empId].presentDays++;
        }
        
        if (record.status === 'late') {
          employeeStats[empId].lateCount++;
          employeeStats[empId].totalLateMinutes += record.lateArrival || 0;
        }
      }
    });
    
    console.log('\n🎯 Calculated Employee Stats:');
    Object.values(employeeStats).forEach(emp => {
      const onTimeDays = emp.presentDays - emp.lateCount;
      const punctualityScore = emp.totalDays > 0 ? Math.round((onTimeDays / emp.totalDays) * 100) : 0;
      console.log(`  ${emp.employee.firstName} ${emp.employee.lastName}:`);
      console.log(`    - Total Days: ${emp.totalDays}`);
      console.log(`    - Present Days: ${emp.presentDays}`);
      console.log(`    - Late Count: ${emp.lateCount}`);
      console.log(`    - On-time Days: ${onTimeDays}`);
      console.log(`    - Punctuality Score: ${punctualityScore}%`);
      console.log(`    - Display: ${onTimeDays}/${emp.totalDays} on-time`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testTopPerformersData();