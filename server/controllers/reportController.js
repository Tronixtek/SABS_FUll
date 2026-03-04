const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Payroll = require('../models/Payroll');
const moment = require('moment');
const PDFDocument = require('pdfkit');

// Helper function to calculate statistics based on summary type
const calculateStatistics = (records, totalEmployees, summaryType = 'unique') => {
  if (summaryType === 'unique') {
    // Count unique employees per status - categories can overlap
    const uniquePresent = new Set();  // Anyone who showed up (present, late, excused)
    const uniqueOnTime = new Set();  // Only those with 'present' status
    const uniqueLate = new Set();
    const uniqueAbsent = new Set();
    const uniqueHalfDay = new Set();
    const uniqueOnLeave = new Set();
    const uniqueExcused = new Set();
    const uniqueIncomplete = new Set();
    const allEmployeesWithRecords = new Set();

    records.forEach(record => {
      const employeeId = record.employee?._id?.toString() || record.employee?.toString();
      if (!employeeId) return;

      allEmployeesWithRecords.add(employeeId);
      const status = record.status?.toLowerCase();
      
      // Categories can overlap - an employee can be both present and late on different days
      if (status === 'present') {
        uniqueOnTime.add(employeeId);
        uniquePresent.add(employeeId);
      }
      if (status === 'late') {
        uniqueLate.add(employeeId);
        uniquePresent.add(employeeId);  // Late employees also showed up
      }
      if (status === 'excused') {
        uniqueExcused.add(employeeId);
        uniquePresent.add(employeeId);
      }
      if (status === 'incomplete') {
        uniqueIncomplete.add(employeeId);
        uniquePresent.add(employeeId);  // Incomplete means they checked in, so they showed up
      }
      if (status === 'absent') {
        uniqueAbsent.add(employeeId);
      }
      if (status === 'half-day') {
        uniqueHalfDay.add(employeeId);
      }
      if (status === 'on-leave') {
        uniqueOnLeave.add(employeeId);
      }
    });

    // Calculate total absent: employees with 'absent' records + employees with no records at all
    const employeesWithNoRecords = Math.max(0, totalEmployees - allEmployeesWithRecords.size);
    const totalAbsent = uniqueAbsent.size + employeesWithNoRecords;

    return {
      totalEmployees,
      present: uniquePresent.size,  // Total unique employees who showed up
      onTime: uniqueOnTime.size,  // Unique employees with 'present' status
      absent: totalAbsent,
      late: uniqueLate.size,
      halfDay: uniqueHalfDay.size,
      onLeave: uniqueOnLeave.size,
      excused: uniqueExcused.size,
      incomplete: uniqueIncomplete.size,
      summaryType: 'unique'
    };
  } else {
    // Daily average mode - calculate average per day
    const dateGroups = {};
    
    records.forEach(record => {
      const dateKey = moment(record.date).format('YYYY-MM-DD');
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = {
          employeesPresent: new Set(),
          onTime: 0,
          late: 0,
          absent: 0,
          halfDay: 0,
          onLeave: 0,
          excused: 0,
          incomplete: 0
        };
      }
      
      const employeeId = record.employee?._id?.toString() || record.employee?.toString();
      const status = record.status?.toLowerCase();
      
      // Mutually exclusive per-day counting
      if (status === 'present') {
        dateGroups[dateKey].onTime++;
        if (employeeId) dateGroups[dateKey].employeesPresent.add(employeeId);
      } else if (status === 'late') {
        dateGroups[dateKey].late++;
        if (employeeId) dateGroups[dateKey].employeesPresent.add(employeeId);
      } else if (status === 'excused') {
        dateGroups[dateKey].excused++;
        if (employeeId) dateGroups[dateKey].employeesPresent.add(employeeId);
      } else if (status === 'incomplete') {
        dateGroups[dateKey].incomplete++;
        if (employeeId) dateGroups[dateKey].employeesPresent.add(employeeId);  // They showed up
      } else if (status === 'absent') {
        dateGroups[dateKey].absent++;
      } else if (status === 'half-day') {
        dateGroups[dateKey].halfDay++;
      } else if (status === 'on-leave') {
        dateGroups[dateKey].onLeave++;
      }
    });

    const numDays = Object.keys(dateGroups).length || 1;
    let totalPresent = 0;
    const totals = Object.values(dateGroups).reduce(
      (acc, day) => {
        totalPresent += day.employeesPresent.size;
        return {
          onTime: acc.onTime + day.onTime,
          late: acc.late + day.late,
          absent: acc.absent + day.absent,
          halfDay: acc.halfDay + day.halfDay,
          onLeave: acc.onLeave + day.onLeave,
          excused: acc.excused + day.excused,
          incomplete: acc.incomplete + day.incomplete
        };
      },
      { onTime: 0, late: 0, absent: 0, halfDay: 0, onLeave: 0, excused: 0, incomplete: 0 }
    );

    const avgOnTime = Math.round(totals.onTime / numDays);
    const avgLate = Math.round(totals.late / numDays);
    const avgExcused = Math.round(totals.excused / numDays);
    const avgAbsent = Math.round(totals.absent / numDays);
    
    // Calculate average absent including employees with no records
    const avgPresent = Math.round(totalPresent / numDays);
    const calculatedAbsent = Math.max(avgAbsent, totalEmployees - avgPresent);

    return {
      totalEmployees,
      present: avgPresent,  // Average employees who showed up per day
      onTime: avgOnTime,
      absent: calculatedAbsent,
      late: avgLate,
      halfDay: Math.round(totals.halfDay / numDays),
      onLeave: Math.round(totals.onLeave / numDays),
      excused: avgExcused,
      incomplete: Math.round(totals.incomplete / numDays),
      numDays,
      summaryType: 'daily'
    };
  }
};

// Helper function to aggregate attendance records (same logic as attendanceController)
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

