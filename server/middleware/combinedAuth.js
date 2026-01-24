// Middleware to allow both staff and employee authentication
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');

exports.protectBoth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Please log in.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Try to find as employee first
    const employee = await Employee.findById(decoded.id);
    if (employee && employee.status === 'active') {
      req.employee = employee;
      req.user = null;
      return next();
    }
    
    // Try to find as user/staff
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.status === 'active') {
      req.user = user;
      req.employee = null;
      return next();
    }
    
    // Neither found or both inactive
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Account not found or inactive.'
    });
    
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Invalid or expired token.'
    });
  }
};
