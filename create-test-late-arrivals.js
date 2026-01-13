const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config();

const Attendance = require('./server/models/Attendance');
const Employee = require('./server/models/Employee');
const Facility = require('./server/models/Facility');
const Shift = require('./server/models/Shift');

async function createTestLateArrivals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-tracking');
    console.log('✅ Connected to MongoDB');

    // Get active employees
    const employees = await Employee.find({ status: 'active' })
      .populate('facility')
      .populate('shift')
      .limit(20);

    if (employees.length === 0) {
      console.log('❌ No active employees found. Please create employees first.');
      process.exit(1);
    }

    console.log(`\n👥 Found ${employees.length} active employees`);

    // Group employees by facility
    const employeesByFacility = employees.reduce((acc, emp) => {
      if (!emp.facility) return acc;
      const facId = emp.facility._id.toString();
      if (!acc[facId]) {
        acc[facId] = {
          facility: emp.facility,
          employees: []
        };
      }
      acc[facId].employees.push(emp);
      return acc;
    }, {});

    console.log(`\n🏢 Facilities with employees: ${Object.keys(employeesByFacility).length}`);

    const attendanceRecords = [];
    
    // Create late arrival records for the past 15 days
    for (let day = 1; day <= 15; day++) {
      const date = moment().subtract(day, 'days').startOf('day').toDate();
      
      // For each facility, randomly make some employees late
      Object.values(employeesByFacility).forEach(({ facility, employees: facilityEmployees }) => {
        // Randomly select 20-40% of employees to be late on this day
        const numLate = Math.floor(facilityEmployees.length * (0.2 + Math.random() * 0.2));
        const shuffled = [...facilityEmployees].sort(() => Math.random() - 0.5);
        const lateEmployees = shuffled.slice(0, numLate);
        
        lateEmployees.forEach(employee => {
          if (!employee.shift) return;
          
          // Random late minutes between 5 and 60
          const lateMinutes = Math.floor(5 + Math.random() * 55);
          
          // Calculate scheduled start time
          const [hours, minutes] = (employee.shift.startTime || '09:00').split(':');
          const scheduledTime = moment(date)
            .hour(parseInt(hours))
            .minute(parseInt(minutes))
            .second(0);
          
          // Calculate actual check-in time (scheduled + late minutes)
          const checkInTime = scheduledTime.clone().add(lateMinutes, 'minutes');
          
          attendanceRecords.push({
            employee: employee._id,
            employeeId: employee.employeeId,
            facility: facility._id,
            shift: employee.shift._id,
            date: date,
            type: 'check-in',
            status: 'late',
            timestamp: checkInTime.toDate(),
            lateArrival: lateMinutes,
            deviceIP: '192.168.1.100',
            xo5Data: {
              deviceKey: facility.configuration?.deviceKey || 'test-device',
              verificationMethod: ['face']
            }
          });
        });
      });
    }

    if (attendanceRecords.length === 0) {
      console.log('❌ No records to create. Check that employees have shifts assigned.');
      process.exit(1);
    }

    console.log(`\n📊 Creating ${attendanceRecords.length} late arrival records...`);

    // Insert all records
    await Attendance.insertMany(attendanceRecords);

    console.log('✅ Test data created successfully!');

    // Show summary
    const recordsByFacility = attendanceRecords.reduce((acc, record) => {
      const facId = record.facility.toString();
      acc[facId] = (acc[facId] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📈 Records created by facility:');
    for (const [facId, count] of Object.entries(recordsByFacility)) {
      const facility = Object.values(employeesByFacility).find(
        f => f.facility._id.toString() === facId
      );
      if (facility) {
        console.log(`  ${facility.facility.name}: ${count} late arrivals`);
      }
    }

    console.log('\n🎉 You can now refresh the dashboard to see the late arrivals!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestLateArrivals();
