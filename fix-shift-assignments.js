const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-tracking';

console.log('Connecting to:', MONGODB_URI);

mongoose.connect(MONGODB_URI).then(async () => {
  const Employee = require('./server/models/Employee');
  const Shift = require('./server/models/Shift');
  
  console.log('=== CHECKING SHIFT ASSIGNMENTS ===\n');
  
  // Get all shifts
  const shifts = await Shift.find({});
  console.log('Available Shifts:');
  shifts.forEach(s => {
    console.log(`  - ${s.name} (${s.code}): ${s.startTime} - ${s.endTime}, Grace: ${s.graceTime?.checkIn || 15} min`);
  });
  
  // Get all employees
  const employees = await Employee.find({}).populate('shift');
  console.log(`\nTotal Employees: ${employees.length}\n`);
  
  console.log('Employee Shift Assignments:');
  employees.forEach(emp => {
    console.log(`  ${emp.employeeId} - ${emp.firstName} ${emp.lastName}`);
    console.log(`    Current Shift: ${emp.shift?.name || 'NO SHIFT'} (${emp.shift?.startTime || 'N/A'})`);
  });
  
  // Find Morning shift
  const morningShift = shifts.find(s => s.name === 'Morning shift');
  
  if (morningShift) {
    console.log(`\n=== FIXING SHIFT ASSIGNMENTS ===`);
    console.log(`Will assign all employees to: ${morningShift.name} (${morningShift.startTime})\n`);
    
    for (const emp of employees) {
      if (emp.shift?._id.toString() !== morningShift._id.toString()) {
        console.log(`  Updating ${emp.employeeId} from ${emp.shift?.name || 'NO SHIFT'} to ${morningShift.name}`);
        emp.shift = morningShift._id;
        await emp.save();
      } else {
        console.log(`  ${emp.employeeId} already has ${morningShift.name} - OK`);
      }
    }
    
    console.log('\n✅ All employees assigned to Morning shift');
  } else {
    console.log('\n❌ Morning shift not found!');
  }
  
  mongoose.connection.close();
  console.log('\nDone!');
});
