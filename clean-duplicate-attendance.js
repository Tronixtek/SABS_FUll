const mongoose = require('mongoose');
const Attendance = require('./server/models/Attendance');
require('dotenv').config();

const cleanDuplicates = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Delete records that don't have type or timestamp (old format)
    const result = await Attendance.deleteMany({
      date: { $gte: today, $lt: tomorrow },
      $or: [
        { type: { $exists: false } },
        { timestamp: { $exists: false } }
      ]
    });

    console.log(`✅ Deleted ${result.deletedCount} old attendance records`);

    // Check remaining records
    const remaining = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow }
    });

    console.log(`📊 Remaining records for today: ${remaining}`);

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

cleanDuplicates();
