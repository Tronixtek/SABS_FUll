const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const moment = require('moment');

// @desc    Generate daily attendance report
// @route   GET /api/reports/daily
// @access  Private
exports.getDailyReport = async (req, res) => {
  try {
    const { date, facility } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    
    const matchFilter = {
      date: moment(reportDate).startOf('day').toDate()
    };
    
    if (facility) {
      matchFilter.facility = facility;
    }
    
    const attendanceRecords = await Attendance.find(matchFilter)
      .populate('employee', 'employeeId firstName lastName department designation')
      .populate('facility', 'name code')
      .populate('shift', 'name startTime endTime')
      .sort({ 'employee.employeeId': 1 });
    
    // Get all employees to check who didn't punch
    const allEmployees = await Employee.find({
      ...(facility ? { facility } : {}),
      status: 'active'
    });
    
    const attendedEmployeeIds = attendanceRecords.map(a => a.employee._id.toString());
    const absentEmployees = allEmployees.filter(
      e => !attendedEmployeeIds.includes(e._id.toString())
    );
    
    res.json({
      success: true,
      data: {
        date: reportDate,
        totalEmployees: allEmployees.length,
        present: attendanceRecords.filter(a => a.status === 'present').length,
        absent: absentEmployees.length,
        late: attendanceRecords.filter(a => a.status === 'late').length,
        halfDay: attendanceRecords.filter(a => a.status === 'half-day').length,
        records: attendanceRecords,
        absentEmployees
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Generate monthly attendance report
// @route   GET /api/reports/monthly
// @access  Private
exports.getMonthlyReport = async (req, res) => {
  try {
    const { month, year, facility, employeeId } = req.query;
    
    const reportMonth = month || moment().month() + 1;
    const reportYear = year || moment().year();
    
    const startDate = moment(`${reportYear}-${reportMonth}-01`).startOf('month').toDate();
    const endDate = moment(`${reportYear}-${reportMonth}-01`).endOf('month').toDate();
    
    const matchFilter = {
      date: { $gte: startDate, $lte: endDate }
    };
    
    if (facility) matchFilter.facility = facility;
    if (employeeId) matchFilter.employee = employeeId;
    
    const attendanceData = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$employee',
          totalDays: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] }
          },
          absent: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
          },
          late: {
            $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
          },
          halfDay: {
            $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] }
          },
          onLeave: {
            $sum: { $cond: [{ $eq: ['$status', 'on-leave'] }, 1, 0] }
          },
          totalWorkHours: { $sum: '$workHours' },
          totalOvertime: { $sum: '$overtime' },
          totalLateMinutes: { $sum: '$lateArrival' }
        }
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $unwind: '$employee'
      },
      {
        $lookup: {
          from: 'facilities',
          localField: 'employee.facility',
          foreignField: '_id',
          as: 'facility'
        }
      },
      {
        $unwind: '$facility'
      },
      {
        $project: {
          employee: {
            _id: 1,
            employeeId: 1,
            firstName: 1,
            lastName: 1,
            department: 1,
            designation: 1
          },
          facility: {
            name: 1,
            code: 1
          },
          attendance: {
            totalDays: 1,
            present: 1,
            absent: 1,
            late: 1,
            halfDay: 1,
            onLeave: 1,
            totalWorkHours: { $round: ['$totalWorkHours', 2] },
            totalOvertime: { $round: ['$totalOvertime', 2] },
            totalLateMinutes: 1,
            attendancePercentage: {
              $round: [
                {
                  $multiply: [
                    { $divide: ['$present', '$totalDays'] },
                    100
                  ]
                },
                2
              ]
            }
          }
        }
      },
      {
        $sort: { 'employee.employeeId': 1 }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        month: reportMonth,
        year: reportYear,
        period: `${moment(`${reportYear}-${reportMonth}-01`).format('MMMM YYYY')}`,
        totalEmployees: attendanceData.length,
        records: attendanceData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Generate custom report
// @route   GET /api/reports/custom
// @access  Private
exports.getCustomReport = async (req, res) => {
  try {
    const { startDate, endDate, facility, department, status } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const matchFilter = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    if (facility) matchFilter.facility = facility;
    if (status) matchFilter.status = status;
    
    const pipeline = [
      { $match: matchFilter },
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $unwind: '$employee'
      }
    ];
    
    // Add department filter if provided
    if (department) {
      pipeline.push({
        $match: { 'employee.department': department }
      });
    }
    
    pipeline.push(
      {
        $lookup: {
          from: 'facilities',
          localField: 'facility',
          foreignField: '_id',
          as: 'facility'
        }
      },
      {
        $unwind: '$facility'
      },
      {
        $lookup: {
          from: 'shifts',
          localField: 'shift',
          foreignField: '_id',
          as: 'shift'
        }
      },
      {
        $unwind: '$shift'
      },
      {
        $sort: { date: -1 }
      }
    );
    
    const records = await Attendance.aggregate(pipeline);
    
    // Calculate summary statistics
    const summary = {
      totalRecords: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      halfDay: records.filter(r => r.status === 'half-day').length,
      onLeave: records.filter(r => r.status === 'on-leave').length,
      totalWorkHours: records.reduce((sum, r) => sum + (r.workHours || 0), 0),
      totalOvertime: records.reduce((sum, r) => sum + (r.overtime || 0), 0)
    };
    
    res.json({
      success: true,
      data: {
        dateRange: { startDate, endDate },
        summary,
        records
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
