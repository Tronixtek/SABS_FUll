const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const javaServiceClient = require('../services/javaServiceClient');

/**
 * @desc    Handle employee sync from Java service
 * @route   POST /api/integration/employee/sync
 * @access  Service-to-Service (Java Service Auth)
 */
const syncEmployeeFromJava = async (req, res) => {
  try {
    console.log('📥 Received employee sync from Java service:', req.body);

    const { employeeId, firstName, lastName, email, deviceId, facilityId } = req.body;

    // Validate required fields
    if (!employeeId || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required employee fields'
      });
    }

    // Check if employee already exists
    let employee = await Employee.findOne({ employeeId });

    if (employee) {
      // Update existing employee
      employee.deviceId = deviceId || employee.deviceId;
      employee.faceImageUploaded = req.body.faceImageUploaded || employee.faceImageUploaded;
      await employee.save();

      console.log('✅ Employee updated:', employeeId);
      return res.json({
        success: true,
        message: 'Employee updated successfully',
        data: employee
      });
    } else {
      // Create new employee (basic info, will need to be completed later)
      employee = new Employee({
        employeeId,
        firstName,
        lastName,
        email: email || `${employeeId}@company.com`,
        deviceId: deviceId || employeeId,
        facility: facilityId || '507f1f77bcf86cd799439011', // Default facility
        department: 'Unknown',
        designation: 'Employee',
        status: 'active',
        source: 'JAVA_SERVICE'
      });

      await employee.save();

      console.log('✅ New employee created:', employeeId);
      return res.json({
        success: true,
        message: 'Employee created successfully',
        data: employee
      });
    }

  } catch (error) {
    console.error('❌ Employee sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Employee sync failed',
      error: error.message
    });
  }
};

/**
 * @desc    Handle device status update from Java service
 * @route   POST /api/integration/device/status
 * @access  Service-to-Service (Java Service Auth)
 */
const updateDeviceStatus = async (req, res) => {
  try {
    console.log('📊 Received device status update:', req.body);

    const { deviceId, status, timestamp, metadata } = req.body;

    // Here you could update device status in a devices collection
    // For now, just log and respond
    
    console.log(`Device ${deviceId} status: ${status} at ${new Date(timestamp)}`);

    res.json({
      success: true,
      message: 'Device status updated',
      data: {
        deviceId,
        status,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Device status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Device status update failed',
      error: error.message
    });
  }
};

/**
 * @desc    Test integration connectivity
 * @route   GET /api/integration/test
 * @access  Service-to-Service (Java Service Auth)
 */
const testIntegration = async (req, res) => {
  try {
    console.log('🔍 Integration test requested');

    // Test Java service connectivity
    let javaServiceStatus = 'disconnected';
    let javaServiceData = null;

    try {
      if (javaServiceClient.isEnabled()) {
        const javaResponse = await javaServiceClient.getIntegrationStatus();
        javaServiceStatus = 'connected';
        javaServiceData = javaResponse;
      } else {
        javaServiceStatus = 'disabled';
      }
    } catch (error) {
      console.log('Java service connection test failed:', error.message);
    }

    const integrationStatus = {
      mernBackend: {
        status: 'running',
        port: process.env.PORT || 5000,
        timestamp: new Date().toISOString()
      },
      javaService: {
        status: javaServiceStatus,
        enabled: javaServiceClient.isEnabled(),
        config: javaServiceClient.getConfig(),
        data: javaServiceData
      },
      database: {
        status: 'connected', // Assuming connected if we reach here
        name: 'MongoDB'
      }
    };

    res.json({
      success: true,
      message: 'Integration test completed',
      data: integrationStatus
    });

  } catch (error) {
    console.error('❌ Integration test error:', error);
    res.status(500).json({
      success: false,
      message: 'Integration test failed',
      error: error.message
    });
  }
};

/**
 * @desc    Get integration status and configuration
 * @route   GET /api/integration/status
 * @access  Protected (Admin)
 */
const getIntegrationStatus = async (req, res) => {
  try {
    const status = {
      javaServiceIntegration: {
        enabled: javaServiceClient.isEnabled(),
        config: javaServiceClient.getConfig()
      },
      mernBackend: {
        port: process.env.PORT || 5000,
        nodeEnv: process.env.NODE_ENV || 'development'
      },
      services: {
        dataSyncInterval: process.env.SYNC_INTERVAL || 60,
        database: 'MongoDB',
        authentication: 'JWT'
      }
    };

    res.json({
      success: true,
      message: 'Integration status retrieved',
      data: status
    });

  } catch (error) {
    console.error('❌ Get integration status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get integration status',
      error: error.message
    });
  }
};

