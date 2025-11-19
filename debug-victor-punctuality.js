const mongoose = require('mongoose');
const Attendance = require('./server/models/Attendance');
const Employee = require('./server/models/Employee');
const moment = require('moment');

async function debugVictorPunctuality() {
  try {
    await mongoose.connect('mongodb://localhost:27017/attendance_db');
    console.log('Connected to MongoDB');

    // Find all employees first
    console.log('Listing all employees...');
    const allEmployees = await Employee.find({}).limit(10);
    console.log('Total employees found:', allEmployees.length);
    
    allEmployees.forEach(emp => {
      console.log(`- ${emp.firstName} ${emp.lastName} (ID: ${emp.employeeId}, MongoDB ID: ${emp._id})`);
    });

    // Find Victor Francis - try different search patterns
    console.log('\nSearching for Victor Francis...');
    
    let victor = await Employee.findOne({
      $or: [
        { firstName: /victor/i, lastName: /francis/i },
        { firstName: /francis/i, lastName: /victor/i }
      ]
    });

    if (!victor) {
      // Try specific employee ID we saw in the screenshot
      console.log('Trying search by employee ID EMP00112...');
      victor = await Employee.findOne({ employeeId: 'EMP00112' });
    }

    if (!victor) {
      // Try broader search
      console.log('Trying broader search...');
      const matches = await Employee.find({
        $or: [
          { firstName: /victor/i },
          { lastName: /francis/i }
        ]
      });
      
      console.log('Found employees matching search:', matches.length);
      matches.forEach(emp => {
        console.log(`- ${emp.firstName} ${emp.lastName} (ID: ${emp.employeeId})`);
      });
      
      victor = matches[0]; // Take the first match
    }

    if (!victor) {
      console.log('❌ Victor Francis not found');
      return;
    }

    console.log('\n=== VICTOR FRANCIS DEBUG ===');
    console.log('Employee ID:', victor.employeeId);
    console.log('Name:', victor.firstName, victor.lastName);
    console.log('MongoDB _id:', victor._id);

    // Get all attendance records for Victor
    const attendanceRecords = await Attendance.find({ 
      employee: victor._id 
    }).sort({ date: 1, timestamp: 1 });

    console.log('\n=== RAW ATTENDANCE RECORDS ===');
    console.log('Total raw records found:', attendanceRecords.length);
    
    attendanceRecords.forEach((record, index) => {
      console.log(`\nRecord ${index + 1}:`);
      console.log('  Date:', record.date?.toDateString());
      console.log('  Type:', record.type);
      console.log('  Status:', record.status);
      console.log('  Timestamp:', record.timestamp?.toLocaleString());
      console.log('  Late Minutes:', record.lateArrival || 0);
      console.log('  Work Hours:', record.workHours || 0);
      console.log('  Overtime:', record.overtime || 0);
    });

    // Test the exact MongoDB aggregation used in analytics
    console.log('\n=== MONGODB AGGREGATION SIMULATION ===');
    
    const start = moment().startOf('month').toDate();
    const end = moment().endOf('month').toDate();
    
    const aggResult = await Attendance.aggregate([
      { 
        $match: { 
          employee: victor._id,
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$employee',
          totalDays: { $sum: 1 },
          presentDays: {
            $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] }
          },
          absentDays: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
          },
          lateDays: {
            $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
          },
          totalWorkHours: { $sum: '$workHours' },
          totalOvertime: { $sum: '$overtime' },
          totalLateMinutes: { $sum: '$lateArrival' }
        }
      },
      {
        $project: {
          totalDays: 1,
          presentDays: 1,
          absentDays: 1,
          lateDays: 1,
          totalWorkHours: 1,
          totalOvertime: 1,
          totalLateMinutes: 1,
          attendanceRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$presentDays', '$totalDays'] },
                  100
                ]
              },
              2
            ]
          },
          punctualityScore: {
            $round: [
              {
                $subtract: [
                  100,
                  {
                    $multiply: [
                      { $divide: ['$lateDays', '$totalDays'] },
                      100
                    ]
                  }
                ]
              },
              2
            ]
          }
        }
      }
    ]);

    console.log('Aggregation result:', JSON.stringify(aggResult, null, 2));

    if (aggResult.length > 0) {
      const metrics = aggResult[0];
      console.log('\n=== CALCULATED METRICS ===');
      console.log('Total Days:', metrics.totalDays);
      console.log('Present Days:', metrics.presentDays);
      console.log('Late Days:', metrics.lateDays);
      console.log('Absent Days:', metrics.absentDays);
      console.log('Attendance Rate:', metrics.attendanceRate + '%');
      console.log('Punctuality Score:', metrics.punctualityScore + '%');
      
      console.log('\n=== MANUAL CALCULATION VERIFICATION ===');
      const manualPunctuality = 100 - ((metrics.lateDays / metrics.totalDays) * 100);
      console.log('Manual calculation: 100 - ((' + metrics.lateDays + ' / ' + metrics.totalDays + ') * 100) =', manualPunctuality + '%');
      
      const alternativeCalc = metrics.totalDays > 0 ? (metrics.presentDays - metrics.lateDays) / metrics.totalDays * 100 : 0;
      console.log('Alternative (true on-time): ((' + metrics.presentDays + ' - ' + metrics.lateDays + ') / ' + metrics.totalDays + ') * 100 =', alternativeCalc + '%');
    }

    // Also check for any duplicate or overlapping records
    console.log('\n=== CHECKING FOR DUPLICATES ===');
    const dateGroups = {};
    attendanceRecords.forEach(record => {
      const dateKey = moment(record.date).format('YYYY-MM-DD');
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = [];
      }
      dateGroups[dateKey].push(record);
    });

    Object.keys(dateGroups).forEach(date => {
      const records = dateGroups[date];
      if (records.length > 1) {
        console.log(`⚠️  Multiple records on ${date}:`, records.length);
        records.forEach((record, idx) => {
          console.log(`   ${idx + 1}: Type: ${record.type}, Status: ${record.status}, Time: ${record.timestamp?.toLocaleTimeString()}`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugVictorPunctuality();