/**
 * Debug script to investigate totalWorkHours discrepancy between PDF and Analytics
 */

require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const moment = require('moment');
const Attendance = require('./server/models/Attendance');
const Employee = require('./server/models/Employee');
const Facility = require('./server/models/Facility');
const Shift = require('./server/models/Shift');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
  debugTotalHours();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Copy the aggregation function from the controllers
const aggregateAttendanceRecords = (rawRecords) => {
  const attendanceMap = new Map();

  rawRecords.forEach(record => {
    if (!record.employee || !record.employee._id || !record.date) {
      console.warn('⚠️ Skipping record without employee/date data:', record._id);
      return;
    }
    
    const dateKey = moment(record.date).format('YYYY-MM-DD');
    const key = `${record.employee._id.toString()}-${dateKey}`;
    
    if (!attendanceMap.has(key)) {
      attendanceMap.set(key, {
        _id: record._id,
        employee: record.employee,
        employeeId: record.employee.employeeId || record.employeeId,
        facility: record.facility,
        shift: record.shift,
        date: dateKey,
        status: 'present',
        checkIn: { time: null },
        checkOut: { time: null },
        workHours: 0,
        overtime: 0,
        undertime: 0,
        lateArrival: 0,
        isExcused: record.isExcused || false,
        excuseReason: record.excuseReason || null
      });
    }

    const attendanceItem = attendanceMap.get(key);
    
    if (record.type === 'check-in') {
      attendanceItem.checkIn = {
        time: record.timestamp,
        deviceId: record.deviceIP || record.xo5Data?.deviceKey,
        method: record.xo5Data?.verificationMethod?.[0] || 'face'
      };
      if (record.status === 'late') {
        attendanceItem.status = 'late';
        attendanceItem.lateArrival = record.lateArrival || 0;
      } else if (record.status === 'excused') {
        attendanceItem.status = 'excused';
        attendanceItem.isExcused = true;
        attendanceItem.excuseReason = record.excuseReason;
      }
    } else if (record.type === 'check-out') {
      attendanceItem.checkOut = {
        time: record.timestamp,
        deviceId: record.deviceIP || record.xo5Data?.deviceKey,
        method: record.xo5Data?.verificationMethod?.[0] || 'face'
      };
    }
  });

  // Calculate work hours
  for (const [key, attendanceItem] of attendanceMap) {
    if (attendanceItem.checkIn.time && attendanceItem.checkOut.time) {
      const workMinutes = moment(attendanceItem.checkOut.time).diff(moment(attendanceItem.checkIn.time), 'minutes');
      attendanceItem.workHours = Math.max(0, workMinutes / 60);
      
      const expectedHours = attendanceItem.shift?.workingHours || 8;
      if (attendanceItem.workHours > expectedHours) {
        attendanceItem.overtime = attendanceItem.workHours - expectedHours;
      } else if (attendanceItem.workHours < expectedHours - 1) {
        attendanceItem.undertime = expectedHours - attendanceItem.workHours;
      }
    }
  }

  return Array.from(attendanceMap.values());
};

