const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - check if user is authenticated
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user || req.user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists or is inactive'
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Check user role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Check specific permission
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        message: `You don't have permission to ${permission}`
      });
    }
    next();
  };
};

// Middleware to restrict super-admin creation in production
exports.restrictInProduction = (req, res, next) => {
  // Allow in development mode
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Only restrict super-admin creation, allow other roles
  const { role } = req.body;
  
  if (role !== 'super-admin') {
    // Allow registration for admin, manager, hr, viewer roles
    return next();
  }

  // For super-admin creation in production, require special authorization header
  const authHeader = req.headers['x-admin-setup'];
  const setupKey = process.env.ADMIN_SETUP_KEY || 'admin-setup-secret-2025';
  
  if (!authHeader || authHeader !== setupKey) {
    return res.status(403).json({
      success: false,
      message: 'Super Admin creation is restricted in production. Only developers can create super-admin accounts.',
      hint: 'If you need to create a super-admin user, please contact a developer with the required authorization.',
      documentation: 'See deployment guide for super-admin setup instructions.'
    });
  }

  // Log the production super-admin setup attempt for security monitoring
  console.log(`[SECURITY] Production super-admin setup attempted from IP: ${req.ip || 'unknown'}`);
  next();
};
