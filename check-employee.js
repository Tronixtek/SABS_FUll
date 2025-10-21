// Quick script to check if Victor Francis exists in database
const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('./server/models/Employee');
const Facility = require('./server/models/Facility');

async function checkEmployee() {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/attendance-tracking');
    console.log('✅ Connected!\n');

    // Find Dala facility
    const facility = await Facility.findOne({ name: 'Dala' });
    if (!facility) {
      console.log('❌ Dala facility not found!');
      process.exit(1);
    }

    console.log(`✅ Found Dala facility: ${facility._id}\n`);

    // Check for Victor Francis by device ID
    const deviceId = '1760669812601-IF0TTH5';
    
    console.log(`🔍 Searching for employee with Device ID: ${deviceId}`);
    const employee = await Employee.findOne({
      deviceId: deviceId,
      facility: facility._id
    }).populate('shift');

    if (employee) {
      console.log('\n✅ EMPLOYEE FOUND!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Name: ${employee.firstName} ${employee.lastName}`);
      console.log(`ID: ${employee._id}`);
      console.log(`Device ID: ${employee.deviceId}`);
      console.log(`Card ID: ${employee.biometricData?.cardId || 'N/A'}`);
      console.log(`Employee ID: ${employee.employeeId || 'N/A'}`);
      console.log(`Shift: ${employee.shift ? employee.shift.name : 'NOT ASSIGNED ⚠️'}`);
      console.log(`Status: ${employee.status}`);
      console.log(`Email: ${employee.email || 'N/A'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      if (!employee.shift) {
        console.log('⚠️ WARNING: No shift assigned to this employee!');
        console.log('   Attendance cannot be saved without a shift.');
        console.log('   Please assign a shift in the Employees page.\n');
      }

      console.log('✅ Attendance sync should work for this employee!');
    } else {
      console.log('\n❌ EMPLOYEE NOT FOUND!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Searched for Device ID: ${deviceId}`);
      console.log(`In Facility: ${facility.name} (${facility._id})`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      console.log('📋 ACTION REQUIRED:');
      console.log('   1. Go to Employees page in your system');
      console.log('   2. Click "Add Employee"');
      console.log('   3. Fill in:');
      console.log('      - First Name: Victor');
      console.log('      - Last Name: Francis');
      console.log('      - Device ID: 1760669812601-IF0TTH5  ← EXACT MATCH!');
      console.log('      - Facility: Dala');
      console.log('      - Shift: (select any shift)');
      console.log('      - Status: Active');
      console.log('   4. Save');
      console.log('   5. Try sync again\n');

      // Show all employees in Dala facility for reference
      const allEmployees = await Employee.find({ facility: facility._id });
      console.log(`\n📋 Existing employees in Dala facility: ${allEmployees.length}`);
      if (allEmployees.length > 0) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        allEmployees.forEach((emp, index) => {
          console.log(`${index + 1}. ${emp.firstName} ${emp.lastName}`);
          console.log(`   Device ID: ${emp.deviceId || 'NOT SET'}`);
          console.log(`   Card ID: ${emp.biometricData?.cardId || 'NOT SET'}`);
          console.log('');
        });
      }
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkEmployee();
