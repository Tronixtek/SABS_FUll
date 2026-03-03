require('dotenv').config();
const mongoose = require('mongoose');
const Shift = require('./server/models/Shift');
const Employee = require('./server/models/Employee');
const Facility = require('./server/models/Facility');

async function checkShiftWorkingDays() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const shifts = await Shift.find().populate('facility', 'name');
    
    console.log('=== SHIFT CONFIGURATIONS ===\n');
    
    for (const shift of shifts) {
      console.log(`Shift: ${shift.name} (${shift.code})`);
      console.log(`  Facility: ${shift.facility?.name || 'N/A'}`);
      console.log(`  Working Hours: ${shift.workingHours} hrs/day`);
      console.log(`  Working Days: ${shift.workingDays?.length || 0} days/week`);
      if (shift.workingDays && shift.workingDays.length > 0) {
        console.log(`    Days: ${shift.workingDays.join(', ')}`);
      } else {
        console.log(`    ⚠️  No working days configured (defaults to 7 days)`);
      }
      
      // Count employees on this shift
      const empCount = await Employee.countDocuments({ shift: shift._id, status: 'active' });
      console.log(`  Employees: ${empCount}`);
      console.log('');
    }
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total Shifts: ${shifts.length}`);
    
    const shiftsWithDays = shifts.filter(s => s.workingDays && s.workingDays.length > 0);
    const shiftsWithoutDays = shifts.filter(s => !s.workingDays || s.workingDays.length === 0);
    
    console.log(`Shifts with working days configured: ${shiftsWithDays.length}`);
    console.log(`Shifts without working days (will use 7-day default): ${shiftsWithoutDays.length}`);
    
    if (shiftsWithDays.length > 0) {
      const avgDays = shiftsWithDays.reduce((sum, s) => sum + s.workingDays.length, 0) / shiftsWithDays.length;
      console.log(`Average working days/week: ${avgDays.toFixed(1)}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkShiftWorkingDays();
