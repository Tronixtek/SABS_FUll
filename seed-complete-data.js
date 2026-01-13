const mongoose = require('mongoose');
const Employee = require('./server/models/Employee');
const Facility = require('./server/models/Facility');
const Shift = require('./server/models/Shift');
const Attendance = require('./server/models/Attendance');
require('dotenv').config();

const seedCompleteData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get facilities and shifts
    const facilities = await Facility.find({});
    const shifts = await Shift.find({});
    
    console.log(`Facilities: ${facilities.length}`);
    console.log(`Shifts: ${shifts.length}`);

    if (facilities.length === 0 || shifts.length === 0) {
      console.log('❌ No facilities or shifts found. Please create them first.');
      mongoose.connection.close();
      return;
    }

    // Get all employees
    const employees = await Employee.find({ status: 'active', isDeleted: false });
    console.log(`\nUpdating ${employees.length} employees...`);

    // Assign facilities and shifts to employees
    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      const facility = facilities[i % facilities.length]; // Distribute across facilities
      const shift = shifts.find(s => s.shiftName && s.shiftName.includes('Day')) || shifts[0]; // Prefer day shift
      
      employee.facility = facility._id;
      employee.shift = shift._id;
      
      await employee.save({ validateModifiedOnly: true });
      console.log(`✅ ${employee.firstName} ${employee.lastName} -> ${facility.facilityName}, ${shift.shiftName || 'Shift'}`);
    }

    // Now create attendance records for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Delete existing attendance for today
    await Attendance.deleteMany({
      checkInTime: { $gte: today, $lt: tomorrow }
    });

    console.log('\n Creating attendance records for today...');

    const attendanceRecords = [];
    const facilityLateCounts = new Map();

    for (const employee of employees) {
      const facility = facilities.find(f => f._id.equals(employee.facility));
      const shift = shifts.find(s => s._id.equals(employee.shift));
      
      if (!shift || !shift.startTime) continue;

      const facilityId = facility._id.toString();
      if (!facilityLateCounts.has(facilityId)) {
        facilityLateCounts.set(facilityId, 0);
      }

      // Ensure at least 1 person per facility is late
      const shouldBeLate = facilityLateCounts.get(facilityId) === 0 || Math.random() < 0.2;
      
      const [shiftHour, shiftMinute] = shift.startTime.split(':').map(Number);
      const [endHour, endMinute] = shift.endTime.split(':').map(Number);
      
      // Scheduled times
      const scheduledCheckIn = new Date(today);
      scheduledCheckIn.setHours(shiftHour, shiftMinute, 0);
      
      const scheduledCheckOut = new Date(today);
      scheduledCheckOut.setHours(endHour, endMinute, 0);
      
      let checkInTime = new Date(today);
      let status = 'present';
      let lateMinutes = 0;
      
      if (shouldBeLate) {
        lateMinutes = Math.floor(Math.random() * 45) + 15; // 15-60 minutes late
        checkInTime.setHours(shiftHour, shiftMinute + lateMinutes, Math.floor(Math.random() * 60));
        status = 'late';
        facilityLateCounts.set(facilityId, facilityLateCounts.get(facilityId) + 1);
      } else {
        const earlyMinutes = Math.floor(Math.random() * 25);
        checkInTime.setHours(shiftHour, Math.max(0, shiftMinute - earlyMinutes), Math.floor(Math.random() * 60));
        status = 'present';
      }

      // Some employees checked out
      let checkOutTime = null;
      let workHours = 0;
      if (shift.endTime && Math.random() < 0.25) {
        checkOutTime = new Date(today);
        const variation = Math.floor(Math.random() * 40) - 20;
        checkOutTime.setHours(endHour, endMinute + variation, Math.floor(Math.random() * 60));
        workHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
      }

      attendanceRecords.push({
        employee: employee._id,
        employeeId: employee.employeeId,
        facility: facility._id,
        shift: shift._id,
        date: today,
        type: 'check-in',
        timestamp: checkInTime,
        scheduledCheckIn: scheduledCheckIn,
        scheduledCheckOut: scheduledCheckOut,
        checkIn: {
          time: checkInTime,
          method: 'fingerprint'
        },
        checkOut: checkOutTime ? {
          time: checkOutTime,
          method: 'fingerprint'
        } : undefined,
        status: status,
        workHours: workHours,
        lateArrival: lateMinutes
      });

      const timeStr = checkInTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const statusStr = status === 'late' ? `🔴 LATE (${lateMinutes}min)` : '🟢 On Time';
      console.log(`${employee.firstName} ${employee.lastName} @ ${facility.facilityName}: ${timeStr} ${statusStr}`);
    }

    await Attendance.insertMany(attendanceRecords);
    
    console.log(`\n✅ Created ${attendanceRecords.length} attendance records`);
    
    // Summary
    console.log('\n📊 Summary by facility:');
    for (const facility of facilities) {
      const facilityRecords = attendanceRecords.filter(r => r.facility.equals(facility._id));
      const lateCount = facilityRecords.filter(r => r.status === 'late').length;
      const onTimeCount = facilityRecords.length - lateCount;
      console.log(`${facility.facilityName}: ${facilityRecords.length} total (${onTimeCount} on-time, ${lateCount} late)`);
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

seedCompleteData();
