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
    console.log(`[SECURITY] User registration attempt - Role: ${role || 'hr'}, Environment: ${process.env.NODE_ENV}, IP: ${req.ip || 'unknown'}`);

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

    // Validate that only super-admin can create admin users
    if (role === 'admin') {
      // Check if request is from authenticated super-admin
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(403).json({
          success: false,
          message: 'Admin users can only be created by Super Admin. Please login as Super Admin first.'
        });
      }

      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const requestingUser = await User.findById(decoded.id);

        if (!requestingUser || requestingUser.role !== 'super-admin') {
          console.log(`[SECURITY] Unauthorized admin creation attempt from user: ${requestingUser?.username || 'unknown'}`);
          return res.status(403).json({
            success: false,
            message: 'Only Super Admin can create Admin users.'
          });
        }
        console.log(`[SECURITY] Admin user creation authorized by super-admin: ${requestingUser.username}`);
      } catch (error) {
        return res.status(403).json({
          success: false,
          message: 'Invalid authentication. Admin users can only be created by Super Admin.'
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

    // Validate facility-manager requirements
    if (role === 'facility-manager') {
      // Facility Manager must have at least one facility assigned
      if (!facilities || facilities.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Facility Manager role requires at least one facility to be assigned. Please select a facility.'
        });
      }

      // Check the 2-manager limit for each assigned facility
      for (const facilityId of facilities) {
        const managersCount = await User.countDocuments({
          role: 'facility-manager',
          facilities: facilityId,
          status: 'active'
        });

        if (managersCount >= 2) {
          return res.status(400).json({
            success: false,
            message: 'This facility already has the maximum of 2 managers. Please select a different facility or contact an admin.'
          });
        }
      }
    }

    // Set default permissions based on role
    let permissions = [];
    switch (role) {
      case 'super-admin':
        // Super admin gets all permissions
        permissions = [
          'view_attendance', 'edit_attendance', 'delete_attendance',
          'manage_employees', 'manage_facilities', 'manage_shifts',
          'view_reports', 'export_data', 'manage_users', 'system_settings',
          'enroll_users', 'manage_devices'
        ];
        break;
      case 'admin':
        // Admin has same privileges as super-admin
        permissions = [
          'view_attendance', 'edit_attendance', 'delete_attendance',
          'manage_employees', 'manage_facilities', 'manage_shifts',
          'view_reports', 'export_data', 'manage_users', 'system_settings',
          'enroll_users', 'manage_devices'
        ];
        break;
      case 'facility-manager':
        // Facility Manager can edit their assigned facilities, enroll users, edit facility info and devices
        // They CANNOT create new facilities (no manage_facilities permission)
        permissions = [
          'view_attendance', 'edit_attendance',
          'manage_employees', 'manage_shifts',
          'view_reports', 'export_data',
          'enroll_users', 'manage_devices', 'edit_facilities'
        ];
        break;
      case 'hr':
        // HR can view all records and download only (read-only access)
        permissions = [
          'view_attendance', 'view_reports', 'export_data'
        ];
        break;
      default:
        // Default to HR permissions for safety
        permissions = ['view_attendance', 'view_reports', 'export_data'];
    }

    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role || 'hr',
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

// @desc    Get all users (facility managers and HR only)
// @route   GET /api/auth/users
// @access  Private (admin/super-admin only)
exports.getUsers = async (req, res) => {
  try {
    // Only return facility-manager and hr users (exclude super-admin and admin for security)
    const users = await User.find({ 
      role: { $in: ['facility-manager', 'hr'] } 
    })
    .select('-password')
    .populate('facilities', 'name location')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
