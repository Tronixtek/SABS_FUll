// Middleware to allow both staff and employee authentication
const { protect } = require('./auth');
const { protectEmployee } = require('./employeeAuth');

exports.protectBoth = async (req, res, next) => {
  // Check for employee token first
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Please log in.'
    });
  }

  // Try employee authentication first
  try {
    await protectEmployee(req, res, () => {});
    // If successful, employee is set in req.employee
    if (req.employee) {
      req.user = null; // No staff user
      return next();
    }
  } catch (error) {
    // Employee auth failed, try staff auth
  }

  // Try staff authentication
  try {
    await protect(req, res, () => {});
    // If successful, user is set in req.user
    if (req.user) {
      req.employee = null; // No employee
      return next();
    }
  } catch (error) {
    // Both failed
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Invalid or expired token.'
    });
  }

  next();
};
