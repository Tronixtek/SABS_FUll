const mongoose = require('mongoose');

// Connect to MongoDB
async function fixAttendanceIndex() {
  try {
    // Connect to your MongoDB database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-tracking');
    
    const db = mongoose.connection.db;
    const collection = db.collection('attendances');
    
    console.log('🔄 Checking existing indexes...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));
    
    // Drop the old unique index
    try {
      await collection.dropIndex({ employee: 1, date: 1 });
      console.log('✅ Dropped old unique index (employee_1_date_1)');
    } catch (error) {
      console.log('ℹ️ Old index may not exist:', error.message);
    }
    
    // The new index will be created automatically when the server restarts
    console.log('✅ Index fix completed. Please restart your server to apply the new index.');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error fixing index:', error);
    process.exit(1);
  }
}

fixAttendanceIndex();