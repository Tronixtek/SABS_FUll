const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Attendance = require('./server/models/Attendance');
const Facility = require('./server/models/Facility');

async function clearFacilityAttendance() {
  try {
    console.log('🔍 Finding facility...');
    
    // Find facility by code
    const facilityCode = '020E7096A03DC70367';
    const facility = await Facility.findOne({ code: facilityCode });
    
    if (!facility) {
      console.log('❌ Facility not found with code:', facilityCode);
      process.exit(1);
    }
    
    console.log(`✅ Found facility: ${facility.name} (${facility.code})`);
    console.log(`📊 Facility ID: ${facility._id}`);
    
    // Count attendance records before deletion
    const count = await Attendance.countDocuments({ facility: facility._id });
    console.log(`\n📋 Total attendance records for this facility: ${count}`);
    
    if (count === 0) {
      console.log('✅ No attendance records to delete.');
      process.exit(0);
    }
    
    // Ask for confirmation (in real scenario, you'd use readline, but for script execution this is fine)
    console.log(`\n⚠️  WARNING: About to delete ${count} attendance records for ${facility.name}`);
    console.log('⚠️  This action cannot be undone!\n');
    
    // Delete all attendance records for this facility
    const result = await Attendance.deleteMany({ facility: facility._id });
    
    console.log(`\n✅ Successfully deleted ${result.deletedCount} attendance records`);
    console.log(`📍 Facility: ${facility.name} (${facility.code})`);
    
    // Verify deletion
    const remainingCount = await Attendance.countDocuments({ facility: facility._id });
    console.log(`\n✅ Verification: ${remainingCount} attendance records remaining for this facility`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearFacilityAttendance();
