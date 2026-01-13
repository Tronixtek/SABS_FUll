const mongoose = require('mongoose');
const Attendance = require('./server/models/Attendance');
const Employee = require('./server/models/Employee');
const Facility = require('./server/models/Facility');
const Shift = require('./server/models/Shift');
require('dotenv').config();

const seedTodayAttendance = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Delete existing attendance for today
    await Attendance.deleteMany({
      checkInTime: { $gte: today, $lt: tomorrow }
    });
    console.log('Cleared existing attendance for today');

    // Get all active employees with their facilities and shifts
    const employees = await Employee.find({ 
      status: 'active',
      isDeleted: false 
    }).populate('facility shift');

    console.log(`Found ${employees.length} active employees`);

    // Get all facilities
    const facilities = await Facility.find({});
    const facilityMap = new Map();
    facilities.forEach(f => {
      if (!facilityMap.has(f._id.toString())) {
        facilityMap.set(f._id.toString(), { name: f.facilityName, lateCount: 0 });
      }
    });

    const attendanceRecords = [];

    for (const employee of employees) {
      if (!employee.shift) continue;

      const facilityId = employee.facility._id.toString();
      const facilityInfo = facilityMap.get(facilityId);
      
      // Determine if this employee should be late
      // At least 1 person per facility should be late
      const shouldBeLate = facilityInfo.lateCount === 0 || Math.random() < 0.15; // 15% chance of being late
      
      // Get shift start time (assuming format "08:00")
      const [shiftHour, shiftMinute] = employee.shift.startTime.split(':').map(Number);
      
      let checkInTime = new Date(today);
      let status = 'present';
      
      if (shouldBeLate) {
        // Late arrival: 10-60 minutes after shift start
        const lateMinutes = Math.floor(Math.random() * 50) + 10;
        checkInTime.setHours(shiftHour, shiftMinute + lateMinutes, Math.floor(Math.random() * 60));
        status = 'late';
        facilityInfo.lateCount++;
        console.log(`${employee.firstName} ${employee.lastName} - LATE by ${lateMinutes} minutes`);
      } else {
        // On-time or early: 0-30 minutes before shift start
        const earlyMinutes = Math.floor(Math.random() * 30);
        checkInTime.setHours(shiftHour, shiftMinute - earlyMinutes, Math.floor(Math.random() * 60));
        status = 'present';
      }

      // Some employees already checked out
      let checkOutTime = null;
      const hasCheckedOut = Math.random() < 0.3; // 30% have checked out
      
      if (hasCheckedOut) {
        const [endHour, endMinute] = employee.shift.endTime.split(':').map(Number);
        checkOutTime = new Date(today);
        // Check out around shift end time (±30 minutes)
        const variation = Math.floor(Math.random() * 60) - 30;
        checkOutTime.setHours(endHour, endMinute + variation, Math.floor(Math.random() * 60));
      }

      const attendance = {
        employee: employee._id,
        employeeId: employee.employeeId,
        facility: employee.facility._id,
        shift: employee.shift._id,
        date: today,
        checkInTime: checkInTime,
        checkOutTime: checkOutTime,
        status: status,
        workHours: checkOutTime ? (checkOutTime - checkInTime) / (1000 * 60 * 60) : 0,
        isLate: status === 'late',
        lateArrivalMinutes: status === 'late' ? Math.floor((checkInTime - new Date(today.setHours(shiftHour, shiftMinute))) / (1000 * 60)) : 0
      };

      attendanceRecords.push(attendance);
    }

    // Insert all attendance records
    await Attendance.insertMany(attendanceRecords);
    
    console.log(`\n✅ Created ${attendanceRecords.length} attendance records for today`);
    
    // Show summary by facility
    console.log('\nSummary by facility:');
    for (const [facilityId, info] of facilityMap.entries()) {
      const facilityRecords = attendanceRecords.filter(r => r.facility.toString() === facilityId);
      const lateRecords = facilityRecords.filter(r => r.status === 'late');
      console.log(`${info.name}: ${facilityRecords.length} present, ${lateRecords.length} late`);
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

seedTodayAttendance();