// @desc    Generate daily attendance report
// @route   GET /api/reports/daily
// @access  Private
exports.getDailyReport = async (req, res) => {
  try {
    const { date, facility, summaryType = 'unique' } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    
    const matchFilter = {
      date: moment(reportDate).startOf('day').toDate()
    };
    
    // Filter by facility for non-admin users
    if (facility) {
      matchFilter.facility = facility;
    } else if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
      // Facility managers and HR can only see their assigned facilities
      if (req.user.facilities && req.user.facilities.length > 0) {
        matchFilter.facility = { $in: req.user.facilities };
      }
    }

    // Get raw attendance records (separate check-in/check-out)
    const rawAttendanceRecords = await Attendance.find(matchFilter)
      .populate('employee', 'employeeId firstName lastName department designation')
      .populate('facility', 'name code')
      .populate('shift', 'name startTime endTime workingHours')
      .sort({ 'employee.employeeId': 1, timestamp: 1 });

    // Aggregate the records to combine check-in/check-out
    const attendanceRecords = aggregateAttendanceRecords(rawAttendanceRecords);
    
    // Employee filter for all employees list
    const employeeFilter = { status: 'active' };
    if (facility) {
      employeeFilter.facility = facility;
    } else if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
      // Facility managers and HR can only see employees from their assigned facilities
      if (req.user.facilities && req.user.facilities.length > 0) {
        employeeFilter.facility = { $in: req.user.facilities };
      }
    }
    
    // Get all employees to check who didn't punch
    const allEmployees = await Employee.find(employeeFilter)
      .populate('facility', 'name code')
      .populate('shift', 'name startTime endTime workingHours');
    
    const attendedEmployeeIds = attendanceRecords.map(a => a.employee._id.toString());
    const absentEmployees = allEmployees.filter(
      e => !attendedEmployeeIds.includes(e._id.toString())
    );

    // Calculate statistics using the new calculateStatistics function
    const statistics = calculateStatistics(attendanceRecords, allEmployees.length, summaryType);

    res.json({
      success: true,
      data: {
        date: reportDate,
        statistics,
        records: attendanceRecords,
        absentEmployees: absentEmployees.map(emp => ({
          _id: emp._id,
          employeeId: emp.employeeId,
          firstName: emp.firstName,
          lastName: emp.lastName,
          department: emp.department,
          designation: emp.designation,
          facility: emp.facility,
          shift: emp.shift
        }))
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
    const { month, year, facility, employeeId, summaryType = 'unique' } = req.query;
    
    const reportMonth = month || moment().month() + 1;
    const reportYear = year || moment().year();
    
    const startDate = moment(`${reportYear}-${reportMonth}-01`).startOf('month').toDate();
    const endDate = moment(`${reportYear}-${reportMonth}-01`).endOf('month').toDate();
    
    const query = {
      date: { $gte: startDate, $lte: endDate }
    };
    
    // Filter by facility for non-admin users
    if (facility) {
      query.facility = facility;
    } else if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
      // Facility managers and HR can only see their assigned facilities
      if (req.user.facilities && req.user.facilities.length > 0) {
        query.facility = { $in: req.user.facilities };
      }
    }
    
    if (employeeId) query.employee = employeeId;
    
    console.log('🔍 Monthly report query:', JSON.stringify(query, null, 2));
    console.log('📊 Summary Type:', summaryType);
    
    // Get raw attendance records
    const rawAttendance = await Attendance.find(query)
      .populate('employee', 'employeeId firstName lastName department designation')
      .populate('facility', 'name code')
      .populate('shift', 'name startTime endTime workingHours')
      .sort({ date: 1, timestamp: 1 });
    
    console.log('📊 Found raw attendance records:', rawAttendance.length);
    
    // Aggregate records to combine check-in/check-out
    const aggregatedRecords = aggregateAttendanceRecords(rawAttendance);
    
    console.log('📈 Aggregated attendance records:', aggregatedRecords.length);
    
    // Group by employee for monthly summary
    const employeeSummary = new Map();
    
    aggregatedRecords.forEach(record => {
      // Skip records without employee data
      if (!record.employee || !record.employee._id) {
        console.warn('⚠️ Skipping record without employee data in monthly report');
        return;
      }
      
      const employeeId = record.employee._id.toString();
      
      if (!employeeSummary.has(employeeId)) {
        employeeSummary.set(employeeId, {
          employee: {
            _id: record.employee._id,
            employeeId: record.employee.employeeId,
            firstName: record.employee.firstName,
            lastName: record.employee.lastName,
            department: record.employee.department,
            designation: record.employee.designation
          },
          facility: record.facility,
          attendance: {
            totalDays: 0,
            present: 0,
            absent: 0,
            late: 0,
            halfDay: 0,
            onLeave: 0,
            excused: 0,
            totalWorkHours: 0,
            totalOvertime: 0,
            totalLateMinutes: 0,
            attendancePercentage: 0
          }
        });
      }
      
      const summary = employeeSummary.get(employeeId);
      summary.attendance.totalDays++;
      
      // Count status
      switch(record.status) {
        case 'present':
          summary.attendance.present++;
          break;
        case 'late':
          summary.attendance.late++;
          summary.attendance.present++; // Late is still considered present
          break;
        case 'absent':
          summary.attendance.absent++;
          break;
        case 'half-day':
          summary.attendance.halfDay++;
          break;
        case 'on-leave':
          summary.attendance.onLeave++;
          break;
        case 'excused':
          summary.attendance.excused++;
          break;
      }
      
      // Add work hours and overtime
      summary.attendance.totalWorkHours += record.workHours || 0;
      summary.attendance.totalOvertime += record.overtime || 0;
      summary.attendance.totalLateMinutes += record.lateArrival || 0;
    });
    
    const finalRecords = Array.from(employeeSummary.values());
    
    // Calculate days in the month
    const daysInMonth = moment(`${reportYear}-${reportMonth}-01`).daysInMonth();
    
    // Fetch all employees with their shift data to calculate expected working days
    // Include ALL employees who had attendance, not just active ones
    const employeeIdsInRecords = finalRecords.map(r => r.employee._id);
    const empQueryFilter = { 
      _id: { $in: employeeIdsInRecords }
    };
    if (facility) empQueryFilter.facility = facility;
    
    const employeesWithShifts = await Employee.find(empQueryFilter)
      .populate('shift', 'workingHours workingDays')
      .lean();
    
    // Create a map for quick lookup of employee shift data
    const employeeShiftMap = new Map();
    employeesWithShifts.forEach(emp => {
      employeeShiftMap.set(emp._id.toString(), emp.shift);
    });
    
    // Calculate attendance percentages and correct absent days for each employee
    finalRecords.forEach(record => {
      const employeeId = record.employee._id.toString();
      const employeeShift = employeeShiftMap.get(employeeId);
      
      // Calculate expected working days for this employee
      let workingDaysPerWeek = 7; // Default
      if (employeeShift?.workingDays && employeeShift.workingDays.length > 0) {
        workingDaysPerWeek = employeeShift.workingDays.length;
      }
      
      const weeksInMonth = daysInMonth / 7;
      const expectedWorkingDays = Math.floor(workingDaysPerWeek * weeksInMonth);
      
      // Calculate actual absent days: expected days minus days with positive attendance
      const attendedDays = record.attendance.present + record.attendance.excused;
      const actualAbsentDays = Math.max(0, expectedWorkingDays - attendedDays);
      
      // Update the record with corrected values
      record.attendance.totalDays = expectedWorkingDays;
      record.attendance.absent = actualAbsentDays;
      
      // Calculate attendance percentage based on expected working days
      const presentDays = record.attendance.present;
      record.attendance.attendancePercentage = expectedWorkingDays > 0 
        ? Math.round((presentDays / expectedWorkingDays) * 100 * 100) / 100 
        : 0;
      record.attendance.totalWorkHours = Math.round(record.attendance.totalWorkHours * 100) / 100;
      record.attendance.totalOvertime = Math.round(record.attendance.totalOvertime * 100) / 100;
    });
    
    // Get total employees for the facility
    const employeeFilter = { status: 'active' };
    if (facility) employeeFilter.facility = facility;
    const totalEmployees = await Employee.countDocuments(employeeFilter);
    
    // Calculate statistics based on summary type
    const statistics = calculateStatistics(aggregatedRecords, totalEmployees, summaryType);
    
    res.json({
      success: true,
      data: {
        month: reportMonth,
        year: reportYear,
        period: `${moment(`${reportYear}-${reportMonth}-01`).format('MMMM YYYY')}`,
        totalEmployees: statistics.totalEmployees,
        statistics,
        records: finalRecords
      }
    });
  } catch (error) {
    console.error('❌ Error in getMonthlyReport:', error);
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
    const { startDate, endDate, facility, department, status, summaryType = 'unique' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const query = {
      date: { $gte: start, $lte: end }
    };
    
    if (facility) query.facility = facility;
    if (status) query.status = status;
    
    console.log('🔍 Custom report query:', JSON.stringify(query, null, 2));
    console.log('📊 Summary Type:', summaryType);
    
    // Get raw attendance records
    const rawAttendance = await Attendance.find(query)
      .populate('employee', 'employeeId firstName lastName department designation')
      .populate('facility', 'name code')
      .populate('shift', 'name startTime endTime workingHours')
      .sort({ date: -1, timestamp: -1 });
    
    console.log('📊 Found raw attendance records:', rawAttendance.length);
    
    // Filter by department if specified
    const filteredRecords = department 
      ? rawAttendance.filter(record => record.employee?.department === department)
      : rawAttendance;
    
    console.log('📈 Filtered records:', filteredRecords.length);
    
    // Aggregate records to combine check-in/check-out
    const aggregatedRecords = aggregateAttendanceRecords(filteredRecords);
    
    console.log('✅ Aggregated records:', aggregatedRecords.length);
    
    // Get total employees for the facility/department
    const employeeFilter = { status: 'active' };
    if (facility) employeeFilter.facility = facility;
    if (department) employeeFilter.department = department;
    
    const totalEmployees = await Employee.countDocuments(employeeFilter);
    
    // Calculate statistics based on summary type
    const statistics = calculateStatistics(aggregatedRecords, totalEmployees, summaryType);
    
    // Keep the old summary format for backward compatibility
    const summary = {
      totalRecords: aggregatedRecords.length,
      present: aggregatedRecords.filter(r => r.status === 'present').length,
      absent: aggregatedRecords.filter(r => r.status === 'absent').length,
      late: aggregatedRecords.filter(r => r.status === 'late').length,
      halfDay: aggregatedRecords.filter(r => r.status === 'half-day').length,
      onLeave: aggregatedRecords.filter(r => r.status === 'on-leave').length,
      excused: aggregatedRecords.filter(r => r.status === 'excused').length,
      incomplete: aggregatedRecords.filter(r => r.status === 'incomplete').length,
      totalWorkHours: Math.round(aggregatedRecords.reduce((sum, r) => sum + (r.workHours || 0), 0) * 100) / 100,
      totalOvertime: Math.round(aggregatedRecords.reduce((sum, r) => sum + (r.overtime || 0), 0) * 100) / 100,
      totalLateMinutes: aggregatedRecords.reduce((sum, r) => sum + (r.lateArrival || 0), 0),
      averageWorkHours: aggregatedRecords.length > 0 
        ? Math.round((aggregatedRecords.reduce((sum, r) => sum + (r.workHours || 0), 0) / aggregatedRecords.length) * 100) / 100
        : 0
    };
    
    res.json({
      success: true,
      data: {
        dateRange: { startDate, endDate },
        totalEmployees: statistics.totalEmployees,
        summary,
        statistics,
        records: aggregatedRecords
      }
    });
  } catch (error) {
    console.error('❌ Error in getCustomReport:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Generate PDF report
// Helper function to capitalize names properly
const toProperCase = (str) => {
  if (!str) return '';
  return str.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

// @route   GET /api/reports/pdf
// @access  Private
exports.generatePDFReport = async (req, res) => {
  console.log('\n🔥 ===== generatePDFReport CALLED =====');
  console.log('Query params:', req.query);
  
  try {
    const { type = 'daily', date, facility, month, year, summaryType = 'unique' } = req.query;
    
    console.log(`📊 Generating ${type} report with summaryType: ${summaryType}...`);
    
    let reportData;
    let reportTitle;
    
    // Get report data based on type
    if (type === 'daily') {
      const reportDate = date ? new Date(date) : new Date();
      const matchFilter = {
        date: moment(reportDate).startOf('day').toDate()
      };
      
      if (facility) {
        matchFilter.facility = facility;
      }

      const rawAttendanceRecords = await Attendance.find(matchFilter)
        .populate('employee', 'employeeId firstName lastName department designation')
        .populate('facility', 'name code')
        .populate('shift', 'name startTime endTime workingHours')
        .sort({ 'employee.employeeId': 1, timestamp: 1 });

      const attendanceRecords = aggregateAttendanceRecords(rawAttendanceRecords);
      
      const allEmployees = await Employee.find({
        ...(facility ? { facility } : {}),
        status: 'active'
      }).populate('facility', 'name code').populate('shift', 'name startTime endTime workingHours');
      
      const attendedEmployeeIds = attendanceRecords.map(a => a.employee._id.toString());
      const absentEmployees = allEmployees.filter(
        e => !attendedEmployeeIds.includes(e._id.toString())
      );

      const stats = {
        totalEmployees: allEmployees.length,
        present: attendanceRecords.filter(a => ['present', 'late', 'excused'].includes(a.status)).length,
        absent: absentEmployees.length,
        late: attendanceRecords.filter(a => a.status === 'late').length,
        excused: attendanceRecords.filter(a => a.status === 'excused').length,
        incomplete: attendanceRecords.filter(a => a.status === 'incomplete').length
      };

      reportData = {
        date: reportDate,
        statistics: stats,
        records: attendanceRecords,
        absentEmployees
      };
      
      reportTitle = `Daily Attendance Report - ${moment(reportDate).format('MMM DD, YYYY')}`;
    } else if (type === 'monthly') {
      // Handle monthly report
      const reportMonth = month || moment().month() + 1;
      const reportYear = year || moment().year();
      
      const startDate = moment(`${reportYear}-${reportMonth}-01`).startOf('month').toDate();
      const endDate = moment(`${reportYear}-${reportMonth}-01`).endOf('month').toDate();
      
      const query = {
        date: { $gte: startDate, $lte: endDate }
      };
      
      if (facility) query.facility = facility;
      
      const rawAttendance = await Attendance.find(query)
        .populate('employee', 'employeeId firstName lastName department designation')
        .populate('facility', 'name code')
        .populate('shift', 'name startTime endTime workingHours')
        .sort({ date: 1, timestamp: 1 });
      
      const aggregatedRecords = aggregateAttendanceRecords(rawAttendance);
      
      // Group by employee for monthly summary
      const employeeSummary = new Map();
      
      aggregatedRecords.forEach(record => {
        if (!record.employee || !record.employee._id) return;
        
        const employeeId = record.employee._id.toString();
        
        if (!employeeSummary.has(employeeId)) {
          employeeSummary.set(employeeId, {
            employee: record.employee,
            facility: record.facility,
            attendance: {
              totalDays: 0,
              present: 0,
              absent: 0,
              late: 0,
              excused: 0,
              totalWorkHours: 0,
              totalOvertime: 0
            }
          });
        }
        
        const summary = employeeSummary.get(employeeId);
        summary.attendance.totalDays++;
        
        switch(record.status) {
          case 'present':
            summary.attendance.present++;
            break;
          case 'late':
            summary.attendance.late++;
            summary.attendance.present++;
            break;
          case 'absent':
            summary.attendance.absent++;
            break;
          case 'excused':
            summary.attendance.excused++;
            break;
        }
        
        summary.attendance.totalWorkHours += record.workHours || 0;
        summary.attendance.totalOvertime += record.overtime || 0;
      });
      
      const finalRecords = Array.from(employeeSummary.values());
      
      // Calculate days in the month
      const daysInMonth = moment(`${reportYear}-${reportMonth}-01`).daysInMonth();
      
      // Fetch all employees with their shift data to calculate expected working days
      // Include ALL employees who had attendance, not just active ones
      const employeeIdsInRecords = finalRecords.map(r => r.employee._id);
      const employeeFilter = { 
        _id: { $in: employeeIdsInRecords }
      };
      if (facility) employeeFilter.facility = facility;
      
      const employeesWithShifts = await Employee.find(employeeFilter)
        .populate('shift', 'workingHours workingDays')
        .populate('facility', 'name code')
        .lean();
      
      // Create a map for quick lookup of employee shift data
      const employeeShiftMap = new Map();
      employeesWithShifts.forEach(emp => {
        employeeShiftMap.set(emp._id.toString(), emp.shift);
      });
      
      // Calculate attendance percentages and correct absent days for each employee
      finalRecords.forEach(record => {
        const employeeId = record.employee._id.toString();
        const employeeShift = employeeShiftMap.get(employeeId);
        
        // Calculate expected working days for this employee
        let workingDaysPerWeek = 7; // Default
        if (employeeShift?.workingDays && employeeShift.workingDays.length > 0) {
          workingDaysPerWeek = employeeShift.workingDays.length;
        }
        
        const weeksInMonth = daysInMonth / 7;
        const expectedWorkingDays = Math.floor(workingDaysPerWeek * weeksInMonth);
        
        // Calculate actual absent days: expected days minus days with positive attendance
        const attendedDays = record.attendance.present + record.attendance.excused;
        const actualAbsentDays = Math.max(0, expectedWorkingDays - attendedDays);
        
        // Debug logging for first employee
        if (finalRecords.indexOf(record) === 0) {
          console.log(`📊 Absent Days Calculation (First Employee):`, {
            employeeId: record.employee.employeeId,
            name: `${record.employee.firstName} ${record.employee.lastName}`,
            workingDaysPerWeek,
            expectedWorkingDays,
            presentDays: record.attendance.present,
            excusedDays: record.attendance.excused,
            attendedDays,
            actualAbsentDays
          });
        }
        
        // Update the record with corrected values
        record.attendance.totalDays = expectedWorkingDays;
        record.attendance.absent = actualAbsentDays;
        
        // Calculate attendance percentage based on expected working days
        const presentDays = record.attendance.present;
        record.attendance.attendancePercentage = expectedWorkingDays > 0 
          ? Math.round((presentDays / expectedWorkingDays) * 100 * 100) / 100 
          : 0;
        record.attendance.totalWorkHours = Math.round(record.attendance.totalWorkHours * 100) / 100;
        record.attendance.totalOvertime = Math.round(record.attendance.totalOvertime * 100) / 100;
      });
      
      // Note: Employees with NO attendance records in the month are not included in PDF
      // This is intentional - the PDF shows actual recorded attendance      
      // Get total employees for the facility (active employees only for statistics)
      const statsEmployeeFilter = { status: 'active' };
      if (facility) statsEmployeeFilter.facility = facility;
      const totalEmployees = await Employee.countDocuments(statsEmployeeFilter);
      
      // Calculate statistics based on summary type
      const statistics = calculateStatistics(aggregatedRecords, totalEmployees, summaryType);
      
      // Calculate total worked hours and expected hours for monthly report
      const totalWorkedHours = finalRecords.reduce((sum, record) => 
        sum + (record.attendance.totalWorkHours || 0), 0
      );
      
      // Calculate expected hours based on each employee's shift working hours and working days (already fetched above)
      const expectedTotalHours = employeesWithShifts.reduce((total, emp) => {
        const shiftHours = emp.shift?.workingHours || 8; // Fallback to 8 hours if shift not defined
        
        // Calculate working days per week based on shift schedule
        let workingDaysPerWeek = 7; // Default: assume 7-day operations (healthcare context)
        
        if (emp.shift?.workingDays && emp.shift.workingDays.length > 0) {
          // Use actual scheduled working days from shift
          workingDaysPerWeek = emp.shift.workingDays.length;
        }
        
        // Calculate expected working days in the month for this employee
        const weeksInMonth = daysInMonth / 7;
        const expectedWorkingDays = Math.floor(workingDaysPerWeek * weeksInMonth);
        
        return total + (shiftHours * expectedWorkingDays);
      }, 0);
      
      // Calculate average working days for display (weighted average based on employees)
      const totalExpectedDays = employeesWithShifts.reduce((total, emp) => {
        let workingDaysPerWeek = 7;
        if (emp.shift?.workingDays && emp.shift.workingDays.length > 0) {
          workingDaysPerWeek = emp.shift.workingDays.length;
        }
        const weeksInMonth = daysInMonth / 7;
        return total + Math.floor(workingDaysPerWeek * weeksInMonth);
      }, 0);
      const avgWorkingDays = employeesWithShifts.length > 0 
        ? Math.round(totalExpectedDays / employeesWithShifts.length) 
        : Math.floor(daysInMonth * (6/7)); // Fallback to 6-day week for healthcare
      
      reportData = {
        statistics,
        records: finalRecords,
        totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
        expectedTotalHours: Math.round(expectedTotalHours * 100) / 100,
        workingDays: avgWorkingDays
      };
      
      reportTitle = `Monthly Attendance Report - ${moment(`${reportYear}-${reportMonth}-01`).format('MMMM YYYY')}`;
      if (summaryType === 'daily') {
        reportTitle += ' (Daily Average)';
      } else {
        reportTitle += ' (Unique Employees)';
      }
    } else if (type === 'custom') {
      // Handle custom report
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required for custom reports'
        });
      }
      
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      const query = {
        date: { $gte: start, $lte: end }
      };
      
      if (facility) query.facility = facility;
      
      const rawAttendance = await Attendance.find(query)
        .populate('employee', 'employeeId firstName lastName department designation')
        .populate('facility', 'name code')
        .populate('shift', 'name startTime endTime workingHours')
        .sort({ date: -1, timestamp: -1 });
      
      const aggregatedRecords = aggregateAttendanceRecords(rawAttendance);
      
      // Get total employees for the facility
      const employeeFilter = { status: 'active' };
      if (facility) employeeFilter.facility = facility;
      const totalEmployees = await Employee.countDocuments(employeeFilter);
      
      // Calculate statistics based on summary type
      const statistics = calculateStatistics(aggregatedRecords, totalEmployees, summaryType);
      
      reportData = {
        statistics,
        records: aggregatedRecords
      };
      
      reportTitle = `Custom Attendance Report - ${moment(startDate).format('MMM DD')} to ${moment(endDate).format('MMM DD, YYYY')}`;
      if (summaryType === 'daily') {
        reportTitle += ' (Daily Average)';
      } else {
        reportTitle += ' (Unique Employees)';
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type. Supported types: daily, monthly, custom'
      });
    }
    
    // Validate report data was generated
    if (!reportData || !reportData.statistics) {
      console.error('❌ No report data generated');
      return res.status(500).json({
        success: false,
        message: 'Failed to generate report data'
      });
    }
    
    console.log('📄 Creating PDF document...');
    console.log('Report type:', type);
    console.log('Records count:', reportData.records?.length || 0);
    
    try {
      // Create PDF document
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        bufferPages: true,
        autoFirstPage: true
      });
      
      console.log('✅ PDFDocument instance created');
      
      // Buffer to collect PDF data
      const chunks = [];
      
      // Collect PDF chunks
      doc.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      // Handle PDF completion
      doc.on('end', () => {
        try {
          console.log('✅ PDF generation completed, collected chunks:', chunks.length);
          const pdfBuffer = Buffer.concat(chunks);
          console.log('✅ PDF buffer size:', pdfBuffer.length, 'bytes');
          
          // Set response headers
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="report_${type}_${moment().format('YYYY-MM-DD')}.pdf"`);
          res.setHeader('Content-Length', pdfBuffer.length);
          
          // Send the complete PDF
          res.send(pdfBuffer);
          console.log('✅ PDF sent to client successfully');
        } catch (endError) {
          console.error('❌ Error in PDF completion handler:', endError);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Failed to send PDF',
              error: endError.message
            });
          }
        }
      });
      
      // Handle errors
      doc.on('error', (err) => {
        console.error('❌ PDF document error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'PDF generation failed',
            error: err.message
          });
        }
      });
      
      console.log('✏️ Writing PDF content...');
    
    // === PROFESSIONAL HEADER DESIGN ===
    const pageWidth = 595; // A4 width in points
    const centerX = pageWidth / 2;
    
    // Top decorative line
    doc.strokeColor('#1976d2')
       .lineWidth(2)
       .moveTo(50, 35)
       .lineTo(545, 35)
       .stroke();
    
    // Organization Name (Main Header)
    doc.fillColor('#1976d2')
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('Kano State Primary Health Care Management Board', 50, 45, {
         width: 495,
         align: 'center'
       });
    
    // System Name (Subtitle)
    doc.fillColor('#333333')
       .fontSize(12)
       .font('Helvetica')
       .text('Staff Attendance Biometric System', 50, 70, {
         width: 495,
         align: 'center'
       });
    
    // Bottom decorative line
    doc.strokeColor('#1976d2')
       .lineWidth(1)
       .moveTo(150, 90)
       .lineTo(445, 90)
       .stroke();
    
    // Reset colors and font
    doc.fillColor('black').font('Helvetica');
    
    // Report title with word wrap (may span multiple lines)
    const titleY = 105;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text(reportTitle, 50, titleY, {
         width: 495, // A4 width minus margins
         align: 'left',
         lineGap: 3
       });
    
    // Calculate where title ended (account for potential wrapping)
    const titleLines = Math.ceil(doc.widthOfString(reportTitle) / 495) || 1;
    const titleHeight = titleLines * 17; // ~17px per line at font size 14
    const generatedY = titleY + titleHeight + 5;
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#666666')
       .text(`Generated: ${moment().format('MMM DD, YYYY hh:mm A')}`, 50, generatedY);
    
    // Add separator line below header section
    const lineY = generatedY + 20;
    doc.strokeColor('#cccccc')
       .lineWidth(0.5)
       .moveTo(50, lineY)
       .lineTo(545, lineY)
       .stroke();
    
    // Reset for content
    doc.fillColor('black').strokeColor('black');
    
    let yPosition = lineY + 25;
    
    // Add statistics
    doc.fontSize(14).text('Summary Statistics', 50, yPosition);
    yPosition += 25;
    
    const stats = reportData.statistics;
    const statisticsData = [
      `Total Employees: ${stats.totalEmployees}`,
      `Present: ${stats.present} (${stats.totalEmployees > 0 ? ((stats.present / stats.totalEmployees) * 100).toFixed(1) : 0}%)`,
      `Late: ${stats.late} (${stats.totalEmployees > 0 ? ((stats.late / stats.totalEmployees) * 100).toFixed(1) : 0}%)`,
      `Excused: ${stats.excused} (${stats.totalEmployees > 0 ? ((stats.excused / stats.totalEmployees) * 100).toFixed(1) : 0}%)`,
      `Absent: ${stats.absent} (${stats.totalEmployees > 0 ? ((stats.absent / stats.totalEmployees) * 100).toFixed(1) : 0}%)`,
      `Incomplete: ${stats.incomplete} (${stats.totalEmployees > 0 ? ((stats.incomplete / stats.totalEmployees) * 100).toFixed(1) : 0}%)`
    ];
    
    // Add total hours for monthly reports
    if (reportData.totalWorkedHours !== undefined && reportData.expectedTotalHours !== undefined) {
      const utilizationRate = reportData.expectedTotalHours > 0 
        ? ((reportData.totalWorkedHours / reportData.expectedTotalHours) * 100).toFixed(1) 
        : 0;
      statisticsData.push('');  // Empty line for spacing
      statisticsData.push(`Total Expected Work Hours: ${reportData.expectedTotalHours.toLocaleString()} hrs (${reportData.workingDays} working days)`);
      statisticsData.push(`Total Worked Hours: ${reportData.totalWorkedHours.toLocaleString()} hrs`);
      statisticsData.push(`Hour Utilization: ${utilizationRate}%`);
    }
    
    statisticsData.forEach((text) => {
      doc.fontSize(10).text(text, 70, yPosition);
      yPosition += 15;
    });
    
    yPosition += 20;
    
    // Add attendance records table
    if (reportData.records && reportData.records.length > 0) {
      doc.fontSize(14).text('Attendance Records', 50, yPosition);
      yPosition += 25;
      
      // Table headers - different for monthly vs daily reports
      // A4 portrait: 595px width - 100px margins = 495px available
      let tableHeaders, columnWidths;
      
      if (type === 'monthly') {
        tableHeaders = ['S/N', 'ID', 'Name', 'Dept', 'Present', 'Late', 'Absent', 'Hours', 'Attend%'];
        columnWidths = [30, 45, 110, 60, 38, 38, 38, 45, 45]; // Total: 449px
      } else {
        tableHeaders = ['S/N', 'ID', 'Name', 'Dept', 'Check In', 'Check Out', 'Hours', 'Status'];
        columnWidths = [30, 45, 105, 60, 58, 58, 42, 47]; // Total: 445px
      }
      
      let xPosition = 50;
      
      // Draw header row
      doc.fontSize(9).fillColor('black');
      tableHeaders.forEach((header, i) => {
        doc.rect(xPosition, yPosition, columnWidths[i], 20).stroke();
        doc.text(header, xPosition + 3, yPosition + 5, {
          width: columnWidths[i] - 6,
          align: 'center',
          ellipsis: true
        });
        xPosition += columnWidths[i];
      });
      yPosition += 20;
      
      console.log(`📝 Writing ${reportData.records.length} attendance records to PDF...`);
      
      // Draw data rows - show all records
      reportData.records.forEach((record, index) => {
        xPosition = 50;
        
        let rowData;
        if (type === 'monthly') {
          // Monthly report shows aggregate data
          const fullName = `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim();
          rowData = [
            (index + 1).toString(),
            record.employee?.employeeId || '-',
            toProperCase(fullName) || '-',
            toProperCase(record.employee?.department) || '-',
            record.attendance?.present || '0',
            record.attendance?.late || '0',
            record.attendance?.absent || '0',
            record.attendance?.totalWorkHours ? `${record.attendance.totalWorkHours.toFixed(1)}h` : '0h',
            record.attendance?.attendancePercentage ? `${record.attendance.attendancePercentage.toFixed(0)}%` : '0%'
          ];
        } else {
          // Daily/custom reports show daily data
          const fullName = `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim();
          rowData = [
            (index + 1).toString(),
            record.employee?.employeeId || '-',
            toProperCase(fullName) || '-',
            toProperCase(record.employee?.department) || '-',
            record.checkIn?.time ? moment(record.checkIn.time).format('hh:mm A') : '-',
            record.checkOut?.time ? moment(record.checkOut.time).format('hh:mm A') : '-',
            record.workHours ? `${record.workHours.toFixed(1)}h` : '-',
            record.status || '-'
          ];
        }
        
        rowData.forEach((text, i) => {
          // Draw cell border
          doc.rect(xPosition, yPosition, columnWidths[i], 15).stroke();
          
          // Draw text with clipping to prevent overflow
          doc.fontSize(8).text(String(text), xPosition + 2, yPosition + 2, {
            width: columnWidths[i] - 4,
            height: 15,
            ellipsis: true,
            lineBreak: false
          });
          
          xPosition += columnWidths[i];
        });
        yPosition += 15;
        
        // Check if we need a new page
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
          
          // Redraw table headers on new page
          xPosition = 50;
          doc.fontSize(9).fillColor('black');
          tableHeaders.forEach((header, i) => {
            doc.rect(xPosition, yPosition, columnWidths[i], 20).stroke();
            doc.text(header, xPosition + 3, yPosition + 5, {
              width: columnWidths[i] - 6,
              align: 'center',
              ellipsis: true
            });
            xPosition += columnWidths[i];
          });
          yPosition += 20;
        }
      });
    }
    
    // Add absent employees table if any (daily reports only)
    if (reportData.absentEmployees && reportData.absentEmployees.length > 0) {
      yPosition += 30;
      
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.fontSize(14).fillColor('red').text('Absent Employees', 50, yPosition);
      yPosition += 25;
      
      console.log(`📝 Writing ${reportData.absentEmployees.length} absent employees to PDF table (grouped by facility)...`);
      
      // Group absent employees by facility
      const absentByFacility = reportData.absentEmployees.reduce((groups, employee) => {
        const facilityId = employee.facility?._id?.toString() || 'no-facility';
        const facilityName = employee.facility?.name || 'No Facility Assigned';
        
        if (!groups[facilityId]) {
          groups[facilityId] = {
            name: facilityName,
            employees: []
          };
        }
        groups[facilityId].employees.push(employee);
        return groups;
      }, {});
      
      // Sort facilities by name
      const facilitiesData = Object.values(absentByFacility).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      // Table headers for absent employees
      const absentHeaders = ['S/N', 'ID', 'Name', 'Department'];
      const absentColumnWidths = [30, 60, 180, 175]; // Total: 445px (removed Facility column)
      
      let globalSerialNumber = 1;
      
      // Draw each facility section
      facilitiesData.forEach((facilityGroup, facilityIndex) => {
        // Check if we need a new page for facility header
        if (yPosition > 680) {
          doc.addPage();
          yPosition = 50;
        }
        
        // Draw facility name header
        doc.fontSize(12).fillColor('blue').text(`FACILITY: ${facilityGroup.name}`, 50, yPosition);
        yPosition += 20;
        
        // Draw table headers
        let xPosition = 50;
        doc.fontSize(9).fillColor('black');
        absentHeaders.forEach((header, i) => {
          doc.rect(xPosition, yPosition, absentColumnWidths[i], 20).stroke();
          doc.text(header, xPosition + 3, yPosition + 5, {
            width: absentColumnWidths[i] - 6,
            align: 'center',
            ellipsis: true
          });
          xPosition += absentColumnWidths[i];
        });
        yPosition += 20;
        
        // Draw employees for this facility
        facilityGroup.employees.forEach((employee) => {
          xPosition = 50;
          const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
          const absentRowData = [
            globalSerialNumber.toString(),
            employee.employeeId || '-',
            toProperCase(fullName) || '-',
            toProperCase(employee.department) || '-'
          ];
          
          absentRowData.forEach((text, i) => {
            doc.rect(xPosition, yPosition, absentColumnWidths[i], 15).stroke();
            doc.fontSize(8).text(String(text), xPosition + 2, yPosition + 2, {
              width: absentColumnWidths[i] - 4,
              height: 15,
              ellipsis: true,
              lineBreak: false
            });
            xPosition += absentColumnWidths[i];
          });
          yPosition += 15;
          globalSerialNumber++;
          
          // Check if we need a new page
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
            
            // Redraw facility name and table headers on new page
            doc.fontSize(12).fillColor('blue').text(`FACILITY: ${facilityGroup.name} (continued)`, 50, yPosition);
            yPosition += 20;
            
            xPosition = 50;
            doc.fontSize(9).fillColor('black');
            absentHeaders.forEach((header, i) => {
              doc.rect(xPosition, yPosition, absentColumnWidths[i], 20).stroke();
              doc.text(header, xPosition + 3, yPosition + 5, {
                width: absentColumnWidths[i] - 6,
                align: 'center',
                ellipsis: true
              });
              xPosition += absentColumnWidths[i];
            });
            yPosition += 20;
          }
        });
        
        // Add spacing between facilities
        yPosition += 15;
      });
    }
    
      // Add footer
      const pageHeight = doc.page.height;
      doc.fontSize(8).fillColor('gray')
         .text('Generated by SABS Attendance System', 50, pageHeight - 50)
         .text(`Page generated on ${moment().format('MMM DD, YYYY hh:mm A')}`, 50, pageHeight - 35);
      
      console.log('🏁 Finalizing PDF document...');
      
      // Finalize the PDF
      doc.end();
      
      console.log('✅ doc.end() called successfully, waiting for completion event...');
      
    } catch (pdfError) {
      console.error('❌ PDF content generation error:', pdfError);
      console.error('Stack trace:', pdfError.stack);
      
      // Only send JSON error if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to generate PDF content',
          error: pdfError.message,
          stack: pdfError.stack
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Overall PDF generation error:', error);
    console.error('Stack trace:', error.stack);
    
    // Only send JSON error if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate PDF report',
        error: error.message,
        stack: error.stack
      });
    } else {
      // If headers were sent (PDF was being generated), try to end the response gracefully
      try {
        res.end();
      } catch (endError) {
        console.error('Error ending response:', endError);
      }
    }
  }
};

// @desc    Generate payroll report
// @route   GET /api/reports/payroll
// @access  Private
exports.getPayrollReport = async (req, res) => {
  try {
    const { month, year, facility, status } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    const query = {
      'payPeriod.month': parseInt(month),
      'payPeriod.year': parseInt(year)
    };

    if (facility) {
      query.facility = facility;
    }

    if (status) {
      query.status = status;
    }

    // Fetch payroll records
    const payrolls = await Payroll.find(query)
      .populate('employee', 'employeeId firstName lastName department designation email phone')
      .populate('facility', 'name location')
      .sort({ employeeId: 1 });

    // Calculate summary statistics
    const summary = {
      totalEmployees: payrolls.length,
      totalGrossEarnings: payrolls.reduce((sum, p) => sum + p.earnings.total, 0),
      totalDeductions: payrolls.reduce((sum, p) => sum + p.deductions.total, 0),
      totalNetPay: payrolls.reduce((sum, p) => sum + p.netPay, 0),
      totalOvertimeHours: payrolls.reduce((sum, p) => sum + p.workHours.overtimeHours, 0),
      totalOvertimePay: payrolls.reduce((sum, p) => sum + p.earnings.overtimePay, 0),
      totalPresentDays: payrolls.reduce((sum, p) => sum + p.attendance.presentDays, 0),
      totalAbsentDays: payrolls.reduce((sum, p) => sum + p.attendance.absentDays, 0),
      byStatus: {
        draft: payrolls.filter(p => p.status === 'draft').length,
        approved: payrolls.filter(p => p.status === 'approved').length,
        paid: payrolls.filter(p => p.status === 'paid').length
      }
    };

    res.json({
      success: true,
      data: {
        payrolls,
        summary,
        period: {
          month: parseInt(month),
          year: parseInt(year),
          monthName: moment().month(parseInt(month) - 1).format('MMMM')
        }
      }
    });
  } catch (error) {
    console.error('Payroll report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payroll report',
      error: error.message
    });
  }
};

// @desc    Generate payroll PDF report
// @route   GET /api/reports/payroll-pdf
// @access  Private
exports.generatePayrollPDF = async (req, res) => {
  try {
    const { month, year, facility, status } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    const query = {
      'payPeriod.month': parseInt(month),
      'payPeriod.year': parseInt(year)
    };

    if (facility) {
      query.facility = facility;
    }

    if (status) {
      query.status = status;
    }

    // Fetch payroll records
    const payrolls = await Payroll.find(query)
      .populate('employee', 'employeeId firstName lastName department designation')
      .populate('facility', 'name')
      .sort({ employeeId: 1 });

    if (payrolls.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No payroll records found for the specified period'
      });
    }

    // Calculate summary
    const summary = {
      totalEmployees: payrolls.length,
      totalGrossEarnings: payrolls.reduce((sum, p) => sum + p.earnings.total, 0),
      totalDeductions: payrolls.reduce((sum, p) => sum + p.deductions.total, 0),
      totalNetPay: payrolls.reduce((sum, p) => sum + p.netPay, 0),
      totalOvertimeHours: payrolls.reduce((sum, p) => sum + p.workHours.overtimeHours, 0),
      totalOvertimePay: payrolls.reduce((sum, p) => sum + p.earnings.overtimePay, 0)
    };

    const monthName = moment().month(parseInt(month) - 1).format('MMMM');
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

    // Buffer to collect PDF data
    const chunks = [];
    
    // Collect PDF chunks
    doc.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    // Handle PDF completion
    doc.on('end', () => {
      console.log('✅ Payroll PDF generation completed successfully');
      const pdfBuffer = Buffer.concat(chunks);
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=payroll-report-${monthName}-${year}.pdf`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Send the complete PDF
      res.send(pdfBuffer);
    });
    
    // Handle errors
    doc.on('error', (err) => {
      console.error('❌ Payroll PDF document error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Payroll PDF generation failed',
          error: err.message
        });
      }
    });

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('PAYROLL REPORT', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`${monthName} ${year}`, { align: 'center' });
    doc.moveDown();

    // Summary Section
    doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    
    const summaryY = doc.y;
    // Left column
    doc.text(`Total Employees: ${summary.totalEmployees}`, 40, summaryY);
    doc.text(`Total Overtime Hours: ${summary.totalOvertimeHours.toFixed(2)}h`, 40, summaryY + 15);
    doc.text(`Total Overtime Pay: ₦${summary.totalOvertimePay.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, 40, summaryY + 30);
    
    // Right column
    doc.text(`Total Gross Earnings: ₦${summary.totalGrossEarnings.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, 400, summaryY);
    doc.text(`Total Deductions: ₦${summary.totalDeductions.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, 400, summaryY + 15);
    doc.text(`Total Net Pay: ₦${summary.totalNetPay.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, 400, summaryY + 30);
    
    doc.moveDown(3);

    // Table Header
    const tableTop = doc.y;
    const colWidths = {
      empId: 55,
      name: 100,
      dept: 140,
      hours: 45,
      overtime: 45,
      earnings: 85,
      deductions: 85,
      netPay: 85
    };

    let currentX = 40;
    
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Emp ID', currentX, tableTop, { width: colWidths.empId, align: 'left' });
    currentX += colWidths.empId;
    doc.text('Name', currentX, tableTop, { width: colWidths.name, align: 'left' });
    currentX += colWidths.name;
    doc.text('Department', currentX, tableTop, { width: colWidths.dept, align: 'left' });
    currentX += colWidths.dept;
    doc.text('Hours', currentX, tableTop, { width: colWidths.hours, align: 'right' });
    currentX += colWidths.hours;
    doc.text('OT', currentX, tableTop, { width: colWidths.overtime, align: 'right' });
    currentX += colWidths.overtime;
    doc.text('Earnings', currentX, tableTop, { width: colWidths.earnings, align: 'right' });
    currentX += colWidths.earnings;
    doc.text('Deductions', currentX, tableTop, { width: colWidths.deductions, align: 'right' });
    currentX += colWidths.deductions;
    doc.text('Net Pay', currentX, tableTop, { width: colWidths.netPay, align: 'right' });

    // Draw line under header
    doc.moveTo(40, tableTop + 12).lineTo(760, tableTop + 12).stroke();

    // Table Rows
    let y = tableTop + 20;
    doc.font('Helvetica').fontSize(8);

    // Helper function to truncate text if too long
    const truncateText = (text, maxWidth, fontSize = 8) => {
      if (!text) return '';
      doc.fontSize(fontSize);
      const textWidth = doc.widthOfString(text);
      if (textWidth <= maxWidth) return text;
      
      // Truncate with ellipsis
      let truncated = text;
      while (doc.widthOfString(truncated + '...') > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
      }
      return truncated + '...';
    };

    for (const payroll of payrolls) {
      // Check if we need a new page
      if (y > 500) {
        doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
        y = 40;
        
        // Redraw header on new page
        currentX = 40;
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Emp ID', currentX, y, { width: colWidths.empId, align: 'left' });
        currentX += colWidths.empId;
        doc.text('Name', currentX, y, { width: colWidths.name, align: 'left' });
        currentX += colWidths.name;
        doc.text('Department', currentX, y, { width: colWidths.dept, align: 'left' });
        currentX += colWidths.dept;
        doc.text('Hours', currentX, y, { width: colWidths.hours, align: 'right' });
        currentX += colWidths.hours;
        doc.text('OT', currentX, y, { width: colWidths.overtime, align: 'right' });
        currentX += colWidths.overtime;
        doc.text('Earnings', currentX, y, { width: colWidths.earnings, align: 'right' });
        currentX += colWidths.earnings;
        doc.text('Deductions', currentX, y, { width: colWidths.deductions, align: 'right' });
        currentX += colWidths.deductions;
        doc.text('Net Pay', currentX, y, { width: colWidths.netPay, align: 'right' });
        
        doc.moveTo(40, y + 12).lineTo(760, y + 12).stroke();
        y += 20;
        doc.font('Helvetica').fontSize(8);
      }

      currentX = 40;
      
      doc.text(payroll.employee?.employeeId || '', currentX, y, { width: colWidths.empId, align: 'left' });
      currentX += colWidths.empId;
      
      const fullName = `${payroll.employee?.firstName || ''} ${payroll.employee?.lastName || ''}`.trim();
      doc.text(truncateText(fullName, colWidths.name), currentX, y, { width: colWidths.name, align: 'left' });
      currentX += colWidths.name;
      
      const deptName = payroll.employee?.department || '';
      doc.text(truncateText(deptName, colWidths.dept), currentX, y, { width: colWidths.dept, align: 'left' });
      currentX += colWidths.dept;
      
      doc.text(payroll.workHours.totalHours.toFixed(1), currentX, y, { width: colWidths.hours, align: 'right' });
      currentX += colWidths.hours;
      
      doc.text(payroll.workHours.overtimeHours.toFixed(1), currentX, y, { width: colWidths.overtime, align: 'right' });
      currentX += colWidths.overtime;
      
      doc.text(payroll.earnings.total.toLocaleString('en-NG', { minimumFractionDigits: 2 }), currentX, y, { width: colWidths.earnings, align: 'right' });
      currentX += colWidths.earnings;
      
      doc.text(payroll.deductions.total.toLocaleString('en-NG', { minimumFractionDigits: 2 }), currentX, y, { width: colWidths.deductions, align: 'right' });
      currentX += colWidths.deductions;
      
      doc.text(payroll.netPay.toLocaleString('en-NG', { minimumFractionDigits: 2 }), currentX, y, { width: colWidths.netPay, align: 'right' });

      y += 15;
    }

    // Footer
    doc.fontSize(8).font('Helvetica').fillColor('gray');
    doc.text(
      `Generated on ${moment().format('MMMM D, YYYY [at] h:mm A')}`,
      40,
      doc.page.height - 50,
      { align: 'center' }
    );

    // Finalize the PDF
    doc.end();

  } catch (error) {
    console.error('Payroll PDF generation error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate payroll PDF report',
        error: error.message
      });
    }
  }
};
