const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const moment = require('moment');

// @desc    Get all attendance records
// @route   GET /api/attendance
// @access  Private
exports.getAttendance = async (req, res) => {
  try {
    const {
      facility,
      employee,
      startDate,
      endDate,
      status,
      page = 1,
      limit = 50
    } = req.query;
    
    const query = {};
    
    if (facility) query.facility = facility;
    if (employee) query.employee = employee;
    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }
    
    // Filter by user's accessible facilities
    if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
      if (req.user.facilities.length > 0) {
        query.facility = { $in: req.user.facilities };
      } else {
        // If no facilities assigned, return empty
        return res.json({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, pages: 0 }
        });
      }
    }
    
    console.log('🔍 Attendance query:', JSON.stringify(query, null, 2));
    
    const skip = (page - 1) * limit;
    
    // SPECIAL HANDLING FOR ON-LEAVE FILTER
    if (status === 'on-leave') {
      // Get approved leave requests for the date range
      const LeaveRequest = require('../models/LeaveRequest');
      const start = startDate ? new Date(startDate) : new Date();
      start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      
      const leaveQuery = {
        status: 'approved',
        $or: [
          { startDate: { $lte: end }, endDate: { $gte: start } }
        ]
      };
      
      const approvedLeaves = await LeaveRequest.find(leaveQuery)
        .select('employee leaveType reason startDate endDate')
        .populate({
          path: 'employee',
          select: 'employeeId firstName lastName department facility shift',
          populate: [
            { path: 'facility', select: 'name code' },
            { path: 'shift', select: 'name code startTime endTime' }
          ]
        })
        .limit(200) // Limit to avoid fetching thousands
        .lean(); // Use lean for faster queries
      
      // Filter by facility if specified
      let onLeaveRecords = approvedLeaves
        .filter(leave => leave.employee)
        .filter(leave => !facility || leave.employee.facility?._id.toString() === facility);
      
      // Generate leave records for each day
      const leaveAttendanceRecords = [];
      for (const leave of onLeaveRecords) {
        const leaveStart = new Date(Math.max(leave.startDate, start));
        const leaveEnd = new Date(Math.min(leave.endDate, end));
        
        for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
          leaveAttendanceRecords.push({
            _id: `leave-${leave.employee._id}-${d.getTime()}`,
            employee: leave.employee,
            facility: leave.employee.facility,
            shift: leave.employee.shift,
            date: new Date(d),
            status: leave.leaveType === 'half-day' ? 'half-day' : 'on-leave',
            leaveType: leave.leaveType,
            leaveReason: leave.reason,
            workHours: 0,
            checkIn: {},
            checkOut: {},
            breaks: []
          });
        }
      }
      
      const total = leaveAttendanceRecords.length;
      const paginatedLeave = leaveAttendanceRecords.slice(skip, skip + parseInt(limit));
      
      return res.json({
        success: true,
        data: paginatedLeave,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }
    
    // SPECIAL HANDLING FOR ABSENT FILTER
    if (status === 'absent') {
      // Get all employees for the facility and date range
      const employeeQuery = {};
      if (facility) employeeQuery.facility = facility;
      if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
        if (req.user.facilities.length > 0) {
          employeeQuery.facility = { $in: req.user.facilities };
        }
      }
      employeeQuery.status = 'active';
      
      const allEmployees = await Employee.find(employeeQuery)
        .select('employeeId firstName lastName department facility shift')
        .populate('facility', 'name code')
        .populate('shift', 'name code startTime endTime')
        .limit(500) // Limit to avoid fetching thousands
        .lean(); // Use lean for faster queries
      
      // Get date range
      const start = startDate ? new Date(startDate) : new Date();
      start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      
      // Limit date range to max 31 days
      const maxDays = 31;
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (daysDiff > maxDays) {
        end.setTime(start.getTime() + maxDays * 24 * 60 * 60 * 1000);
      }
      
      // Generate dates array
      const dates = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
      
      // Find all existing attendance records for this period
      const existingAttendance = await Attendance.find({
        ...query,
        status: { $ne: 'absent' } // Exclude existing absent records
      }).select('employee date');
      
      const attendedSet = new Set();
      existingAttendance.forEach(att => {
        const key = `${att.employee}-${att.date.toISOString().split('T')[0]}`;
        attendedSet.add(key);
      });
      
      // Generate absent records for employees who didn't check in
      const absentRecords = [];
      for (const emp of allEmployees) {
        for (const date of dates) {
          const key = `${emp._id}-${date.toISOString().split('T')[0]}`;
          if (!attendedSet.has(key)) {
            absentRecords.push({
              _id: `absent-${emp._id}-${date.getTime()}`,
              employee: emp,
              facility: emp.facility,
              shift: emp.shift,
              date: new Date(date),
              scheduledCheckIn: null,
              scheduledCheckOut: null,
              status: 'absent',
              workHours: 0,
              overtime: 0,
              undertime: 0,
              lateMinutes: 0,
              checkIn: {},
              checkOut: {},
              breaks: []
            });
          }
        }
      }
      
      const total = absentRecords.length;
      const paginatedAbsent = absentRecords.slice(skip, skip + parseInt(limit));
      
      return res.json({
        success: true,
        data: paginatedAbsent,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }
    
    // Get attendance records and group by employee+date to combine check-in/check-out
    const rawAttendance = await Attendance.find(query)
      .populate('employee', 'employeeId firstName lastName department profileImage')
      .populate('facility', 'name code')
      .populate('shift', 'name code startTime endTime')
      .sort({ date: -1, timestamp: -1 })
      .limit(parseInt(limit) * 2) // Limit raw records to avoid fetching thousands
      .lean(); // Use lean for faster queries
    
    // GENERATE ABSENT RECORDS for employees who didn't check in (for "All Status" view)
    // This ensures we always show all employees, not just those who checked in
    let absentRecordsToAdd = [];
    
    // Only generate absent records if we're looking at a specific date range
    if (startDate || endDate) {
      const employeeQuery = {};
      if (facility) employeeQuery.facility = facility;
      if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
        if (req.user.facilities.length > 0) {
          employeeQuery.facility = { $in: req.user.facilities };
        }
      }
      employeeQuery.status = 'active';
      
      const allEmployees = await Employee.find(employeeQuery)
        .select('employeeId firstName lastName department facility shift')
        .populate('facility', 'name code')
        .populate('shift', 'name code startTime endTime')
        .limit(500) // Limit to avoid fetching thousands
        .lean(); // Use lean for faster queries
      
      // Get date range
      const start = startDate ? new Date(startDate) : new Date();
      start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      
      // Limit date range to max 31 days
      const maxDays = 31;
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (daysDiff > maxDays) {
        end.setTime(start.getTime() + maxDays * 24 * 60 * 60 * 1000);
      }
      
      // Generate dates array
      const dates = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
      
      // Create a set of employee-date combinations that have attendance
      const attendedSet = new Set();
      rawAttendance.forEach(att => {
        if (att.employee && att.date) {
          const key = `${att.employee._id}-${att.date.toISOString().split('T')[0]}`;
          attendedSet.add(key);
        }
      });
      
      // Generate absent records for employees who didn't check in
      for (const emp of allEmployees) {
        for (const date of dates) {
          const key = `${emp._id}-${date.toISOString().split('T')[0]}`;
          if (!attendedSet.has(key)) {
            absentRecordsToAdd.push({
              _id: `absent-${emp._id}-${date.getTime()}`,
              employee: {
                _id: emp._id,
                employeeId: emp.employeeId,
                firstName: emp.firstName,
                lastName: emp.lastName,
                department: emp.department,
                profileImage: emp.profileImage
              },
              facility: emp.facility,
              shift: emp.shift,
              date: new Date(date),
              scheduledCheckIn: null,
              scheduledCheckOut: null,
              status: 'absent',
              workHours: 0,
              overtime: 0,
              undertime: 0,
              lateMinutes: 0,
              lateArrival: 0,
              checkIn: {},
              checkOut: {},
              breaks: []
            });
          }
        }
      }
    }
    
    // Group records by employee+date and combine check-in/check-out into single records
    const attendanceMap = new Map();
    
    rawAttendance.forEach(record => {
      // Skip records without employee data or date
      if (!record.employee || !record.employee._id || !record.date) {
        console.warn('⚠️ Skipping attendance record without employee/date data:', record._id);
        return;
      }
      
      const key = `${record.employee._id}-${record.date.toISOString().split('T')[0]}`;
      
      if (!attendanceMap.has(key)) {
        attendanceMap.set(key, {
          _id: record._id,
          employee: record.employee,
          facility: record.facility,
          shift: record.shift,
          date: record.date,
          scheduledCheckIn: record.scheduledCheckIn,
          scheduledCheckOut: record.scheduledCheckOut,
          status: record.status,
          workHours: 0,
          overtime: 0,
          undertime: 0,
          lateArrival: record.lateArrival || 0,
          lateMinutes: record.lateArrival || 0, // Add for frontend compatibility
          checkIn: {},
          checkOut: {},
          breaks: []
        });
      }
      
      const attendanceItem = attendanceMap.get(key);
      
      if (record.type === 'check-in') {
        attendanceItem.checkIn = {
          time: record.timestamp,
          deviceId: record.deviceIP || record.xo5Data?.deviceKey,
          method: record.xo5Data?.verificationMethod?.[0] || 'face',
          recordedBy: 'XO5-Device',
          xo5Data: record.xo5Data
        };
        // Update main record status if this check-in is late
        if (record.status === 'late') {
          attendanceItem.status = 'late';
          attendanceItem.lateArrival = record.lateArrival || 0;
          attendanceItem.lateMinutes = record.lateArrival || 0; // Add this for frontend compatibility
        }
      } else if (record.type === 'check-out') {
        attendanceItem.checkOut = {
          time: record.timestamp,
          deviceId: record.deviceIP || record.xo5Data?.deviceKey,
          method: record.xo5Data?.verificationMethod?.[0] || 'face',
          recordedBy: 'XO5-Device',
          xo5Data: record.xo5Data
        };
        
        // Don't calculate work hours here - will do it in final pass
      }
    });
    
    // Final pass: Calculate work hours for all records that have both check-in and check-out
    for (const [key, attendanceItem] of attendanceMap) {
      if (attendanceItem.checkIn.time && attendanceItem.checkOut.time) {
        const workMinutes = moment(attendanceItem.checkOut.time).diff(moment(attendanceItem.checkIn.time), 'minutes');
        attendanceItem.workHours = Math.max(0, workMinutes / 60);
        
        // Calculate overtime/undertime
        const expectedHours = attendanceItem.shift?.workingHours || 8;
        if (attendanceItem.workHours > expectedHours) {
          attendanceItem.overtime = attendanceItem.workHours - expectedHours;
        } else if (attendanceItem.workHours < expectedHours - 1) { // 1 hour grace
          attendanceItem.undertime = expectedHours - attendanceItem.workHours;
        }
        
        console.log(`📊 Calculated work hours for ${attendanceItem.employee.firstName}: ${attendanceItem.workHours.toFixed(2)}h (${workMinutes} minutes)`);
      } else if (!attendanceItem.checkOut.time && attendanceItem.checkIn.time) {
        // Only checked in, no checkout - check if there's an approved leave that excuses this
        const hasLeave = attendanceItem.leaveRequest || attendanceItem.status === 'on-leave';
        
        if (hasLeave) {
          // Employee has approved leave (e.g., official assignment) - preserve current status
          // If status is 'late', keep it (they were late before the official duty)
          // If status is 'on-leave', keep it (they were on leave all day)
          console.log(`📅 Missing checkout excused by approved leave: ${attendanceItem.employee.firstName} - Status: ${attendanceItem.status}`);
        } else if (attendanceItem.status === 'present') {
          // No leave and no checkout - mark as incomplete only if status is 'present'
          attendanceItem.status = 'incomplete';
        }
        // If status is 'late' without leave, preserve it (they were late and didn't checkout)
      }
    }
    
    // Add absent records to the map
    absentRecordsToAdd.forEach(absentRecord => {
      const key = `${absentRecord.employee._id}-${absentRecord.date.toISOString().split('T')[0]}`;
      if (!attendanceMap.has(key)) {
        attendanceMap.set(key, absentRecord);
      }
    });
    
    // Convert map to array and apply pagination
    const attendance = Array.from(attendanceMap.values())
      .slice(skip, skip + parseInt(limit));
    
    const total = attendanceMap.size;
    
    res.json({
      success: true,
      data: attendance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error in getAttendance:', error);
    console.error('Query parameters:', req.query);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single attendance record
// @route   GET /api/attendance/:id
// @access  Private
exports.getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('employee')
      .populate('facility')
      .populate('shift')
      .populate('approvedBy', 'firstName lastName');
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create manual attendance entry
// @route   POST /api/attendance
// @access  Private
exports.createAttendance = async (req, res) => {
  try {
    const attendanceData = {
      ...req.body,
      isManualEntry: true,
      approvedBy: req.user.id
    };
    
    // Check if attendance already exists for this employee and date
    const existingAttendance = await Attendance.findOne({
      employee: req.body.employee,
      date: new Date(req.body.date)
    });
    
    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance record already exists for this date'
      });
    }
    
    const attendance = await Attendance.create(attendanceData);
    await attendance.populate('employee facility shift');
    
    res.status(201).json({
      success: true,
      data: attendance,
      message: 'Attendance record created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  Private
exports.updateAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        approvedBy: req.user.id
      },
      {
        new: true,
        runValidators: true
      }
    ).populate('employee facility shift');
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    res.json({
      success: true,
      data: attendance,
      message: 'Attendance record updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Private
exports.deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get attendance summary
// @route   GET /api/attendance/summary/:employeeId
// @access  Private
exports.getAttendanceSummary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : moment().startOf('month').toDate();
    const end = endDate ? new Date(endDate) : moment().endOf('month').toDate();
    
    const summary = await Attendance.getAttendanceSummary(employeeId, start, end);
    
    // Get total working days
    const totalDays = await Attendance.countDocuments({
      employee: employeeId,
      date: { $gte: start, $lte: end }
    });
    
    res.json({
      success: true,
      data: {
        summary,
        totalDays,
        dateRange: { start, end }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark absence
// @route   POST /api/attendance/absence
// @access  Private
exports.markAbsence = async (req, res) => {
  try {
    const { employeeId, date, reason } = req.body;
    
    const employee = await Employee.findById(employeeId).populate('shift facility');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    const attendanceDate = new Date(date);
    
    const attendance = await Attendance.create({
      employee: employeeId,
      facility: employee.facility._id,
      date: attendanceDate,
      shift: employee.shift._id,
      scheduledCheckIn: moment(attendanceDate).hours(employee.shift.startTime.split(':')[0]).minutes(employee.shift.startTime.split(':')[1]).toDate(),
      scheduledCheckOut: moment(attendanceDate).hours(employee.shift.endTime.split(':')[0]).minutes(employee.shift.endTime.split(':')[1]).toDate(),
      status: 'absent',
      notes: reason,
      isManualEntry: true,
      approvedBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: attendance,
      message: 'Absence marked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
