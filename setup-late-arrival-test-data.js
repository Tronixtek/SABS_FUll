const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config();

const Attendance = require('./server/models/Attendance');
const Employee = require('./server/models/Employee');
const Facility = require('./server/models/Facility');
const Shift = require('./server/models/Shift');

async function checkAndCreateTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-tracking');
    console.log('✅ Connected to MongoDB');

    // Check what we have
    const employees = await Employee.find({ status: 'active' }).populate('facility').populate('shift');
    const facilities = await Facility.find({ status: 'active' });
    const shifts = await Shift.find();

    console.log('\n📊 Current Data:');
    console.log(`  Employees: ${employees.length}`);
    console.log(`  Facilities: ${facilities.length}`);
    console.log(`  Shifts: ${shifts.length}`);

    if (employees.length === 0) {
      console.log('\n❌ No employees found. Please create employees first using the frontend.');
      process.exit(1);
    }

    if (facilities.length === 0) {
      console.log('\n❌ No facilities found. Please create facilities first using the frontend.');
      process.exit(1);
    }

    // Get or create a default shift
    let defaultShift = shifts[0];
    
    if (!defaultShift && facilities.length > 0) {
      console.log('\n📝 Creating a default shift...');
      defaultShift = await Shift.create({
        name: 'Morning Shift',
        code: 'MS-001',
        facility: facilities[0]._id,
        startTime: '09:00',
        endTime: '17:00',
        workingHours: 8,
        graceMinutesLate: 15,
        graceMinutesEarly: 15,
        breakTime: 60,
        workingDays: [1, 2, 3, 4, 5], // Monday to Friday
        status: 'active'
      });
      console.log('✅ Default shift created');
    }

    // Assign shift to employees who don't have one
    const employeesWithoutShift = employees.filter(emp => !emp.shift);
    if (employeesWithoutShift.length > 0 && defaultShift) {
      console.log(`\n📝 Assigning shift to ${employeesWithoutShift.length} employees...`);
      await Employee.updateMany(
        { _id: { $in: employeesWithoutShift.map(e => e._id) } },
        { $set: { shift: defaultShift._id } }
      );
      console.log('✅ Shifts assigned');
    }

    // Reload employees with shift
    const updatedEmployees = await Employee.find({ status: 'active' })
      .populate('facility')
      .populate('shift');

    console.log(`\n👥 Employees ready for test data: ${updatedEmployees.length}`);
    
    if (updatedEmployees.filter(e => e.shift).length === 0) {
      console.log('❌ No employees with shifts. Cannot create test data.');
      process.exit(1);
    }

    // Create late arrival records
    const attendanceRecords = [];
    const today = moment().startOf('day');
    
    // Create records for the past 20 days
    for (let daysAgo = 1; daysAgo <= 20; daysAgo++) {
      const date = today.clone().subtract(daysAgo, 'days').toDate();
      
      // Make 30-50% of employees late each day
      const numLate = Math.max(1, Math.floor(updatedEmployees.length * (0.3 + Math.random() * 0.2)));
      const shuffled = [...updatedEmployees].sort(() => Math.random() - 0.5);
      const lateToday = shuffled.slice(0, numLate);
      
      lateToday.forEach(employee => {
        if (!employee.shift || !employee.facility) return;
        
        // Random late minutes between 5 and 90
        const lateMinutes = Math.floor(5 + Math.random() * 85);
        
        // Parse shift start time
        const [hours, minutes] = (employee.shift.startTime || '09:00').split(':');
        const scheduledTime = moment(date)
          .hour(parseInt(hours))
          .minute(parseInt(minutes))
          .second(0);
        
        // Actual check-in time
        const checkInTime = scheduledTime.clone().add(lateMinutes, 'minutes');
        
        // Calculate scheduled checkout time
        const [endHours, endMinutes] = (employee.shift.endTime || '17:00').split(':');
        const scheduledCheckOut = moment(date)
          .hour(parseInt(endHours))
          .minute(parseInt(endMinutes))
          .second(0);
        
        attendanceRecords.push({
          employee: employee._id,
          employeeId: employee.employeeId,
          facility: employee.facility._id,
          shift: employee.shift._id,
          date: date,
          type: 'check-in',
          status: 'late',
          timestamp: checkInTime.toDate(),
          scheduledCheckIn: scheduledTime.toDate(),
          scheduledCheckOut: scheduledCheckOut.toDate(),
          lateArrival: lateMinutes,
          deviceIP: '192.168.1.100',
          xo5Data: {
            deviceKey: employee.facility.configuration?.deviceKey || 'test-device',
            verificationMethod: ['face']
          }
        });
      });
    }

    console.log(`\n📊 Creating ${attendanceRecords.length} late arrival records...`);
    
    if (attendanceRecords.length > 0) {
      await Attendance.insertMany(attendanceRecords);
      console.log('✅ Test data created successfully!');
      
      // Summary by facility
      const byFacility = attendanceRecords.reduce((acc, record) => {
        const facId = record.facility.toString();
        if (!acc[facId]) {
          const facility = updatedEmployees.find(e => e.facility._id.toString() === facId)?.facility;
          acc[facId] = {
            name: facility?.name || 'Unknown',
            count: 0,
            employees: new Set()
          };
        }
        acc[facId].count++;
        acc[facId].employees.add(record.employee.toString());
        return acc;
      }, {});

      console.log('\n📈 Late arrivals by facility:');
      Object.values(byFacility).forEach(({ name, count, employees }) => {
        console.log(`  ${name}: ${count} late arrivals, ${employees.size} employees`);
      });
      
      console.log('\n🎉 Refresh your dashboard to see the late arrivals grouped by facility!');
    } else {
      console.log('❌ No records created');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

checkAndCreateTestData();
