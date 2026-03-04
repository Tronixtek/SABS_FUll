/**
 * Check what months have attendance data
 */

require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const moment = require('moment');
const Attendance = require('./server/models/Attendance');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
  checkDataMonths();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function checkDataMonths() {
  try {
    // Get date range of all attendance records
    const stats = await Attendance.aggregate([
      {
        $group: {
          _id: null,
          minDate: { $min: '$date' },
          maxDate: { $max: '$date' },
          totalRecords: { $sum: 1 }
        }
      }
    ]);

    if (stats.length === 0) {
      console.log('❌ No attendance records found in database');
      process.exit(0);
    }

    console.log('\n📊 Database Overview:');
    console.log(`Total records: ${stats[0].totalRecords.toLocaleString()}`);
    console.log(`Date range: ${moment(stats[0].minDate).format('YYYY-MM-DD')} to ${moment(stats[0].maxDate).format('YYYY-MM-DD')}`);

    // Get monthly breakdown
    const monthlyStats = await Attendance.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          count: { $sum: 1 },
          minDate: { $min: '$date' },
          maxDate: { $max: '$date' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    console.log('\n📅 Monthly Breakdown:');
    monthlyStats.forEach(month => {
      const monthName = moment(`${month._id.year}-${month._id.month}-01`).format('MMMM YYYY');
      console.log(`  ${monthName}: ${month.count.toLocaleString()} records`);
    });

    // Use the latest month with data for debugging
    if (monthlyStats.length > 0) {
      const latestMonth = monthlyStats[0];
      console.log(`\n🔍 Let's debug the latest month: ${moment(`${latestMonth._id.year}-${latestMonth._id.month}-01`).format('MMMM YYYY')}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}
