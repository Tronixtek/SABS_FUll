const mongoose = require('mongoose');
require('dotenv').config();
const Employee = require('./server/models/Employee');

const checkEmployee = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const employee = await Employee.findOne({ employeeId: 'EMP00112' });
    
    if (employee) {
      console.log('\n📋 Employee Details:');
      console.log('Staff ID:', employee.staffId);
      console.log('Name:', employee.fullName);
      console.log('Cadre:', employee.cadre);
      console.log('Grade Level (virtual):', employee.gradeLevel);
      console.log('Department:', employee.department);
      console.log('Designation:', employee.designation);
    } else {
      console.log('❌ Employee not found');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkEmployee();
