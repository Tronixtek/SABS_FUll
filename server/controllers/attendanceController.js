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
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // Filter by user's accessible facilities
    if (req.user.role !== 'super-admin' && req.user.facilities.length > 0) {
      query.facility = { $in: req.user.facilities };
    }
    
    const skip = (page - 1) * limit;
    
    const attendance = await Attendance.find(query)
      .populate('employee', 'employeeId firstName lastName department profileImage')
      .populate('facility', 'name code')
      .populate('shift', 'name code')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ date: -1, 'checkIn.time': -1 });
    
    const total = await Attendance.countDocuments(query);
    
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
