const mongoose = require('mongoose');
const Employee = require('./server/models/Employee');
require('dotenv').config();

async function enableSelfServiceForAll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find all employees without self-service enabled or without PIN
    const employeesNeedingAccess = await Employee.find({
      $or: [
        { employeeSelfServiceEnabled: false },
        { employeeSelfServiceEnabled: { $exists: false } },
        { pin: { $exists: false } },
        { pin: null }
      ]
    });

    if (employeesNeedingAccess.length === 0) {
      console.log('✅ All employees already have self-service access enabled!');
      return;
    }

    console.log(`🔧 Found ${employeesNeedingAccess.length} employee(s) needing self-service activation\n`);
    console.log('═'.repeat(80));

    let successCount = 0;
    let errorCount = 0;

    for (const employee of employeesNeedingAccess) {
      try {
        console.log(`\n📝 Processing: ${employee.firstName} ${employee.lastName} (${employee.staffId})`);
        
        let needsUpdate = false;
        
        // Enable self-service if not already enabled
        if (!employee.employeeSelfServiceEnabled) {
          employee.employeeSelfServiceEnabled = true;
          needsUpdate = true;
          console.log('   ✅ Enabled self-service access');
        }
        
        // Generate PIN if doesn't exist
        if (!employee.pin) {
          const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
          employee.pin = generatedPin; // Will be auto-hashed by pre-save hook
          employee.pinMustChange = true; // Force change on first login
          needsUpdate = true;
          console.log(`   🔑 Generated PIN: ${generatedPin}`);
          console.log('   ⚠️  Employee must change PIN on first login');
        }
        
        if (needsUpdate) {
          await employee.save({ validateModifiedOnly: true });
          successCount++;
          console.log('   💾 Saved successfully');
        } else {
          console.log('   ℹ️  No changes needed');
        }
        
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error: ${error.message}`);
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 ACTIVATION SUMMARY:');
    console.log(`   Successfully activated: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total processed: ${employeesNeedingAccess.length}`);

    if (successCount > 0) {
      console.log('\n✅ SELF-SERVICE ACCESS ACTIVATED!');
      console.log('\n📋 NEXT STEPS:');
      console.log('   1. Run check-employee-self-service.js to verify status');
      console.log('   2. Communicate PINs to affected employees (shown above)');
      console.log('   3. Employees can login at: /employee-login');
      console.log('   4. They will be forced to change PIN on first login');
      console.log('\n⚠️  IMPORTANT:');
      console.log('   Save the generated PINs above - they are hashed in the database!');
      console.log('   New employees will get PINs automatically from now on.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

enableSelfServiceForAll();
