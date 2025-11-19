const mongoose = require('mongoose');
const moment = require('moment');

// Define schemas inline since we might not have access to the models
const employeeSchema = new mongoose.Schema({
  employeeId: String,
  firstName: String,
  lastName: String,
  email: String,
  department: String,
  designation: String,
  facility: String,
  isActive: Boolean
});

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  employeeId: String,
  date: Date,
  timestamp: Date,
  type: String,
  status: String,
  lateArrival: Number,
  workHours: Number,
  overtime: Number,
  facility: String,
  deviceIP: String,
  xo5Data: Object
});

const Employee = mongoose.model('Employee', employeeSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);

async function debugVictorPunctuality() {
  try {
    await mongoose.connect('mongodb://localhost:27017/attendance-tracking');
    console.log('✅ Connected to MongoDB: attendance-tracking');

    // First, let's see what collections exist
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n=== DATABASE COLLECTIONS ===');
    collections.forEach(col => {
      console.log(`- ${col.name}`);
    });

    // Find all employees first to see what's in the database
    console.log('\n=== ALL EMPLOYEES ===');
    const allEmployees = await Employee.find({}).limit(20);
    console.log('Total employees found:', allEmployees.length);
    
    allEmployees.forEach(emp => {
      console.log(`- ${emp.firstName || 'N/A'} ${emp.lastName || 'N/A'} (ID: ${emp.employeeId || 'N/A'}, MongoDB ID: ${emp._id})`);
    });

    // Find Victor Francis with multiple search strategies
    console.log('\n=== SEARCHING FOR VICTOR FRANCIS ===');
    
    let victor = null;
    
    // Strategy 2: Employee ID search (from screenshot) - CHECK THIS ONE FIRST
    console.log('Searching for specific Victor Francis with ID EMP00112...');
    victor = await Employee.findOne({ employeeId: 'EMP00112' });

    if (!victor) {
      // Strategy 1: Name-based search
      victor = await Employee.findOne({
        $or: [
          { firstName: /victor/i, lastName: /francis/i },
          { firstName: /francis/i, lastName: /victor/i }
        ]
      });
    }

    if (!victor) {
      // Strategy 3: Partial name matches
      console.log('Trying partial name searches...');
      const partialMatches = await Employee.find({
        $or: [
          { firstName: /victor/i },
          { lastName: /francis/i },
          { firstName: /francis/i },
          { lastName: /victor/i }
        ]
      });
      
      console.log('Partial name matches:', partialMatches.length);
      partialMatches.forEach(emp => {
        console.log(`  - ${emp.firstName} ${emp.lastName} (ID: ${emp.employeeId})`);
      });
      
      victor = partialMatches.length > 0 ? partialMatches[0] : null;
    }

    if (!victor) {
      console.log('❌ Victor Francis not found in any search strategy');
      console.log('📋 Please check one of the employees above and update the search criteria');
      return;
    }

    console.log('\n=== VICTOR FRANCIS FOUND ===');
    console.log('Employee ID:', victor.employeeId);
    console.log('Name:', victor.firstName, victor.lastName);
    console.log('MongoDB _id:', victor._id);
    console.log('Department:', victor.department);
    console.log('Active:', victor.isActive);

    // Get all attendance records for Victor
    console.log('\n=== ATTENDANCE RECORDS FOR VICTOR ===');
    const attendanceRecords = await Attendance.find({ 
      employee: victor._id 
    }).sort({ date: 1, timestamp: 1 });

    console.log('Total attendance records found:', attendanceRecords.length);
    
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
    console.log('\n=== ANALYTICS AGGREGATION SIMULATION ===');
    
    const start = moment().startOf('month').toDate();
    const end = moment().endOf('month').toDate();
    
    console.log('Date range:', start.toDateString(), 'to', end.toDateString());
    
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
      console.log('Present Days:', metrics.presentDays, '(includes late days)');
      console.log('Late Days:', metrics.lateDays);
      console.log('Absent Days:', metrics.absentDays);
      console.log('Attendance Rate:', metrics.attendanceRate + '%');
      console.log('Punctuality Score:', metrics.punctualityScore + '%');
      
      console.log('\n=== PUNCTUALITY CALCULATION ANALYSIS ===');
      const manualPunctuality = 100 - ((metrics.lateDays / metrics.totalDays) * 100);
      console.log('Current formula: 100 - ((lateDays / totalDays) * 100)');
      console.log('Calculation: 100 - ((' + metrics.lateDays + ' / ' + metrics.totalDays + ') * 100) = ' + manualPunctuality + '%');
      
      // Alternative calculation (true on-time rate)
      const onTimeDays = metrics.presentDays - metrics.lateDays;
      const trueOnTimeRate = metrics.totalDays > 0 ? (onTimeDays / metrics.totalDays) * 100 : 0;
      console.log('\nAlternative (true on-time): (onTimeDays / totalDays) * 100');
      console.log('Calculation: ((' + metrics.presentDays + ' - ' + metrics.lateDays + ') / ' + metrics.totalDays + ') * 100 = ' + trueOnTimeRate + '%');
      
      // Check if this matches the 50% we're seeing
      if (metrics.punctualityScore === 50) {
        console.log('\n🎯 FOUND THE 50% ISSUE!');
        console.log('The calculated punctuality score matches the 50% we see in the UI');
      } else {
        console.log('\n🤔 Punctuality score is ' + metrics.punctualityScore + '%, not 50%');
        console.log('This suggests the 50% might be calculated elsewhere or with different data');
      }
      
    } else {
      console.log('❌ No aggregation results found for the current month');
      
      // Try all-time search
      console.log('\n=== TRYING ALL-TIME AGGREGATION ===');
      const allTimeResult = await Attendance.aggregate([
        { $match: { employee: victor._id } },
        {
          $group: {
            _id: '$employee',
            totalDays: { $sum: 1 },
            presentDays: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
            lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } }
          }
        }
      ]);
      
      console.log('All-time aggregation:', JSON.stringify(allTimeResult, null, 2));
    }

    // Check for duplicate records on same date
    console.log('\n=== CHECKING FOR DUPLICATE RECORDS ===');
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
        console.log(`⚠️  Multiple records found on ${date}:`, records.length, 'records');
        records.forEach((record, idx) => {
          console.log(`   ${idx + 1}: Type: ${record.type}, Status: ${record.status}, Time: ${record.timestamp?.toLocaleTimeString()}`);
        });
      } else {
        console.log(`✅ Single record on ${date}: ${records[0].status}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugVictorPunctuality();