const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Facility = require('../models/Facility');
const moment = require('moment');

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const { facility, startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : moment().startOf('month').toDate();
    const end = endDate ? new Date(endDate) : moment().endOf('month').toDate();
    const today = moment().startOf('day').toDate();
    
    const facilityFilter = {};
    if (facility) {
      facilityFilter.facility = facility;
    } else if (req.user.role !== 'super-admin' && req.user.facilities.length > 0) {
      facilityFilter.facility = { $in: req.user.facilities };
    }
    
    // Total employees
    const totalEmployees = await Employee.countDocuments({
      ...facilityFilter,
      status: 'active'
    });
    
    // Total facilities
    const totalFacilities = await Facility.countDocuments({ status: 'active' });
    
    // Today's attendance
    const todayAttendance = await Attendance.aggregate([
      {
        $match: {
          ...facilityFilter,
          date: today
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Month's attendance summary
    const monthAttendance = await Attendance.aggregate([
      {
        $match: {
          ...facilityFilter,
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalWorkHours: { $sum: '$workHours' },
          totalOvertime: { $sum: '$overtime' }
        }
      }
    ]);
    
    // Attendance trend (last 7 days)
    const last7Days = moment().subtract(7, 'days').startOf('day').toDate();
    const attendanceTrend = await Attendance.aggregate([
      {
        $match: {
          ...facilityFilter,
          date: { $gte: last7Days, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);
    
    // Top late comers
    const topLateComers = await Attendance.aggregate([
      {
        $match: {
          ...facilityFilter,
          date: { $gte: start, $lte: end },
          status: 'late'
        }
      },
      {
        $group: {
          _id: '$employee',
          lateCount: { $sum: 1 },
          totalLateMinutes: { $sum: '$lateArrival' }
        }
      },
      {
        $sort: { lateCount: -1 }
      },
      {
        $limit: 5
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
        $project: {
          employee: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            employeeId: 1
          },
          lateCount: 1,
          totalLateMinutes: 1,
          avgLateMinutes: { $divide: ['$totalLateMinutes', '$lateCount'] }
        }
      }
    ]);
    
    // Facility-wise attendance
    const facilityWiseAttendance = await Attendance.aggregate([
      {
        $match: {
          ...facilityFilter,
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$facility',
          present: {
            $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] }
          },
          absent: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
          },
          totalWorkHours: { $sum: '$workHours' }
        }
      },
      {
        $lookup: {
          from: 'facilities',
          localField: '_id',
          foreignField: '_id',
          as: 'facility'
        }
      },
      {
        $unwind: '$facility'
      },
      {
        $project: {
          facility: {
            _id: 1,
            name: 1,
            code: 1
          },
          present: 1,
          absent: 1,
          totalWorkHours: 1,
          attendanceRate: {
            $multiply: [
              { $divide: ['$present', { $add: ['$present', '$absent'] }] },
              100
            ]
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        summary: {
          totalEmployees,
          totalFacilities,
          todayPresent: todayAttendance.find(a => a._id === 'present')?.count || 0,
          todayAbsent: todayAttendance.find(a => a._id === 'absent')?.count || 0,
          todayLate: todayAttendance.find(a => a._id === 'late')?.count || 0
        },
        monthAttendance,
        attendanceTrend,
        topLateComers,
        facilityWiseAttendance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get employee performance report
// @route   GET /api/analytics/employee-performance
// @access  Private
exports.getEmployeePerformance = async (req, res) => {
  try {
    const { facility, startDate, endDate, limit = 10 } = req.query;
    
    const start = startDate ? new Date(startDate) : moment().startOf('month').toDate();
    const end = endDate ? new Date(endDate) : moment().endOf('month').toDate();
    
    const matchFilter = {
      date: { $gte: start, $lte: end }
    };
    
    if (facility) {
      matchFilter.facility = facility;
    }
    
    const performance = await Attendance.aggregate([
      { $match: matchFilter },
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
        $project: {
          employee: {
            _id: 1,
            employeeId: 1,
            firstName: 1,
            lastName: 1,
            department: 1,
            designation: 1
          },
          metrics: {
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
      },
      {
        $sort: { 'metrics.attendanceRate': -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);
    
    res.json({
      success: true,
      data: performance,
      dateRange: { start, end }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get overtime report
// @route   GET /api/analytics/overtime
// @access  Private
exports.getOvertimeReport = async (req, res) => {
  try {
    const { facility, startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : moment().startOf('month').toDate();
    const end = endDate ? new Date(endDate) : moment().endOf('month').toDate();
    
    const matchFilter = {
      date: { $gte: start, $lte: end },
      overtime: { $gt: 0 }
    };
    
    if (facility) {
      matchFilter.facility = facility;
    }
    
    const overtimeData = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            employee: '$employee',
            facility: '$facility'
          },
          totalOvertime: { $sum: '$overtime' },
          overtimeDays: { $sum: 1 },
          avgOvertimePerDay: { $avg: '$overtime' }
        }
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id.employee',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $lookup: {
          from: 'facilities',
          localField: '_id.facility',
          foreignField: '_id',
          as: 'facility'
        }
      },
      {
        $unwind: '$employee'
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
            lastName: 1
          },
          facility: {
            _id: 1,
            name: 1,
            code: 1
          },
          totalOvertime: { $round: ['$totalOvertime', 2] },
          overtimeDays: 1,
          avgOvertimePerDay: { $round: ['$avgOvertimePerDay', 2] }
        }
      },
      {
        $sort: { totalOvertime: -1 }
      }
    ]);
    
    res.json({
      success: true,
      data: overtimeData,
      dateRange: { start, end }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
