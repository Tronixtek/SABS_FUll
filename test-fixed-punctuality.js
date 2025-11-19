const mongoose = require('mongoose');
const moment = require('moment');

// Define schemas
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

async function testFixedPunctuality() {
  try {
    await mongoose.connect('mongodb://localhost:27017/attendance-tracking');
    console.log('✅ Connected to MongoDB: attendance-tracking');

    // Find Victor Francis EMP00112
    const victor = await Employee.findOne({ employeeId: 'EMP00112' });
    
    if (!victor) {
      console.log('❌ Victor Francis EMP00112 not found');
      return;
    }

    console.log('\n=== VICTOR FRANCIS EMP00112 ===');
    console.log('Name:', victor.firstName, victor.lastName);
    console.log('MongoDB _id:', victor._id);

    // Get raw attendance records
    const attendanceRecords = await Attendance.find({ 
      employee: victor._id 
    }).sort({ date: 1, timestamp: 1 });

    console.log('\n=== RAW ATTENDANCE RECORDS ===');
    attendanceRecords.forEach((record, index) => {
      console.log(`Record ${index + 1}: ${record.date?.toDateString()} - ${record.type} - ${record.status} - ${record.timestamp?.toLocaleTimeString()}`);
    });

    // Test the FIXED aggregation pipeline
    console.log('\n=== TESTING FIXED AGGREGATION ===');
    
    const start = moment().startOf('month').toDate();
    const end = moment().endOf('month').toDate();
    
    const matchFilter = {
      date: { $gte: start, $lte: end }
    };

    const fixedAggResult = await Attendance.aggregate([
      { $match: { ...matchFilter, employee: victor._id } },
      {
        // First, group by employee and date to get one record per day
        $group: {
          _id: {
            employee: '$employee',
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date'
              }
            }
          },
          // Determine the day's status: late if any check-in was late, otherwise present if any record exists
          dayStatus: {
            $first: {
              $cond: [
                { $eq: ['$status', 'late'] },
                'late',
                { $cond: [
                  { $eq: ['$status', 'absent'] },
                  'absent',
                  'present'
                ]}
              ]
            }
          },
          hasLateRecord: {
            $max: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
          },
          hasAbsentRecord: {
            $max: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
          },
          hasPresentRecord: {
            $max: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] }
          },
          totalWorkHours: { $sum: '$workHours' },
          totalOvertime: { $sum: '$overtime' },
          totalLateMinutes: { $sum: '$lateArrival' }
        }
      },
      {
        // Then group by employee to get final metrics
        $group: {
          _id: '$_id.employee',
          totalDays: { $sum: 1 }, // Now this counts actual days, not records
          presentDays: {
            $sum: '$hasPresentRecord'
          },
          absentDays: {
            $sum: '$hasAbsentRecord'
          },
          lateDays: {
            $sum: '$hasLateRecord'
          },
          totalWorkHours: { $sum: '$totalWorkHours' },
          totalOvertime: { $sum: '$totalOvertime' },
          totalLateMinutes: { $sum: '$totalLateMinutes' }
        }
      },
      {
        $project: {
          totalDays: 1,
          presentDays: 1,
          absentDays: 1,
          lateDays: 1,
          totalWorkHours: { $round: ['$totalWorkHours', 2] },
          totalOvertime: { $round: ['$totalOvertime', 2] },
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
                $cond: [
                  { $gt: ['$presentDays', 0] },
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $subtract: ['$presentDays', '$lateDays'] },
                          '$presentDays'
                        ]
                      },
                      100
                    ]
                  },
                  100
                ]
              },
              2
            ]
          }
        }
      }
    ]);

    console.log('Fixed aggregation result:', JSON.stringify(fixedAggResult, null, 2));

    if (fixedAggResult.length > 0) {
      const metrics = fixedAggResult[0];
      console.log('\n=== FIXED METRICS ===');
      console.log('Total Days:', metrics.totalDays, '(should be 1 - one actual day)');
      console.log('Present Days:', metrics.presentDays);
      console.log('Late Days:', metrics.lateDays);
      console.log('Absent Days:', metrics.absentDays);
      console.log('Attendance Rate:', metrics.attendanceRate + '%');
      console.log('Punctuality Score:', metrics.punctualityScore + '%');
      
      console.log('\n=== PUNCTUALITY EXPLANATION ===');
      const onTimeDays = metrics.presentDays - metrics.lateDays;
      console.log(`On-time days: ${metrics.presentDays} - ${metrics.lateDays} = ${onTimeDays}`);
      console.log(`Punctuality: (${onTimeDays} ÷ ${metrics.presentDays}) × 100 = ${metrics.punctualityScore}%`);
      
      if (metrics.punctualityScore === 0) {
        console.log('✅ FIXED! Victor now shows 0% punctuality (correct for being late on his only day)');
      } else {
        console.log('⚠️  Still showing ' + metrics.punctualityScore + '% - needs more investigation');
      }
    } else {
      console.log('❌ No results from fixed aggregation');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testFixedPunctuality();