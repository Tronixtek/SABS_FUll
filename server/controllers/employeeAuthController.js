const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

// Generate JWT token for employee
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '24h' // Employee tokens expire in 24 hours
  });
};

// @desc    Employee login
// @route   POST /api/employee-auth/login
// @access  Public
exports.employeeLogin = async (req, res) => {
  try {
    const { staffId, pin } = req.body;

    // Validate input
    if (!staffId || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Staff ID and PIN'
      });
    }

    // Find employee by staffId and include pin field
    const employee = await Employee.findOne({ staffId: staffId.toUpperCase() })
      .select('+pin')
      .populate('facility', 'facilityName facilityCode');

    // Check if employee exists
    if (!employee) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Staff ID or PIN'
      });
    }

    // Check if employee is deleted
    if (employee.isDeleted) {
      return res.status(403).json({
        success: false,
        message: 'This employee account has been deactivated. Please contact HR.'
      });
    }

    // Check if employee account is active
    if (employee.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Your account is ${employee.status}. Please contact HR for assistance.`
      });
    }

    // Check if self-service is enabled
    if (!employee.employeeSelfServiceEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Self-service portal is not enabled for your account. Please contact HR.'
      });
    }

    // Check if PIN is set
    if (!employee.pin) {
      return res.status(403).json({
        success: false,
        message: 'No PIN has been set for your account. Please contact HR.'
      });
    }

    // Check if account is locked
    if (employee.pinLockedUntil && employee.pinLockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((employee.pinLockedUntil - Date.now()) / 60000);
      return res.status(403).json({
        success: false,
        message: `Account locked due to multiple failed login attempts. Try again in ${minutesLeft} minute(s).`
      });
    }

    // Verify PIN
    const isPinCorrect = await employee.comparePin(pin);

    if (!isPinCorrect) {
      // Increment failed attempts
      employee.pinAttempts += 1;

      // Lock account after 5 failed attempts
      if (employee.pinAttempts >= 5) {
        employee.pinLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
        await employee.save({ validateModifiedOnly: true });

        return res.status(403).json({
          success: false,
          message: 'Account locked due to multiple failed login attempts. Please try again in 30 minutes or contact HR.'
        });
      }

      await employee.save({ validateModifiedOnly: true });

      return res.status(401).json({
        success: false,
        message: `Invalid Staff ID or PIN. ${5 - employee.pinAttempts} attempt(s) remaining.`
      });
    }

    // Successful login - reset attempts and update last login
    employee.pinAttempts = 0;
    employee.pinLockedUntil = null;
    employee.lastEmployeeLogin = Date.now();
    await employee.save({ validateModifiedOnly: true });

    // Generate token
    const token = generateToken(employee._id);

    res.status(200).json({
      success: true,
      token,
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        staffId: employee.staffId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        facility: employee.facility,
        department: employee.department,
        designation: employee.designation,
        profilePhoto: employee.profilePhoto,
        pinMustChange: employee.pinMustChange
      }
    });
  } catch (error) {
    console.error('Employee login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in. Please try again.'
    });
  }
};

// @desc    Change employee PIN
// @route   PUT /api/employee-auth/change-pin
// @access  Private (Employee)
exports.changePin = async (req, res) => {
  try {
    const { currentPin, newPin } = req.body;

    // Validate input
    if (!currentPin || !newPin) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current PIN and new PIN'
      });
    }

    // Validate new PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(newPin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be 4-6 digits'
      });
    }

    // Get employee with PIN field (already loaded in protectEmployee middleware)
    const employee = req.employee;

    // Verify current PIN
    const isPinCorrect = await employee.comparePin(currentPin);

    if (!isPinCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Current PIN is incorrect'
      });
    }

    // Update PIN
    employee.pin = newPin;
    employee.pinMustChange = false;
    await employee.save({ validateModifiedOnly: true });

    res.status(200).json({
      success: true,
      message: 'PIN changed successfully'
    });
  } catch (error) {
    console.error('Change PIN error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing PIN. Please try again.'
    });
  }
};

// @desc    Get current employee info
// @route   GET /api/employee-auth/me
// @access  Private (Employee)
exports.getMe = async (req, res) => {
  try {
    const employee = await Employee.findById(req.employee.id)
      .populate('facility', 'facilityName facilityCode timezone')
      .populate('shift', 'shiftName startTime endTime');

    res.status(200).json({
      success: true,
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        staffId: employee.staffId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        fullName: employee.fullName,
        email: employee.email,
        phone: employee.phone,
        facility: employee.facility,
        department: employee.department,
        designation: employee.designation,
        cadre: employee.cadre,
        gradeLevel: employee.gradeLevel,
        shift: employee.shift,
        gender: employee.gender,
        profileImage: employee.profileImage,
        pinMustChange: employee.pinMustChange,
        lastEmployeeLogin: employee.lastEmployeeLogin
      }
    });
  } catch (error) {
    console.error('Get employee info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee information'
    });
  }
};

// @desc    Get employee's own attendance records
// @route   GET /api/employee-auth/my-attendance
// @access  Private (Employee)
exports.getMyAttendance = async (req, res) => {
  try {
    const Attendance = require('../models/Attendance');
    const { startDate, endDate } = req.query;

    // Build query
    const query = { employeeId: req.employee.employeeId };

    // Add date range if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Fetch attendance records
    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    console.error('Get my attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records'
    });
  }
};
