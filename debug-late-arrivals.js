const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config();

const Attendance = require('./server/models/Attendance');
const Employee = require('./server/models/Employee');
const Facility = require('./server/models/Facility');

async function debugLateArrivals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-tracking');
    console.log('✅ Connected to MongoDB');

    const start = moment().startOf('month').toDate();
    const end = moment().endOf('month').toDate();

    console.log('\n📅 Date Range:', {
      start: moment(start).format('YYYY-MM-DD'),
      end: moment(end).format('YYYY-MM-DD')
    });

    // Get all attendance records for this month
    const allRecords = await Attendance.find({
      date: { $gte: start, $lte: end }
    })
    .populate('employee', 'employeeId firstName lastName')
    .populate('facility', 'name code')
    .lean();

    console.log('\n📊 Total Attendance Records:', allRecords.length);

    // Group by status
    const byStatus = allRecords.reduce((acc, record) => {
      const status = record.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📈 Records by Status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Find records marked as "late"
    const lateRecords = allRecords.filter(r => r.status === 'late');
    console.log('\n⏰ Late Records:', lateRecords.length);

    if (lateRecords.length > 0) {
      console.log('\n🔍 Sample Late Records:');
      lateRecords.slice(0, 5).forEach(record => {
        console.log({
          employee: `${record.employee?.firstName} ${record.employee?.lastName}`,
          employeeId: record.employee?.employeeId,
          facility: record.facility?.name,
          date: moment(record.date).format('YYYY-MM-DD'),
          status: record.status,
          type: record.type,
          lateArrival: record.lateArrival,
          timestamp: record.timestamp
        });
      });

      // Group late records by facility
      const lateByFacility = lateRecords.reduce((acc, record) => {
        if (!record.facility) return acc;
        const facName = record.facility.name;
        if (!acc[facName]) {
          acc[facName] = {
            count: 0,
            employees: new Set()
          };
        }
        acc[facName].count++;
        if (record.employee) {
          acc[facName].employees.add(record.employee.employeeId);
        }
        return acc;
      }, {});

      console.log('\n🏢 Late Records by Facility:');
      Object.entries(lateByFacility).forEach(([facility, data]) => {
        console.log(`  ${facility}: ${data.count} late records, ${data.employees.size} employees`);
      });
    }

    // Check for records with lateArrival > 0 but status != 'late'
    const shouldBeLate = allRecords.filter(r => 
      r.lateArrival && r.lateArrival > 0 && r.status !== 'late'
    );

    if (shouldBeLate.length > 0) {
      console.log('\n⚠️ Records with late minutes but wrong status:', shouldBeLate.length);
      console.log('Sample:');
      shouldBeLate.slice(0, 3).forEach(record => {
        console.log({
          employee: `${record.employee?.firstName} ${record.employee?.lastName}`,
          status: record.status,
          lateArrival: record.lateArrival,
          date: moment(record.date).format('YYYY-MM-DD')
        });
      });
    }

    // Check today's attendance
    const today = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    
    const todayRecords = await Attendance.find({
      date: { $gte: today, $lte: todayEnd }
    })
    .populate('employee', 'employeeId firstName lastName')
    .populate('facility', 'name code')
    .lean();

    console.log('\n📅 Today\'s Records:', todayRecords.length);
    console.log('Today\'s Status Breakdown:');
    const todayByStatus = todayRecords.reduce((acc, record) => {
      const status = record.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(todayByStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\n✅ Debug complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugLateArrivals();
