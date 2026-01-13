const mongoose = require('mongoose');
const Employee = require('./server/models/Employee');
require('dotenv').config();

async function checkEmployeeSelfServiceStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const employees = await Employee.find({}, 'employeeId staffId firstName lastName employeeSelfServiceEnabled pin pinMustChange');
    
    console.log('\n📊 EMPLOYEE SELF-SERVICE STATUS\n');
    console.log('═'.repeat(80));
    
    let enabledCount = 0;
    let disabledCount = 0;
    let hasPinCount = 0;
    let noPinCount = 0;
    
    employees.forEach(emp => {
      const hasPin = emp.pin ? '✅ HAS PIN' : '❌ NO PIN';
      const enabled = emp.employeeSelfServiceEnabled ? '✅ ENABLED' : '❌ DISABLED';
      const mustChange = emp.pinMustChange ? '⚠️ MUST CHANGE' : '✓ Can keep';
      
      console.log(`Employee: ${emp.firstName} ${emp.lastName}`);
      console.log(`  ID: ${emp.employeeId} | Staff ID: ${emp.staffId}`);
      console.log(`  Self-Service: ${enabled} | PIN: ${hasPin} | ${mustChange}`);
      console.log('─'.repeat(80));
      
      if (emp.employeeSelfServiceEnabled) enabledCount++;
      else disabledCount++;
      
      if (emp.pin) hasPinCount++;
      else noPinCount++;
    });
    
    console.log('\n📈 SUMMARY:');
    console.log(`   Total Employees: ${employees.length}`);
    console.log(`   Self-Service ENABLED: ${enabledCount}`);
    console.log(`   Self-Service DISABLED: ${disabledCount}`);
    console.log(`   Have PIN: ${hasPinCount}`);
    console.log(`   NO PIN: ${noPinCount}`);
    
    if (disabledCount > 0) {
      console.log('\n⚠️  WARNING:');
      console.log(`   ${disabledCount} employee(s) cannot access the self-service portal!`);
      console.log('   They need employeeSelfServiceEnabled = true and a PIN to login.');
      console.log('\n💡 SOLUTION:');
      console.log('   Run enable-self-service-all.js to activate access for all employees');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkEmployeeSelfServiceStatus();
