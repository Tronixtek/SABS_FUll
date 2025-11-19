const mongoose = require('mongoose');

// Connect to the CORRECT database
    await mongoose.connect('mongodb://localhost:27017/attendance-tracking');

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  date: Date,
  clockInTime: Date,
  clockOutTime: Date,
  shiftStartTime: Date,
  shiftEndTime: Date,
  isLate: Boolean,
  lateMinutes: Number,
  lateArrival: Number,
  overtimeHours: Number,
  status: String,
  type: String,
  timestamp: Date,
  workHours: Number,
  overtime: Number
});

const employeeSchema = new mongoose.Schema({
  employeeId: String,
  firstName: String,
  lastName: String,
  email: String,
  department: String,
  designation: String,
  isActive: { type: Boolean, default: true }
});

const Attendance = mongoose.model('Attendance', attendanceSchema);
const Employee = mongoose.model('Employee', employeeSchema);

async function debugVictorPunctuality() {
  try {
    console.log('🔍 Connecting to attendance_system database...');
    
    // First, find Victor Francis
    const victor = await Employee.findOne({
      $or: [
        { firstName: /victor/i, lastName: /francis/i },
        { firstName: /francis/i, lastName: /victor/i },
        { employeeId: 'EMP00112' }
      ]
    });
    
    console.log('\n📋 Victor Francis Employee Record:');
    if (!victor) {
      console.log('❌ Victor Francis not found in database');
      
      // Let's see what employees exist
      const allEmployees = await Employee.find({}).limit(5);
      console.log('\n📋 Sample employees in database:');
      allEmployees.forEach(emp => {
        console.log(`- ${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
      });
      return;
    }
    
    console.log(`✅ Found: ${victor.firstName} ${victor.lastName}`);
    console.log(`   ID: ${victor._id}`);
    console.log(`   Employee ID: ${victor.employeeId}`);
    console.log(`   Email: ${victor.email}`);
    console.log(`   Department: ${victor.department}`);
    
    // Find all attendance records for Victor
    const attendanceRecords = await Attendance.find({ 
      employee: victor._id 
    }).sort({ date: 1 });
    
    console.log(`\n📊 Victor's Attendance Records (${attendanceRecords.length} total):`);
    
    if (attendanceRecords.length === 0) {
      console.log('❌ No attendance records found for Victor Francis');
      return;
    }
    
    // Analyze each record
    attendanceRecords.forEach((record, index) => {
      console.log(`\n📝 Record ${index + 1}:`);
      console.log(`   Date: ${record.date?.toDateString()}`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Type: ${record.type}`);
      console.log(`   Timestamp: ${record.timestamp?.toLocaleString()}`);
      console.log(`   Late Minutes: ${record.lateMinutes || record.lateArrival || 0}`);
      console.log(`   Work Hours: ${record.workHours || 0}`);
      console.log(`   Is Late: ${record.isLate}`);
    });
    
    // Calculate stats like the analytics system does
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(r => ['present', 'late'].includes(r.status)).length;
    const lateDays = attendanceRecords.filter(r => r.status === 'late').length;
    const absentDays = attendanceRecords.filter(r => r.status === 'absent').length;
    
    console.log('\n🧮 Manual Calculation (like analytics system):');
    console.log(`   Total Days: ${totalDays}`);
    console.log(`   Present Days (including late): ${presentDays}`);
    console.log(`   Late Days: ${lateDays}`);
    console.log(`   Absent Days: ${absentDays}`);
    
    // Calculate punctuality using the system's formula
    const punctualityScore = totalDays > 0 ? 
      Math.round((100 - ((lateDays / totalDays) * 100)) * 100) / 100 : 100;
    
    console.log(`\n📈 Punctuality Calculation:`);
    console.log(`   Formula: 100 - ((${lateDays} ÷ ${totalDays}) × 100)`);
    console.log(`   Result: ${punctualityScore}%`);
    
    // Also calculate the "normal" punctuality (on-time vs total attendance)
    const onTimeDays = attendanceRecords.filter(r => r.status === 'present').length;
    const totalAttendance = presentDays; // present + late
    const normalPunctuality = totalAttendance > 0 ? 
      Math.round((onTimeDays / totalAttendance) * 100 * 100) / 100 : 100;
    
    console.log(`\n📊 Alternative Punctuality (On-time ÷ Attendance):`);
    console.log(`   Formula: (${onTimeDays} ÷ ${totalAttendance}) × 100`);
    console.log(`   Result: ${normalPunctuality}%`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.disconnect();
  }
}

debugVictorPunctuality();