const express = require('express');
const router = express.Router();
const { 
  syncEmployeeFromJava, 
  updateDeviceStatus, 
  testIntegration, 
  getIntegrationStatus,
  enrollEmployeeInDevice,
  getDeviceAttendance
} = require('../controllers/integrationController');
const { protect } = require('../middleware/auth');

// Service-to-Service authentication middleware
const serviceAuth = (req, res, next) => {
  const serviceAuthKey = req.header('X-Service-Auth');
  const expectedKey = process.env.JAVA_SERVICE_AUTH_KEY || 'java-service-auth-key-2025';

  if (!serviceAuthKey || serviceAuthKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      message: 'Invalid service authentication'
    });
  }

  next();
};

// @desc    Test integration connectivity (public for debugging)
// @route   GET /api/integration/test
// @access  Public
router.get('/test', testIntegration);

// @desc    Sync employee from Java service
// @route   POST /api/integration/employee/sync
// @access  Service-to-Service (Java Service Auth)
router.post('/employee/sync', serviceAuth, syncEmployeeFromJava);

// @desc    Update device status from Java service
// @route   POST /api/integration/device/status
// @access  Service-to-Service (Java Service Auth)
router.post('/device/status', serviceAuth, updateDeviceStatus);

// @desc    Get integration status (requires user authentication)
// @route   GET /api/integration/status
// @access  Protected (Admin)
router.get('/status', protect, getIntegrationStatus);

// @desc    Enroll employee in device via Java service
// @route   POST /api/integration/enroll-employee
// @access  Protected (Admin)
router.post('/enroll-employee', protect, enrollEmployeeInDevice);

// @desc    Get attendance from device via Java service
// @route   POST /api/integration/get-device-attendance
// @access  Protected (Admin)
router.post('/get-device-attendance', protect, getDeviceAttendance);

module.exports = router;