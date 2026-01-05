const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Development only (or with special setup key in production)
exports.register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role, facilities, developerKey } = req.body;

    // Enhanced security logging
    console.log(`[SECURITY] User registration attempt - Role: ${role || 'viewer'}, Environment: ${process.env.NODE_ENV}, IP: ${req.ip || 'unknown'}`);

    // Validate developer key for super-admin role
    if (role === 'super-admin') {
      const requiredDeveloperKey = process.env.DEVELOPER_KEY || 'dev-secret-2025-sabs';
      if (!developerKey || developerKey !== requiredDeveloperKey) {
        console.log(`[SECURITY] Failed super-admin creation attempt - Invalid developer key from IP: ${req.ip || 'unknown'}`);
        return res.status(403).json({
          success: false,
          message: 'Invalid or missing developer key. Super admin creation requires valid developer access.',
          securityNote: 'This action has been logged for security purposes.'
        });
      }
      console.log(`[SECURITY] Super-admin user creation authorized with valid developer key`);
    }

    // Validate developer key for super-admin role
    if (role === 'super-admin') {
      const requiredDeveloperKey = process.env.DEVELOPER_KEY || 'dev-secret-2025-sabs';
      if (!developerKey || developerKey !== requiredDeveloperKey) {
        console.log(`[SECURITY] Failed super-admin creation attempt - Invalid developer key`);
        return res.status(403).json({
          success: false,
          message: 'Invalid or missing developer key. Super admin creation requires valid developer access.',
          securityNote: 'This action has been logged for security purposes.'
        });
      }
    }

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Set default permissions based on role
    let permissions = [];
    switch (role) {
      case 'admin':
        permissions = [
          'view_attendance', 'edit_attendance', 'delete_attendance',
          'manage_employees', 'manage_facilities', 'manage_shifts',
          'view_reports', 'export_data', 'manage_users'
        ];
        break;
      case 'manager':
        permissions = [
          'view_attendance', 'edit_attendance',
          'manage_employees', 'view_reports', 'export_data'
        ];
        break;
      case 'hr':
        permissions = [
          'view_attendance', 'manage_employees', 'view_reports', 'export_data'
        ];
        break;
      default:
        permissions = ['view_attendance', 'view_reports'];
    }

    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role || 'viewer',
      facilities: facilities || [],
      permissions
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          facilities: user.facilities,
          permissions: user.permissions
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    // Find user
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    }).select('+password').populate('facilities');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact administrator.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          facilities: user.facilities,
          permissions: user.permissions
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('facilities');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      data: { token },
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