async function debugTotalHours() {
  try {
    // Get current month range (same as Analytics page)
    const start = moment().startOf('month').toDate();
    const end = moment().endOf('month').toDate();
    
    console.log('\n📅 Date Range (Current Month):');
    console.log('Start:', moment(start).format('YYYY-MM-DD HH:mm:ss'));
    console.log('End:', moment(end).format('YYYY-MM-DD HH:mm:ss'));
    console.log('');

    // ANALYTICS CALCULATION METHOD
    console.log('=== ANALYTICS CALCULATION ===');
    const monthRawAttendance = await Attendance.find({
      date: { $gte: start, $lte: end }
    })
    .populate('employee', 'employeeId firstName lastName')
    .populate('facility', 'name code')
    .populate('shift', 'workingHours');
    
    console.log(`📋 Raw attendance records: ${monthRawAttendance.length}`);
    
    const monthAggregated = aggregateAttendanceRecords(monthRawAttendance);
    console.log(`📊 Aggregated records: ${monthAggregated.length}`);
    
    const analyticsTotalWorkHours = Math.round(
      monthAggregated.reduce((sum, a) => sum + (a.workHours || 0), 0) * 100
    ) / 100;
    
    console.log(`🔢 Analytics Total Work Hours: ${analyticsTotalWorkHours.toFixed(2)}`);
    console.log('');

    // PDF CALCULATION METHOD
    console.log('=== PDF CALCULATION (via finalRecords) ===');
    
    // Group by employee (same as PDF report)
    const employeeSummary = new Map();
    
    monthAggregated.forEach(record => {
      const employeeId = record.employee._id.toString();
      
      if (!employeeSummary.has(employeeId)) {
        employeeSummary.set(employeeId, {
          employee: record.employee,
          attendance: {
            totalWorkHours: 0
          }
        });
      }
      
      const summary = employeeSummary.get(employeeId);
      summary.attendance.totalWorkHours += record.workHours || 0;
    });
    
    const finalRecords = Array.from(employeeSummary.values());
    console.log(`👥 Unique employees with attendance: ${finalRecords.length}`);
    
    const pdfTotalWorkHours = finalRecords.reduce((sum, record) => 
      sum + (record.attendance.totalWorkHours || 0), 0
    );
    
    console.log(`🔢 PDF Total Work Hours: ${pdfTotalWorkHours.toFixed(2)}`);
    console.log('');

    // COMPARISON
    console.log('=== COMPARISON ===');
    console.log(`Analytics: ${analyticsTotalWorkHours.toFixed(2)} hrs`);
    console.log(`PDF:       ${pdfTotalWorkHours.toFixed(2)} hrs`);
    console.log(`Difference: ${(pdfTotalWorkHours - analyticsTotalWorkHours).toFixed(2)} hrs`);
    console.log('');

    if (Math.abs(pdfTotalWorkHours - analyticsTotalWorkHours) > 0.01) {
      console.log('❌ DISCREPANCY DETECTED!');
      
      // Find sample employee with hours
      const sampleEmployee = finalRecords.find(r => r.attendance.totalWorkHours > 0);
      if (sampleEmployee) {
        console.log('\n📝 Sample Employee:');
        console.log(`Name: ${sampleEmployee.employee.firstName} ${sampleEmployee.employee.lastName}`);
        console.log(`ID: ${sampleEmployee.employee.employeeId}`);
        console.log(`Total Hours (PDF method): ${sampleEmployee.attendance.totalWorkHours.toFixed(2)}`);
        
        // Get their individual records
        const employeeRecords = monthAggregated.filter(r => 
          r.employee._id.toString() === sampleEmployee.employee._id.toString()
        );
        console.log(`Number of days worked: ${employeeRecords.length}`);
        console.log('\nDaily breakdown:');
        employeeRecords.forEach(r => {
          console.log(`  ${r.date}: ${r.workHours.toFixed(2)} hrs (${r.status})`);
        });
      }
    } else {
      console.log('✅ No discrepancy - calculations match!');
    }

    // CHECK FOR DUPLICATE RECORDS
    console.log('\n=== CHECKING FOR DUPLICATES ===');
    const employeeDateCountMap = new Map();
    
    monthRawAttendance.forEach(record => {
      if (!record.employee || !record.date) return;
      const key = `${record.employee._id.toString()}-${moment(record.date).format('YYYY-MM-DD')}`;
      employeeDateCountMap.set(key, (employeeDateCountMap.get(key) || 0) + 1);
    });
    
    const duplicates = Array.from(employeeDateCountMap.entries())
      .filter(([key, count]) => count > 2) // More than check-in + check-out
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    if (duplicates.length > 0) {
      console.log(`⚠️ Found ${duplicates.length} employee-date combinations with >2 records:`);
      duplicates.forEach(([key, count]) => {
        console.log(`  ${key}: ${count} records`);
      });
    } else {
      console.log('✅ No duplicate records found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}
