const mongoose = require('mongoose');
const Employee = require('./server/models/Employee');
const Shift = require('./server/models/Shift');
const Facility = require('./server/models/Facility');
require('dotenv').config();

const checkEmployees = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const employees = await Employee.find({ status: 'active', isDeleted: false })
      .populate('facility shift');
    
    console.log(`Total active employees: ${employees.length}\n`);
    
    employees.forEach(emp => {
      console.log(`${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
      console.log(`  Facility: ${emp.facility?.facilityName || 'NONE'}`);
      console.log(`  Shift: ${emp.shift?.shiftName || 'NONE'}`);
      console.log('');
    });

    const shifts = await Shift.find({});
    console.log(`\nAvailable shifts: ${shifts.length}`);
    shifts.forEach(s => {
      console.log(`  ${s.shiftName}: ${s.startTime} - ${s.endTime}`);
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkEmployees();
