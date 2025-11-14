const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Facility = require('../models/Facility');
const moment = require('moment');

// Helper function to aggregate attendance records (same as other controllers)
const aggregateAttendanceRecords = (rawRecords) => {
  const attendanceMap = new Map();

  rawRecords.forEach(record => {
    // Skip records without employee data
    if (!record.employee || !record.employee._id || !record.date) {
      console.warn('⚠️ Skipping record without employee/date data:', record._id);
      return;
    }
    
    const dateKey = moment(record.date).format('YYYY-MM-DD');
    const key = `${record.employee._id.toString()}-${dateKey}`;
    
    if (!attendanceMap.has(key)) {
      attendanceMap.set(key, {
        _id: record._id,
        employee: record.employee,
        employeeId: record.employee.employeeId || record.employeeId,
        facility: record.facility,
        shift: record.shift,
        date: dateKey,
        status: 'present',
        checkIn: { time: null },
        checkOut: { time: null },
        workHours: 0,
        overtime: 0,
        undertime: 0,
        lateArrival: 0,
        isExcused: record.isExcused || false,
        excuseReason: record.excuseReason || null
      });
    }

    const attendanceItem = attendanceMap.get(key);
    
    if (record.type === 'check-in') {
      attendanceItem.checkIn = {
        time: record.timestamp,
        deviceId: record.deviceIP || record.xo5Data?.deviceKey,
        method: record.xo5Data?.verificationMethod?.[0] || 'face'
      };
      // Update status if this check-in is late
      if (record.status === 'late') {
        attendanceItem.status = 'late';
        attendanceItem.lateArrival = record.lateArrival || 0;
      } else if (record.status === 'excused') {
        attendanceItem.status = 'excused';
        attendanceItem.isExcused = true;
        attendanceItem.excuseReason = record.excuseReason;
      }
    } else if (record.type === 'check-out') {
      attendanceItem.checkOut = {
        time: record.timestamp,
        deviceId: record.deviceIP || record.xo5Data?.deviceKey,
        method: record.xo5Data?.verificationMethod?.[0] || 'face'
      };
    }
  });

  // Calculate work hours for records with both check-in and check-out
  for (const [key, attendanceItem] of attendanceMap) {
    if (attendanceItem.checkIn.time && attendanceItem.checkOut.time) {
      const workMinutes = moment(attendanceItem.checkOut.time).diff(moment(attendanceItem.checkIn.time), 'minutes');
      attendanceItem.workHours = Math.max(0, workMinutes / 60);
      
      // Calculate overtime/undertime
      const expectedHours = attendanceItem.shift?.workingHours || 8;
      if (attendanceItem.workHours > expectedHours) {
        attendanceItem.overtime = attendanceItem.workHours - expectedHours;
      } else if (attendanceItem.workHours < expectedHours - 1) {
        attendanceItem.undertime = expectedHours - attendanceItem.workHours;
      }
    } else if (!attendanceItem.checkOut.time && attendanceItem.checkIn.time) {
      // Only checked in, no checkout - mark as incomplete ONLY if not already late/excused
      if (attendanceItem.status === 'present') {
        attendanceItem.status = 'incomplete';
      }
      // If status is already 'late' or 'excused', preserve it
    }
  }

  return Array.from(attendanceMap.values());
};

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const { facility, startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : moment().startOf('month').toDate();
    const end = endDate ? new Date(endDate) : moment().endOf('month').toDate();
    const today = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    
    const facilityFilter = {};
    if (facility) {
      facilityFilter.facility = facility;
    } else if (req.user.role !== 'super-admin' && req.user.facilities.length > 0) {
      facilityFilter.facility = { $in: req.user.facilities };
    }
    
    console.log('📊 Analytics facility filter:', facilityFilter);
    console.log('📅 Analytics date range:', { start, end, today, todayEnd });
    
    // Total employees
    const totalEmployees = await Employee.countDocuments({
      ...facilityFilter,
      status: 'active'
    });
    
    console.log('👥 Total active employees:', totalEmployees);
    
    // Total facilities
    const totalFacilities = await Facility.countDocuments({ status: 'active' });
    
    // Today's attendance - get raw records and aggregate them
    const todayRawAttendance = await Attendance.find({
      ...facilityFilter,
      date: { $gte: today, $lte: todayEnd }
    })
    .populate('employee', 'employeeId firstName lastName')
    .populate('facility', 'name code');
    
    console.log('📋 Today raw attendance records:', todayRawAttendance.length);
    
    const todayAggregated = aggregateAttendanceRecords(todayRawAttendance);
    
    console.log('📊 Today aggregated records:', todayAggregated.length);
    
    // Count today's statuses
    const todayStats = {
      totalPresent: todayAggregated.filter(a => ['present', 'late', 'excused'].includes(a.status)).length, // All who showed up
      present: todayAggregated.filter(a => a.status === 'present').length, // On time only
      late: todayAggregated.filter(a => a.status === 'late').length,
      absent: 0, // Will calculate based on total employees
      excused: todayAggregated.filter(a => a.status === 'excused').length,
      incomplete: todayAggregated.filter(a => a.status === 'incomplete').length,
      totalWorkHours: Math.round(todayAggregated.reduce((sum, a) => sum + (a.workHours || 0), 0) * 100) / 100,
      totalOvertime: Math.round(todayAggregated.reduce((sum, a) => sum + (a.overtime || 0), 0) * 100) / 100
    };
    
    // Calculate absent (employees who haven't checked in at all)
    const attendedEmployeeIds = new Set(todayAggregated.map(a => a.employee._id.toString()));
    const allActiveEmployees = await Employee.find({
      ...facilityFilter,
      status: 'active'
    });
    
    todayStats.absent = allActiveEmployees.filter(emp => 
      !attendedEmployeeIds.has(emp._id.toString())
    ).length;
    
    // Calculate punctuality rate (on-time arrivals / total arrivals)
    const totalArrivals = todayStats.present + todayStats.late;
    const punctualityRate = totalArrivals > 0 
      ? Math.round((todayStats.present / totalArrivals) * 100)
      : 0;
    
    console.log('📈 Today stats:', todayStats);
    
    // Month's attendance - get raw records and aggregate them
    const monthRawAttendance = await Attendance.find({
      ...facilityFilter,
      date: { $gte: start, $lte: end }
    })
    .populate('employee', 'employeeId firstName lastName')
    .populate('facility', 'name code')
    .populate('shift', 'workingHours');
    
    console.log('📋 Month raw attendance records:', monthRawAttendance.length);
    
    const monthAggregated = aggregateAttendanceRecords(monthRawAttendance);
    
    console.log('📊 Month aggregated records:', monthAggregated.length);
    
    // Calculate month statistics
    const monthStats = {
      presentDays: monthAggregated.filter(a => ['present', 'late'].includes(a.status)).length,
      lateDays: monthAggregated.filter(a => a.status === 'late').length,
      absentDays: monthAggregated.filter(a => a.status === 'absent').length,
      totalWorkHours: Math.round(monthAggregated.reduce((sum, a) => sum + (a.workHours || 0), 0) * 100) / 100,
      totalOvertime: Math.round(monthAggregated.reduce((sum, a) => sum + (a.overtime || 0), 0) * 100) / 100
    };
    
    console.log('📈 Month stats:', monthStats);
    
    // Top performers (employees with highest attendance rate)
    const topPerformers = monthAggregated.reduce((acc, record) => {
      const empId = record.employee._id.toString();
      if (!acc[empId]) {
        acc[empId] = {
          employee: record.employee,
          totalDays: 0,
          presentDays: 0,
          lateCount: 0,
          totalWorkHours: 0
        };
      }
      acc[empId].totalDays++;
      if (['present', 'late'].includes(record.status)) {
        acc[empId].presentDays++;
      }
      if (record.status === 'late') {
        acc[empId].lateCount++;
      }
      acc[empId].totalWorkHours += record.workHours || 0;
      return acc;
    }, {});
    
    const topPerformersList = Object.values(topPerformers)
      .map(perf => ({
        ...perf,
        attendanceRate: perf.totalDays > 0 ? Math.round((perf.presentDays / perf.totalDays) * 100) : 0,
        totalWorkHours: Math.round(perf.totalWorkHours * 100) / 100
      }))
      .sort((a, b) => b.attendanceRate - a.attendanceRate)
      .slice(0, 5);
    
    console.log('🏆 Top performers:', topPerformersList.length);
    
    // Frequent late arrivals
    const frequentLateArrivals = monthAggregated
      .filter(record => record.status === 'late')
      .reduce((acc, record) => {
        const empId = record.employee._id.toString();
        if (!acc[empId]) {
          acc[empId] = {
            employee: record.employee,
            lateCount: 0,
            totalLateMinutes: 0
          };
        }
        acc[empId].lateCount++;
        acc[empId].totalLateMinutes += record.lateArrival || 0;
        return acc;
      }, {});
    
    const frequentLateArrivalsList = Object.values(frequentLateArrivals)
      .sort((a, b) => b.lateCount - a.lateCount)
      .slice(0, 5);
    
    console.log('⏰ Frequent late arrivals:', frequentLateArrivalsList.length);
    
    // Facility-wise performance
    const facilityWise = monthAggregated.reduce((acc, record) => {
      if (!record.facility) return acc;
      
      const facId = record.facility._id.toString();
      if (!acc[facId]) {
        acc[facId] = {
          facility: record.facility,
          totalRecords: 0,
          present: 0,
          late: 0,
          absent: 0,
          totalWorkHours: 0,
          attendanceRate: 0
        };
      }
      
      acc[facId].totalRecords++;
      if (['present', 'late'].includes(record.status)) {
        acc[facId].present++;
      }
      if (record.status === 'late') {
        acc[facId].late++;
      }
      if (record.status === 'absent') {
        acc[facId].absent++;
      }
      acc[facId].totalWorkHours += record.workHours || 0;
      
      return acc;
    }, {});
    
    const facilityWiseList = Object.values(facilityWise)
      .map(fac => ({
        ...fac,
        attendanceRate: fac.totalRecords > 0 
          ? Math.round((fac.present / fac.totalRecords) * 100) 
          : 0,
        totalWorkHours: Math.round(fac.totalWorkHours * 100) / 100
      }));
    
    console.log('🏢 Facility-wise performance:', facilityWiseList.length);
    
    // Generate 7-day attendance trend in Dashboard format
    const attendanceTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      const dayStart = moment().subtract(i, 'days').startOf('day').toDate();
      const dayEnd = moment().subtract(i, 'days').endOf('day').toDate();
      
      const dayAttendance = await Attendance.find({
        ...facilityFilter,
        date: { $gte: dayStart, $lte: dayEnd }
      }).populate('employee', 'employeeId firstName lastName');
      
      const dayAggregated = aggregateAttendanceRecords(dayAttendance);
      
      // Format for Dashboard charts: {_id: {date, status}, count}
      const presentCount = dayAggregated.filter(a => a.status === 'present').length;
      const lateCount = dayAggregated.filter(a => a.status === 'late').length;
      const absentCount = dayAggregated.filter(a => a.status === 'absent').length;
      
      if (presentCount > 0) {
        attendanceTrend.push({ _id: { date, status: 'present' }, count: presentCount });
      }
      if (lateCount > 0) {
        attendanceTrend.push({ _id: { date, status: 'late' }, count: lateCount });
      }
      if (absentCount > 0) {
        attendanceTrend.push({ _id: { date, status: 'absent' }, count: absentCount });
      }
    }
    
    console.log('📈 Dashboard attendance trend generated:', attendanceTrend.length, 'records');
    
    // Calculate attendance rate (total present including late / total employees)
    const attendanceRate = totalEmployees > 0 
      ? Math.round((todayStats.totalPresent / totalEmployees) * 100)
      : 0;
    
    res.json({
      success: true,
      data: {
        summary: {
          totalEmployees,
          totalFacilities,
          todayPresent: todayStats.totalPresent, // Total who showed up (including late)
          todayOnTime: todayStats.present, // Only on-time arrivals
          todayAbsent: todayStats.absent,
          todayLate: todayStats.late,
          todayExcused: todayStats.excused,
          todayIncomplete: todayStats.incomplete,
          attendanceRate,
          punctualityRate,
          todayWorkHours: todayStats.totalWorkHours,
          todayOvertime: todayStats.totalOvertime
        },
        monthlyStats: {
          presentDays: monthStats.presentDays,
          lateDays: monthStats.lateDays,
          absentDays: monthStats.absentDays,
          totalWorkHours: monthStats.totalWorkHours,
          totalOvertime: monthStats.totalOvertime
        },
        topPerformers: topPerformersList,
        frequentLateArrivals: frequentLateArrivalsList,
        facilityWisePerformance: facilityWiseList,
        // Dashboard-compatible data
        attendanceTrend: attendanceTrend,
        facilityWiseAttendance: facilityWiseList, // Same data, different property name
        topLateComers: frequentLateArrivalsList // Same data, different property name
      }
    });
  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get employee performance report
// @route   GET /api/analytics/employee-performance
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
