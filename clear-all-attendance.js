const path = require('path');
const fs = require('fs');

// Try to load .env from server directory if it exists
const envPath = path.join(__dirname, 'server', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  date: Date,
  type: String,
  timestamp: Date,
  status: String
}, { collection: 'attendances' });

const Attendance = mongoose.model('Attendance', attendanceSchema);

async function clearAllAttendance() {
  try {
    // Use environment variable or default to localhost
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-tracking';
    
    console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');
    
    // Get the database name from the connection
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📊 Database: ${dbName}\n`);

    // Count current records
    const count = await Attendance.countDocuments({});
    console.log(`📋 Found ${count} attendance records\n`);

    if (count === 0) {
      console.log('✅ No records to delete');
    } else {
      console.log('🗑️  Deleting all attendance records...\n');
      
      // Delete all attendance records
      const result = await Attendance.deleteMany({});
      
      console.log(`✅ Deleted ${result.deletedCount} attendance records\n`);
      
      // Verify deletion
      const remaining = await Attendance.countDocuments({});
      console.log(`Verification: ${remaining} records remaining`);
      
      if (remaining === 0) {
        console.log('✅ All attendance records cleared successfully!');
      } else {
        console.log('⚠️  Some records may still exist');
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearAllAttendance();
