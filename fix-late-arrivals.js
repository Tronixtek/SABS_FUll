const mongoose = require('mongoose');
const moment = require('moment');

// Connect to MongoDB and fix existing records
async function fixExistingAttendanceRecords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-tracking');
    
    const db = mongoose.connection.db;
    const attendance = db.collection('attendances');
    
    console.log('🔄 Finding records with missing lateArrival calculations...');
    
    // Find all check-in records marked as 'late' but with no lateArrival value
    const lateRecords = await attendance.find({
      type: 'check-in',
      status: 'late',
      $or: [
        { lateArrival: { $exists: false } },
        { lateArrival: 0 },
        { lateArrival: null }
      ]
    }).toArray();
    
    console.log(`Found ${lateRecords.length} late records to fix`);
    
    for (const record of lateRecords) {
      if (record.scheduledCheckIn && record.timestamp) {
        const scheduledTime = moment(record.scheduledCheckIn);
        const actualTime = moment(record.timestamp);
        
        if (actualTime.isAfter(scheduledTime)) {
          const lateMinutes = actualTime.diff(scheduledTime, 'minutes');
          
          await attendance.updateOne(
            { _id: record._id },
            { 
              $set: { 
                lateArrival: lateMinutes,
                status: lateMinutes > 0 ? 'late' : 'present'
              } 
            }
          );
          
          console.log(`✅ Fixed record for employee ${record.employeeId}: ${lateMinutes} minutes late`);
        }
      }
    }
    
    console.log('✅ All existing records fixed!');
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error fixing records:', error);
    process.exit(1);
  }
}

fixExistingAttendanceRecords();