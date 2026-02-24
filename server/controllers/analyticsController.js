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
      // Only checked in, no checkout - check if there's an approved leave that excuses this
      const hasLeave = attendanceItem.leaveRequest || attendanceItem.status === 'on-leave';
      
      if (hasLeave) {
        // Employee has approved leave (e.g., official assignment) - preserve current status
        // If status is 'late', keep it (they were late before the official duty)
        // If status is 'on-leave', keep it (they were on leave all day)
      } else if (attendanceItem.status === 'present') {
        // No leave and no checkout - mark as incomplete only if status is 'present'
        attendanceItem.status = 'incomplete';
      }
      // If status is 'late' without leave, preserve it (they were late and didn't checkout)
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
    } else if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
      // Facility managers and HR can only see their assigned facilities
      if (req.user.facilities && req.user.facilities.length > 0) {
        facilityFilter.facility = { $in: req.user.facilities };
      }
    }
    // Super-admin and admin see all facilities (no filter)
    
    console.log('📊 Analytics facility filter:', facilityFilter);
    console.log('📅 Analytics date range:', { start, end, today, todayEnd });
    
    // Total employees
    const totalEmployees = await Employee.countDocuments({
      ...facilityFilter,
      status: 'active'
    });
    
    console.log('👥 Total active employees:', totalEmployees);
    
    // Total facilities - also filter for non-admin users
    let totalFacilities;
    if (req.user.role === 'super-admin' || req.user.role === 'admin') {
      totalFacilities = await Facility.countDocuments({ status: 'active' });
    } else {
      // Facility managers and HR only see count of their assigned facilities
      totalFacilities = req.user.facilities ? req.user.facilities.length : 0;
    }
    
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
      totalPresent: todayAggregated.filter(a => ['present', 'late', 'excused', 'incomplete'].includes(a.status)).length, // All who showed up
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
    
    // Generate absent records for employees who didn't check in during the month
    // Reuse allActiveEmployees but populate facility
    const allEmployeesWithFacility = await Employee.find({
      ...facilityFilter,
      status: 'active'
    }).populate('facility', 'name code');
    
    // Create a set of employee-date combinations that have attendance
    const attendedSet = new Set();
    monthAggregated.forEach(att => {
      if (att.employee && att.date) {
        const key = `${att.employee._id.toString()}-${att.date}`;
        attendedSet.add(key);
      }
    });
    
    // Generate dates array for the month
    const datesInRange = [];
    for (let d = moment(start); d <= moment(end); d.add(1, 'days')) {
      datesInRange.push(d.format('YYYY-MM-DD'));
    }
    
    // Generate absent records
    const absentRecords = [];
    for (const emp of allEmployeesWithFacility) {
      for (const date of datesInRange) {
        const key = `${emp._id.toString()}-${date}`;
        if (!attendedSet.has(key)) {
          absentRecords.push({
            employee: {
              _id: emp._id,
              employeeId: emp.employeeId,
              firstName: emp.firstName,
              lastName: emp.lastName
            },
            facility: emp.facility,
            date: date,
            status: 'absent',
            checkIn: { time: null },
            checkOut: { time: null },
            workHours: 0,
            overtime: 0,
            undertime: 0,
            lateArrival: 0
          });
        }
      }
    }
    
    // Add absent records to monthAggregated
    const monthAggregatedWithAbsent = [...monthAggregated, ...absentRecords];
    
    console.log(`📊 Month aggregated with absent: ${monthAggregatedWithAbsent.length} (${monthAggregated.length} attended + ${absentRecords.length} absent)`);
    
    // Calculate month statistics
    const monthStats = {
      presentDays: monthAggregatedWithAbsent.filter(a => ['present', 'late'].includes(a.status)).length,
      lateDays: monthAggregatedWithAbsent.filter(a => a.status === 'late').length,
      absentDays: monthAggregatedWithAbsent.filter(a => a.status === 'absent').length,
      totalWorkHours: Math.round(monthAggregatedWithAbsent.reduce((sum, a) => sum + (a.workHours || 0), 0) * 100) / 100,
      totalOvertime: Math.round(monthAggregatedWithAbsent.reduce((sum, a) => sum + (a.overtime || 0), 0) * 100) / 100
    };
    
    console.log('📈 Month stats:', monthStats);
    
    // Top performers (employees with highest attendance rate)
    const topPerformers = monthAggregatedWithAbsent.reduce((acc, record) => {
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
        punctualityScore: perf.totalDays > 0 ? Math.round(((perf.presentDays - perf.lateCount) / perf.totalDays) * 100) : 0,
        totalWorkHours: Math.round(perf.totalWorkHours * 100) / 100
      }))
      .sort((a, b) => {
        // Sort by punctuality score first (on-time performance), then by attendance rate
        if (b.punctualityScore !== a.punctualityScore) {
          return b.punctualityScore - a.punctualityScore;
        }
        if (b.attendanceRate !== a.attendanceRate) {
          return b.attendanceRate - a.attendanceRate;
        }
        // Final tiebreaker: sort by employee ID for stability
        return (a.employee.employeeId || '').localeCompare(b.employee.employeeId || '');
      })
      .slice(0, 5);
    
    console.log('🏆 Top performers:', topPerformersList.length);
    
    // Frequent late arrivals
    const frequentLateArrivals = monthAggregatedWithAbsent
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
      .map(lateData => ({
        ...lateData,
        avgLateMinutes: lateData.lateCount > 0 ? Math.round(lateData.totalLateMinutes / lateData.lateCount) : 0
      }))
      .sort((a, b) => {
        // Sort by late count first
        if (b.lateCount !== a.lateCount) {
          return b.lateCount - a.lateCount;
        }
        // Tiebreaker: sort by average late minutes (more late = worse)
        if (b.avgLateMinutes !== a.avgLateMinutes) {
          return b.avgLateMinutes - a.avgLateMinutes;
        }
        // Final tiebreaker: employee ID for stability
        return (a.employee.employeeId || '').localeCompare(b.employee.employeeId || '');
      })
      .slice(0, 5);
    
    console.log('⏰ Frequent late arrivals:', frequentLateArrivalsList.length);
    
    // Facility-grouped late arrivals
    const facilityGroupedLateArrivals = monthAggregatedWithAbsent
      .filter(record => record.status === 'late' && record.facility)
      .reduce((acc, record) => {
        const facId = record.facility._id.toString();
        const empId = record.employee._id.toString();
        
        if (!acc[facId]) {
          acc[facId] = {
            facility: record.facility,
            totalLateCount: 0,
            employees: {}
          };
        }
        
        if (!acc[facId].employees[empId]) {
          acc[facId].employees[empId] = {
            employee: record.employee,
            lateCount: 0,
            totalLateMinutes: 0
          };
        }
        
        acc[facId].employees[empId].lateCount++;
        acc[facId].employees[empId].totalLateMinutes += record.lateArrival || 0;
        acc[facId].totalLateCount++;
        
        return acc;
      }, {});
    
    const facilityGroupedLateArrivalsList = Object.values(facilityGroupedLateArrivals).map(facilityData => ({
      facility: facilityData.facility,
      totalLateCount: facilityData.totalLateCount,
      topLateEmployees: Object.values(facilityData.employees)
        .map(empData => ({
          ...empData,
          avgLateMinutes: empData.lateCount > 0 ? Math.round(empData.totalLateMinutes / empData.lateCount) : 0
        }))
        .sort((a, b) => {
          if (b.lateCount !== a.lateCount) return b.lateCount - a.lateCount;
          if (b.avgLateMinutes !== a.avgLateMinutes) return b.avgLateMinutes - a.avgLateMinutes;
          return (a.employee.employeeId || '').localeCompare(b.employee.employeeId || '');
        })
        .slice(0, 10) // Top 10 per facility
    })).sort((a, b) => {
      if (b.totalLateCount !== a.totalLateCount) return b.totalLateCount - a.totalLateCount;
      return (a.facility.name || '').localeCompare(b.facility.name || '');
    });
    
    console.log('🏢 Facility-grouped late arrivals:', facilityGroupedLateArrivalsList.length);
    
    // Facility-wise performance
    const facilityWise = monthAggregatedWithAbsent.reduce((acc, record) => {
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
      
      // Count each status separately (no overlapping)
      if (record.status === 'present') {
        acc[facId].present++;
      } else if (record.status === 'late') {
        acc[facId].late++;
      } else if (record.status === 'absent') {
        acc[facId].absent++;
      }
      
      acc[facId].totalWorkHours += record.workHours || 0;
      
      return acc;
    }, {});
    
    const facilityWiseList = Object.values(facilityWise)
      .map(fac => ({
        ...fac,
        // Attendance rate based on present + late (those who showed up)
        attendanceRate: fac.totalRecords > 0 
          ? Math.round(((fac.present + fac.late) / fac.totalRecords) * 100) 
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
      
      // Get total active employees for this day to calculate absent count
      const employeesWithRecords = new Set(dayAggregated.map(a => a.employee.employeeId));
      const allEmployees = await Employee.find({
        ...facilityFilter,
        status: 'active',
        isDeleted: false
      }).select('employeeId');
      
      // Calculate absent count: employees without records
      const absentCount = allEmployees.length - employeesWithRecords.size;
      
      // Format for Dashboard charts: {_id: {date, status}, count}
      const presentCount = dayAggregated.filter(a => a.status === 'present').length;
      const lateCount = dayAggregated.filter(a => a.status === 'late').length;
      const onLeaveCount = dayAggregated.filter(a => a.status === 'on-leave').length;
      
      if (presentCount > 0) {
        attendanceTrend.push({ _id: { date, status: 'present' }, count: presentCount });
      }
      if (lateCount > 0) {
        attendanceTrend.push({ _id: { date, status: 'late' }, count: lateCount });
      }
      if (absentCount > 0) {
        attendanceTrend.push({ _id: { date, status: 'absent' }, count: absentCount });
      }
      if (onLeaveCount > 0) {
        attendanceTrend.push({ _id: { date, status: 'on-leave' }, count: onLeaveCount });
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
        topLateComers: frequentLateArrivalsList, // Same data, different property name
        facilityGroupedLateArrivals: facilityGroupedLateArrivalsList // NEW: Late arrivals grouped by facility
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
      },
      {
        $sort: { 
          'metrics.attendanceRate': -1,
          'metrics.punctualityScore': -1,
          'employee.employeeId': 1
        }
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
