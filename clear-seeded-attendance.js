const mongoose = require('mongoose');
require('dotenv').config();

const Attendance = require('./server/models/Attendance');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function clearSeededAttendance() {
  try {
    console.log('🔍 Checking for seeded attendance records...');
    
    // Count records with source 'MANUAL' (from seed script)
    const count = await Attendance.countDocuments({ source: 'MANUAL' });
    
    if (count === 0) {
      console.log('✅ No seeded attendance records found.');
      process.exit(0);
    }
    
    console.log(`📋 Found ${count} seeded attendance records (source: MANUAL)`);
    console.log('⚠️  WARNING: About to delete these records!');
    console.log('⚠️  This action cannot be undone!\n');
    
    // Delete all seeded attendance records
    const result = await Attendance.deleteMany({ source: 'MANUAL' });
    
    console.log(`\n✅ Successfully deleted ${result.deletedCount} seeded attendance records`);
    
    // Verify deletion
    const remainingCount = await Attendance.countDocuments({ source: 'MANUAL' });
    console.log(`✅ Verification: ${remainingCount} seeded records remaining\n`);
    
    // Show what's left
    const totalRemaining = await Attendance.countDocuments({});
    console.log(`📊 Total attendance records remaining in database: ${totalRemaining}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

clearSeededAttendance();
