const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('./server/models/Employee');
const Facility = require('./server/models/Facility');

const restoreEmployee = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Search for Musa Ibrahim - include deleted employees
    const employees = await Employee.find({
      firstName: { $regex: /musa/i },
      lastName: { $regex: /ibrahim/i },
      isDeleted: true
    }).populate('facility', 'name code');

    if (employees.length === 0) {
      console.log('\n❌ No deleted employee found with name "Musa Ibrahim"');
      
      // Try searching without isDeleted filter
      console.log('\n🔍 Searching for any employee with name "Musa Ibrahim"...');
      const anyEmployees = await Employee.find({
        firstName: { $regex: /musa/i },
        lastName: { $regex: /ibrahim/i }
      }).populate('facility', 'name code');
      
      if (anyEmployees.length > 0) {
        console.log('\n✅ Found employee(s) (not deleted):');
        anyEmployees.forEach((emp, idx) => {
          console.log(`\n${idx + 1}. ${emp.firstName} ${emp.lastName}`);
          console.log(`   Employee ID: ${emp.employeeId}`);
          console.log(`   Facility: ${emp.facility?.name || 'Unknown'}`);
          console.log(`   Status: ${emp.status}`);
          console.log(`   Is Deleted: ${emp.isDeleted}`);
          console.log(`   MongoDB ID: ${emp._id}`);
        });
      } else {
        console.log('❌ No employee found with that name in the database');
      }
      
      await mongoose.connection.close();
      return;
    }

    console.log(`\n✅ Found ${employees.length} deleted employee(s):`);
    
    employees.forEach((emp, idx) => {
      console.log(`\n${idx + 1}. ${emp.firstName} ${emp.lastName}`);
      console.log(`   Employee ID: ${emp.employeeId}`);
      console.log(`   Facility: ${emp.facility?.name || 'Unknown'}`);
      console.log(`   Status: ${emp.status}`);
      console.log(`   Is Deleted: ${emp.isDeleted}`);
      console.log(`   Deleted At: ${emp.deletedAt}`);
      console.log(`   Deletion Reason: ${emp.deletionReason || 'Not specified'}`);
      console.log(`   Device ID: ${emp.deviceId || 'None (never enrolled on device)'}`);
      console.log(`   MongoDB ID: ${emp._id}`);
    });

    // If multiple found, ask user to confirm
    if (employees.length > 1) {
      console.log('\n⚠️ Multiple deleted employees found. Please edit this script to specify which one to restore by uncommenting the appropriate ID.');
      await mongoose.connection.close();
      return;
    }

    // Restore the employee
    const employeeToRestore = employees[0];
    
    console.log(`\n🔄 Restoring employee: ${employeeToRestore.firstName} ${employeeToRestore.lastName}`);
    console.log(`   Employee ID: ${employeeToRestore.employeeId}`);
    console.log(`   Facility: ${employeeToRestore.facility?.name || 'Unknown'}`);

    // Restore by updating the employee record
    employeeToRestore.isDeleted = false;
    employeeToRestore.status = 'active';
    employeeToRestore.deletedAt = null;
    employeeToRestore.deletionReason = null;

    await employeeToRestore.save();

    console.log('\n✅ Employee restored successfully!');
    console.log(`   Name: ${employeeToRestore.firstName} ${employeeToRestore.lastName}`);
    console.log(`   Employee ID: ${employeeToRestore.employeeId}`);
    console.log(`   Status: ${employeeToRestore.status}`);
    console.log(`   Is Deleted: ${employeeToRestore.isDeleted}`);
    
    if (employeeToRestore.deviceId) {
      console.log('\n⚠️ IMPORTANT: This employee has a device ID (was enrolled on biometric device)');
      console.log(`   Device ID: ${employeeToRestore.deviceId}`);
      console.log(`   You may need to re-enroll them on the biometric device if they were deleted from it.`);
    } else {
      console.log('\n✅ This employee was never enrolled on a biometric device.');
    }

    await mongoose.connection.close();
    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

restoreEmployee();
