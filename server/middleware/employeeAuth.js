const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

// Protect employee routes - verify employee JWT token
exports.protectEmployee = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If no token found
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Please log in.'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get employee from token (include pin for PIN change operations)
    req.employee = await Employee.findById(decoded.id).select('+pin');

    // Check if employee exists
    if (!req.employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if employee is deleted
    if (req.employee.isDeleted) {
      return res.status(403).json({
        success: false,
        message: 'This employee account has been deactivated'
      });
    }

    // Check if employee account is active
    if (req.employee.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Employee account is ${req.employee.status}. Please contact HR.`
      });
    }

    // Check if self-service is enabled
    if (!req.employee.employeeSelfServiceEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Self-service portal is not enabled for your account. Please contact HR.'
      });
    }

    next();
  } catch (error) {
    console.error('Employee auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Token invalid or expired.'
    });
  }
};
