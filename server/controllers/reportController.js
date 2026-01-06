const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const moment = require('moment');
const PDFDocument = require('pdfkit');

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
      // Only checked in, no checkout - mark as incomplete ONLY if not already late/excused
      if (attendanceItem.status === 'present') {
        attendanceItem.status = 'incomplete';
      }
      // If status is already 'late' or 'excused', preserve it
    }
  }

  return Array.from(attendanceMap.values());
};

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

    // Calculate statistics
    const stats = {
      totalEmployees: allEmployees.length,
      present: attendanceRecords.filter(a => ['present', 'late', 'excused'].includes(a.status)).length,
      absent: absentEmployees.length,
      late: attendanceRecords.filter(a => a.status === 'late').length,
      excused: attendanceRecords.filter(a => a.status === 'excused').length,
      incomplete: attendanceRecords.filter(a => a.status === 'incomplete').length,
      halfDay: attendanceRecords.filter(a => a.status === 'half-day').length
    };

    res.json({
      success: true,
      data: {
        date: reportDate,
        statistics: stats,
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
    const { month, year, facility, employeeId } = req.query;
    
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
    
    // Calculate attendance percentages
    for (const [employeeId, summary] of employeeSummary) {
      const totalWorkingDays = summary.attendance.totalDays;
      const presentDays = summary.attendance.present;
      summary.attendance.attendancePercentage = totalWorkingDays > 0 
        ? Math.round((presentDays / totalWorkingDays) * 100 * 100) / 100 
        : 0;
      summary.attendance.totalWorkHours = Math.round(summary.attendance.totalWorkHours * 100) / 100;
      summary.attendance.totalOvertime = Math.round(summary.attendance.totalOvertime * 100) / 100;
    }
    
    const finalRecords = Array.from(employeeSummary.values());
    
    // Calculate overall statistics
    const statistics = {
      totalEmployees: finalRecords.length,
      present: finalRecords.reduce((sum, emp) => sum + emp.attendance.present, 0),
      absent: finalRecords.reduce((sum, emp) => sum + emp.attendance.absent, 0),
      late: finalRecords.reduce((sum, emp) => sum + emp.attendance.late, 0),
      halfDay: finalRecords.reduce((sum, emp) => sum + emp.attendance.halfDay, 0),
      onLeave: finalRecords.reduce((sum, emp) => sum + emp.attendance.onLeave, 0),
      excused: finalRecords.reduce((sum, emp) => sum + emp.attendance.excused, 0),
      incomplete: 0, // Monthly reports don't track incomplete
      totalWorkHours: Math.round(finalRecords.reduce((sum, emp) => sum + emp.attendance.totalWorkHours, 0) * 100) / 100,
      totalOvertime: Math.round(finalRecords.reduce((sum, emp) => sum + emp.attendance.totalOvertime, 0) * 100) / 100,
      averageWorkHours: finalRecords.length > 0 
        ? Math.round((finalRecords.reduce((sum, emp) => sum + emp.attendance.totalWorkHours, 0) / finalRecords.length) * 100) / 100
        : 0
    };
    
    res.json({
      success: true,
      data: {
        month: reportMonth,
        year: reportYear,
        period: `${moment(`${reportYear}-${reportMonth}-01`).format('MMMM YYYY')}`,
        totalEmployees: finalRecords.length,
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
    const { startDate, endDate, facility, department, status } = req.query;
    
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
    
    // Calculate summary statistics
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
    
    // Also create statistics object for frontend compatibility
    const statistics = {
      totalEmployees: new Set(aggregatedRecords.map(r => r.employee._id.toString())).size,
      present: summary.present,
      absent: summary.absent,
      late: summary.late,
      halfDay: summary.halfDay,
      onLeave: summary.onLeave,
      excused: summary.excused,
      incomplete: summary.incomplete,
      totalWorkHours: summary.totalWorkHours,
      totalOvertime: summary.totalOvertime,
      averageWorkHours: summary.averageWorkHours
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
// @route   GET /api/reports/pdf
// @access  Private
exports.generatePDFReport = async (req, res) => {
  try {
    const { type = 'daily', date, facility, month, year } = req.query;
    
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
      
      const statistics = {
        totalEmployees: finalRecords.length,
        present: finalRecords.reduce((sum, emp) => sum + emp.attendance.present, 0),
        absent: finalRecords.reduce((sum, emp) => sum + emp.attendance.absent, 0),
        late: finalRecords.reduce((sum, emp) => sum + emp.attendance.late, 0),
        excused: finalRecords.reduce((sum, emp) => sum + emp.attendance.excused, 0),
        incomplete: 0,
        totalWorkHours: Math.round(finalRecords.reduce((sum, emp) => sum + emp.attendance.totalWorkHours, 0) * 100) / 100,
        totalOvertime: Math.round(finalRecords.reduce((sum, emp) => sum + emp.attendance.totalOvertime, 0) * 100) / 100
      };
      
      reportData = {
        statistics,
        records: finalRecords
      };
      
      reportTitle = `Monthly Attendance Report - ${moment(`${reportYear}-${reportMonth}-01`).format('MMMM YYYY')}`;
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
      
      const statistics = {
        totalEmployees: new Set(aggregatedRecords.map(r => r.employee._id.toString())).size,
        present: aggregatedRecords.filter(r => r.status === 'present').length,
        absent: aggregatedRecords.filter(r => r.status === 'absent').length,
        late: aggregatedRecords.filter(r => r.status === 'late').length,
        excused: aggregatedRecords.filter(r => r.status === 'excused').length,
        incomplete: aggregatedRecords.filter(r => r.status === 'incomplete').length,
        totalWorkHours: Math.round(aggregatedRecords.reduce((sum, r) => sum + (r.workHours || 0), 0) * 100) / 100,
        totalOvertime: Math.round(aggregatedRecords.reduce((sum, r) => sum + (r.overtime || 0), 0) * 100) / 100
      };
      
      reportData = {
        statistics,
        records: aggregatedRecords
      };
      
      reportTitle = `Custom Attendance Report - ${moment(startDate).format('MMM DD')} to ${moment(endDate).format('MMM DD, YYYY')}`;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type. Supported types: daily, monthly, custom'
      });
    }
    
    // Validate report data was generated
    if (!reportData || !reportData.statistics) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate report data'
      });
    }
    
    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Handle PDF stream errors
    let pdfError = false;
    doc.on('error', (err) => {
      console.error('PDF document error:', err);
      pdfError = true;
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'PDF generation failed',
          error: err.message
        });
      }
    });
    
    res.on('error', (err) => {
      console.error('Response stream error:', err);
      pdfError = true;
    });
    
    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report_${type}_${moment().format('YYYY-MM-DD')}.pdf"`);
    
    // Pipe the PDF to response
    doc.pipe(res);
    
    // Stop processing if there was an error
    if (pdfError) {
      return;
    }
    
    // Add header
    doc.fontSize(20).text('SABS Attendance System', 50, 50);
    doc.fontSize(16).text(reportTitle, 50, 80);
    doc.fontSize(10).text(`Generated: ${moment().format('MMM DD, YYYY hh:mm A')}`, 50, 105);
    
    // Add line
    doc.moveTo(50, 125).lineTo(550, 125).stroke();
    
    let yPosition = 150;
    
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
    
    statisticsData.forEach((text) => {
      doc.fontSize(10).text(text, 70, yPosition);
      yPosition += 15;
    });
    
    yPosition += 20;
    
    // Add attendance records table
    if (reportData.records && reportData.records.length > 0) {
      doc.fontSize(14).text('Attendance Records', 50, yPosition);
      yPosition += 25;
      
      // Table headers
      const tableHeaders = ['ID', 'Name', 'Dept', 'Check In', 'Check Out', 'Hours', 'Status'];
      const columnWidths = [60, 120, 80, 70, 70, 60, 70];
      let xPosition = 50;
      
      // Draw header row
      doc.fontSize(9).fillColor('black');
      tableHeaders.forEach((header, i) => {
        doc.rect(xPosition, yPosition, columnWidths[i], 20).stroke();
        doc.text(header, xPosition + 5, yPosition + 5);
        xPosition += columnWidths[i];
      });
      yPosition += 20;
      
      // Draw data rows
      reportData.records.slice(0, 25).forEach((record) => { // Limit to 25 records for PDF
        xPosition = 50;
        const rowData = [
          record.employee?.employeeId || '-',
          `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim().substring(0, 15) || '-',
          record.employee?.department?.substring(0, 10) || '-',
          record.checkIn?.time ? moment(record.checkIn.time).format('HH:mm') : '-',
          record.checkOut?.time ? moment(record.checkOut.time).format('HH:mm') : '-',
          record.workHours ? `${record.workHours.toFixed(1)}h` : '-',
          record.status || '-'
        ];
        
        rowData.forEach((text, i) => {
          doc.rect(xPosition, yPosition, columnWidths[i], 15).stroke();
          doc.fontSize(8).text(text, xPosition + 2, yPosition + 2);
          xPosition += columnWidths[i];
        });
        yPosition += 15;
        
        // Check if we need a new page
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
      });
    }
    
    // Add absent employees if any
    if (reportData.absentEmployees && reportData.absentEmployees.length > 0) {
      yPosition += 30;
      
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.fontSize(14).fillColor('red').text('Absent Employees', 50, yPosition);
      yPosition += 25;
      
      reportData.absentEmployees.slice(0, 15).forEach((employee) => { // Limit absent list
        const employeeName = `${employee.employeeId} - ${employee.firstName} ${employee.lastName} (${employee.department || 'N/A'})`;
        doc.fontSize(10).fillColor('black').text(employeeName, 70, yPosition);
        yPosition += 15;
        
        if (yPosition > 720) {
          doc.addPage();
          yPosition = 50;
        }
      });
    }
    
    // Add footer
    const pageHeight = doc.page.height;
    doc.fontSize(8).fillColor('gray')
       .text('Generated by SABS Attendance System', 50, pageHeight - 50)
       .text(`Page generated on ${moment().format('MMM DD, YYYY hh:mm A')}`, 50, pageHeight - 35);
    
    // Finalize the PDF
    doc.end();
    
  } catch (error) {
    console.error('PDF generation error:', error);
    
    // Only send JSON error if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate PDF report',
        error: error.message
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
