const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Employee = require('./server/models/Employee');

const seedEmployeePortal = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find first 3 active employees to enable portal access
    const employees = await Employee.find({ 
      status: 'active',
      isDeleted: false 
    }).limit(3);

    if (employees.length === 0) {
      console.log('❌ No active employees found in database');
      process.exit(1);
    }

    console.log(`\n📋 Found ${employees.length} employees to enable portal access\n`);

    // Enable portal access for each employee with test PIN
    const updatedEmployees = [];
    
    for (let employee of employees) {
      // Set PIN and other fields - save() will trigger pre-save hook to hash PIN
      employee.employeeSelfServiceEnabled = true;
      employee.pin = '1234'; // Will be hashed by pre-save hook
      employee.pinMustChange = false; // Set to true if you want to test PIN change flow
      employee.pinAttempts = 0;
      employee.pinLockedUntil = null;
      
      await employee.save();

      updatedEmployees.push({
        name: employee.fullName,
        staffId: employee.staffId,
        employeeId: employee.employeeId
      });

      console.log(`✅ Enabled portal for: ${employee.fullName}`);
      console.log(`   Staff ID: ${employee.staffId}`);
      console.log(`   Employee ID: ${employee.employeeId}`);
      console.log(`   PIN: 1234`);
      console.log('');
    }

    console.log('\n🎉 Employee Portal Access Configured Successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('='.repeat(50));
    
    for (let emp of updatedEmployees) {
      console.log(`Staff ID: ${emp.staffId} | PIN: 1234 | ${emp.name}`);
    }
    
    console.log('='.repeat(50));
    console.log('\n🌐 Login URL: http://localhost:3000/employee-login\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding employee portal:', error);
    process.exit(1);
  }
};

seedEmployeePortal();