/**
 * @desc    Enroll employee in device via Java service
 * @route   POST /api/integration/enroll-employee
 * @access  Protected (Admin)
 */
const enrollEmployeeInDevice = async (req, res) => {
  try {
    console.log('📱 Enrolling employee in device via Java service:', req.body);

    const { employeeId, fullName, faceImage, deviceKey, secret } = req.body;

    // Validate required fields
    if (!employeeId || !fullName || !faceImage || !deviceKey || !secret) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: employeeId, fullName, faceImage, deviceKey, secret'
      });
    }

    // Find employee in database
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found in database'
      });
    }

    // Call Java service to enroll employee
    const enrollmentData = {
      employeeId,
      fullName,
      faceImage,
      deviceKey,
      secret,
      verificationStyle: 1 // Default verification style
    };

    try {
      const response = await javaServiceClient.sendPostRequest('/api/employee/register', enrollmentData);
      const result = JSON.parse(response);

      if (result.success && result.code === '000') {
        // Update employee in database
        employee.faceImageUploaded = true;
        employee.deviceEnrollmentStatus = 'enrolled';
        employee.lastDeviceSync = new Date();
        await employee.save();

        console.log('✅ Employee enrolled successfully in device');
        return res.json({
          success: true,
          message: 'Employee enrolled successfully in device',
          data: {
            employeeId,
            enrollmentStatus: 'enrolled',
            deviceResponse: result
          }
        });
      } else {
        console.log('❌ Device enrollment failed:', result.msg);
        return res.status(400).json({
          success: false,
          message: 'Device enrollment failed: ' + result.msg,
          data: result
        });
      }
    } catch (javaError) {
      console.error('Java service error:', javaError.message);
      return res.status(500).json({
        success: false,
        message: 'Java service communication failed: ' + javaError.message
      });
    }

  } catch (error) {
    console.error('❌ Employee enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Employee enrollment failed',
      error: error.message
    });
  }
};

/**
 * @desc    Get attendance from device via Java service
 * @route   POST /api/integration/get-device-attendance
 * @access  Protected (Admin)
 */
const getDeviceAttendance = async (req, res) => {
  try {
    console.log('📊 Getting attendance from device via Java service:', req.body);

    const { deviceKey, secret, employeeId, startDate, endDate } = req.body;

    // Validate required fields
    if (!deviceKey || !secret) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: deviceKey, secret'
      });
    }

    try {
      const attendanceData = await javaServiceClient.getAttendanceFromDevice(
        deviceKey, secret, employeeId, startDate, endDate
      );

      console.log('✅ Attendance data retrieved from device');
      return res.json({
        success: true,
        message: 'Attendance data retrieved successfully',
        data: attendanceData
      });

    } catch (javaError) {
      console.error('Java service error:', javaError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to get attendance from device: ' + javaError.message
      });
    }

  } catch (error) {
    console.error('❌ Get device attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get device attendance',
      error: error.message
    });
  }
};

module.exports = {
  syncEmployeeFromJava,
  updateDeviceStatus,
  testIntegration,
  getIntegrationStatus,
  enrollEmployeeInDevice,
  getDeviceAttendance
};