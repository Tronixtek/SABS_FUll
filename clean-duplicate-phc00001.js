const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('./server/models/Employee');
const Attendance = require('./server/models/Attendance');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function cleanDuplicatePHC00001() {
  try {
    console.log('🔍 Finding all employees with PHC00001...');
    
    // Find all employees with employeeId PHC00001
    const duplicates = await Employee.find({ employeeId: 'PHC00001' });
    
    console.log(`\n📋 Found ${duplicates.length} employees with PHC00001:`);
    duplicates.forEach(emp => {
      console.log(`   - ${emp.firstName} ${emp.lastName} (${emp.employeeId}) - ${emp.department} - ID: ${emp._id}`);
    });
    
    // Find Hassan Abdullahi (keep this one)
    const hassan = duplicates.find(emp => 
      emp.firstName.toLowerCase() === 'hassan' && 
      emp.lastName.toLowerCase() === 'abdullahi'
    );
    
    if (!hassan) {
      console.log('\n❌ Hassan Abdullahi not found! Cannot proceed.');
      process.exit(1);
    }
    
    console.log(`\n✅ Will keep: ${hassan.firstName} ${hassan.lastName} (ID: ${hassan._id})`);
    
    // Get list of employees to delete (all except Hassan)
    const toDelete = duplicates.filter(emp => emp._id.toString() !== hassan._id.toString());
    
    if (toDelete.length === 0) {
      console.log('\n✅ No duplicate employees to delete.');
      process.exit(0);
    }
    
    console.log(`\n⚠️  Will DELETE the following employees:`);
    toDelete.forEach(emp => {
      console.log(`   ❌ ${emp.firstName} ${emp.lastName} (${emp.employeeId}) - ${emp.department}`);
    });
    
    const employeeIdsToDelete = toDelete.map(emp => emp._id);
    
    // Delete attendance records for these employees
    console.log(`\n🗑️  Deleting attendance records for duplicate employees...`);
    const attendanceResult = await Attendance.deleteMany({ 
      employee: { $in: employeeIdsToDelete } 
    });
    console.log(`   Deleted ${attendanceResult.deletedCount} attendance records`);
    
    // Delete the duplicate employees
    console.log(`\n🗑️  Deleting duplicate employee records...`);
    const employeeResult = await Employee.deleteMany({ 
      _id: { $in: employeeIdsToDelete } 
    });
    console.log(`   Deleted ${employeeResult.deletedCount} employee records`);
    
    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Kept: Hassan Abdullahi (PHC00001)`);
    console.log(`   Deleted: ${employeeResult.deletedCount} duplicate employees`);
    console.log(`   Deleted: ${attendanceResult.deletedCount} attendance records`);
    
    // Verify
    const remaining = await Employee.countDocuments({ employeeId: 'PHC00001' });
    console.log(`\n📊 Verification: ${remaining} employee(s) with PHC00001 remaining`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

cleanDuplicatePHC00001();
