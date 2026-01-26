const mongoose = require('mongoose');
const moment = require('moment-timezone');
require('dotenv').config();

const Employee = require('./server/models/Employee');
const Attendance = require('./server/models/Attendance');
const Facility = require('./server/models/Facility');
const Shift = require('./server/models/Shift');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Configuration
const DAYS_TO_GENERATE = 30; // Generate attendance for last 30 days
const ATTENDANCE_PATTERNS = {
  present: 0.70,      // 70% on-time
  late: 0.15,         // 15% late
  absent: 0.10,       // 10% absent
  onLeave: 0.05       // 5% on leave
};

function getRandomStatus() {
  const rand = Math.random();
  if (rand < ATTENDANCE_PATTERNS.present) return 'present';
  if (rand < ATTENDANCE_PATTERNS.present + ATTENDANCE_PATTERNS.late) return 'late';
  if (rand < ATTENDANCE_PATTERNS.present + ATTENDANCE_PATTERNS.late + ATTENDANCE_PATTERNS.absent) return 'absent';
  return 'on-leave';
}

function getRandomLateMinutes() {
  // Random late between 5-90 minutes
  return Math.floor(Math.random() * 85) + 5;
}

function getRandomTime(baseTime, variationMinutes = 15) {
  // Add random variation to base time (±variationMinutes)
  const variation = Math.floor(Math.random() * (variationMinutes * 2)) - variationMinutes;
  return moment(baseTime).add(variation, 'minutes').toDate();
}

async function seedAttendanceForExisting() {
  try {
    console.log('🔍 Fetching existing employees...');
    
    // Get all active employees with facility and shift
    const employees = await Employee.find({ status: 'active' })
      .populate('facility')
      .populate('shift');
    
    if (employees.length === 0) {
      console.log('❌ No active employees found in database!');
      process.exit(1);
    }
    
    console.log(`✅ Found ${employees.length} active employees`);
    console.log(`📅 Generating attendance for last ${DAYS_TO_GENERATE} days`);
    
    const attendanceRecords = [];
    const today = moment().startOf('day');
    
    // Generate attendance for each employee
    for (const employee of employees) {
      if (!employee.shift) {
        console.log(`⚠️ Skipping ${employee.firstName} ${employee.lastName} - No shift assigned`);
        continue;
      }
      
      console.log(`👤 Processing: ${employee.firstName} ${employee.lastName} (${employee.employeeId})`);
      
      // Generate attendance for each day
      for (let i = 0; i < DAYS_TO_GENERATE; i++) {
        const date = moment(today).subtract(i, 'days');
        const dateStart = date.clone().startOf('day').toDate();
        
        // Skip weekends (optional - remove if you want weekend data)
        // if (date.day() === 0 || date.day() === 6) continue;
        
        const status = getRandomStatus();
        
        // Skip absent days - no records needed
        if (status === 'absent') {
          continue;
        }
        
        // Skip on-leave days for now (unless you want to create leave requests)
        if (status === 'on-leave') {
          continue;
        }
        
        const facilityTimezone = employee.facility?.timezone || 'UTC';
        
        // Parse shift times
        const [startHour, startMinute] = employee.shift.startTime.split(':');
        const [endHour, endMinute] = employee.shift.endTime.split(':');
        
        const scheduledCheckIn = moment.tz(dateStart, facilityTimezone)
          .hour(parseInt(startHour))
          .minute(parseInt(startMinute))
          .second(0)
          .toDate();
        
        const scheduledCheckOut = moment.tz(dateStart, facilityTimezone)
          .hour(parseInt(endHour))
          .minute(parseInt(endMinute))
          .second(0)
          .toDate();
        
        // Generate check-in time
        let checkInTime;
        let lateArrival = 0;
        
        if (status === 'late') {
          lateArrival = getRandomLateMinutes();
          checkInTime = moment(scheduledCheckIn).add(lateArrival, 'minutes').toDate();
        } else {
          // On-time: arrive within grace period
          checkInTime = getRandomTime(scheduledCheckIn, 10); // ±10 minutes variation
        }
        
        // Generate check-out time (most people checkout on time or a bit late)
        const checkOutTime = getRandomTime(scheduledCheckOut, 20); // ±20 minutes variation
        
        // Create check-in record
        attendanceRecords.push({
          employee: employee._id,
          employeeId: employee.employeeId,
          facility: employee.facility._id,
          date: dateStart,
          type: 'check-in',
          timestamp: checkInTime,
          shift: employee.shift._id,
          scheduledCheckIn: scheduledCheckIn,
          scheduledCheckOut: scheduledCheckOut,
          status: status,
          lateArrival: lateArrival,
          source: 'MANUAL',
          verified: true
        });
        
        // Create check-out record
        attendanceRecords.push({
          employee: employee._id,
          employeeId: employee.employeeId,
          facility: employee.facility._id,
          date: dateStart,
          type: 'check-out',
          timestamp: checkOutTime,
          shift: employee.shift._id,
          scheduledCheckIn: scheduledCheckIn,
          scheduledCheckOut: scheduledCheckOut,
          status: 'present',
          source: 'MANUAL',
          verified: true
        });
      }
    }
    
    console.log(`\n📊 Generated ${attendanceRecords.length} attendance records`);
    console.log('💾 Saving to database...');
    
    // Check for existing attendance and skip duplicates
    let inserted = 0;
    let skipped = 0;
    
    for (const record of attendanceRecords) {
      try {
        // Check if record already exists
        const existing = await Attendance.findOne({
          employee: record.employee,
          date: record.date,
          type: record.type
        });
        
        if (existing) {
          skipped++;
        } else {
          await Attendance.create(record);
          inserted++;
        }
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key - skip
          skipped++;
        } else {
          throw error;
        }
      }
    }
    
    console.log(`✅ Attendance records seeded successfully!`);
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Skipped (already exist): ${skipped}`);
    console.log('\n📈 Summary:');
    console.log(`   Employees: ${employees.length}`);
    console.log(`   Days: ${DAYS_TO_GENERATE}`);
    console.log(`   Total Records: ${attendanceRecords.length}`);
    console.log(`   Check-ins: ${attendanceRecords.filter(r => r.type === 'check-in').length}`);
    console.log(`   Check-outs: ${attendanceRecords.filter(r => r.type === 'check-out').length}`);
    console.log(`   Late Arrivals: ${attendanceRecords.filter(r => r.status === 'late').length}`);
    console.log(`   On-time: ${attendanceRecords.filter(r => r.status === 'present' && r.type === 'check-in').length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

seedAttendanceForExisting();
