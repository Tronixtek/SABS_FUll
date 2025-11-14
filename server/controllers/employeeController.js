const Employee = require('../models/Employee');
const axios = require('axios');
const javaServiceClient = require('../services/javaServiceClient');

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private
exports.getEmployees = async (req, res) => {
  try {
    const { facility, status, search, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    // Filter by facility
    if (facility) {
      query.facility = facility;
    } else if (req.user.role !== 'super-admin' && req.user.facilities.length > 0) {
      query.facility = { $in: req.user.facilities };
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Search
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const employees = await Employee.find(query)
      .populate('facility', 'name code')
      .populate('shift', 'name code startTime endTime')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await Employee.countDocuments(query);
    
    res.json({
      success: true,
      data: employees,
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

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private
exports.getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('facility')
      .populate('shift');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create employee with device-first approach
// @route   POST /api/employees
// @access  Private
exports.createEmployee = async (req, res) => {
  try {
    // Create employee in MERN database
    const employee = await Employee.create(req.body);
    await employee.populate('facility shift');

    console.log('✅ Employee created in MERN database:', employee.employeeId);

    // 🔄 Sync with Java service if integration is enabled
    if (javaServiceClient.isEnabled()) {
      try {
        console.log('🔄 Syncing new employee with Java service...');
        
        const enrollmentData = {
          employeeId: employee.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          deviceId: employee.deviceId || employee.employeeId,
          facilityId: employee.facility._id || employee.facility
        };

        // Note: For full device enrollment with face image, 
        // use /api/employees/register-with-device endpoint
        const syncResult = await javaServiceClient.enrollEmployee(enrollmentData);
        console.log('Java service sync result:', syncResult.success ? 'SUCCESS' : 'FAILED');
        
        if (syncResult.success) {
          // Update employee with device enrollment status
          employee.faceImageUploaded = false; // Will be true when face is uploaded via device
          employee.deviceEnrollmentStatus = 'pending'; // pending, enrolled, failed
          await employee.save();
        }
      } catch (error) {
        console.warn('⚠️ Java service sync failed (non-blocking):', error.message);
        // Don't fail the employee creation if Java sync fails
      }
    }
    
    res.status(201).json({
      success: true,
      data: employee,
      message: 'Employee created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Employee with this ID or email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Register new employee with Java XO5 integration
// @route   POST /api/employees/register
// @access  Private
exports.registerEmployeeWithDevice = async (req, res) => {
  let deviceEnrollmentSuccess = false;
  
  try {
    console.log(`\n🚀 ===== EMPLOYEE REGISTRATION STARTED (Device-First) =====`);
    
    const {
      employeeId, firstName, lastName, email, phone, facility,
      department, designation, shift, joiningDate,
      dateOfBirth, nationality, nationalId, profileImage, faceImage
    } = req.body;

    // ✅ STEP 1: VALIDATE INPUT DATA (NO deviceId required)
    console.log(`📋 Validating registration data...`);
    
    if (!employeeId || !firstName || !lastName || !email || !facility || !shift) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['employeeId', 'firstName', 'lastName', 'email', 'facility', 'shift']
      });
    }

    if (!faceImage) {
      return res.status(400).json({
        success: false,
        message: 'Face image is required for biometric device enrollment'
      });
    }

    // Check for existing employee with same ID or email (NO deviceId check)
    const existingEmployee = await Employee.findOne({
      $or: [
        { employeeId },
        { email }
      ]
    });

    if (existingEmployee) {
      const conflict = existingEmployee.employeeId === employeeId ? 'Employee ID' : 'Email';
      
      return res.status(409).json({
        success: false,
        message: `${conflict} already exists`,
        conflictField: conflict.toLowerCase().replace(' ', '')
      });
    }

    // Get facility information for device integration
    const Facility = require('../models/Facility');
    const facilityDoc = await Facility.findById(facility);
    
    if (!facilityDoc) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    // Check if facility supports smart device integration
    if (facilityDoc.configuration?.integrationType !== 'java-xo5') {
      return res.status(400).json({
        success: false,
        message: 'Facility does not support smart device integration',
        facilityType: facilityDoc.configuration?.integrationType || 'legacy'
      });
    }

    console.log(`✅ Validation passed for employee: ${firstName} ${lastName} (${employeeId})`);

    // ✅ STEP 2: USE FACILITY'S DEVICE ID (NOT PER-EMPLOYEE)
    // All employees at this facility inherit the same device ID (physical device)
    const facilityDeviceId = facilityDoc.deviceInfo?.deviceId || facilityDoc.code || facility;
    
    // Employee gets unique person ID within the device (not device ID)
    const personId = employeeId; // Use employee ID as person ID within the device
    
    console.log(`📱 Facility Device ID: ${facilityDeviceId}`);
    console.log(`👤 Employee Person ID: ${personId}`);

    // ✅ STEP 3: ENROLL TO BIOMETRIC DEVICE FIRST (NO DATABASE SAVE YET)
    console.log(`🔄 Starting biometric device enrollment...`);
    console.log(`   Facility Device ID: ${facilityDeviceId}`);
    console.log(`   Employee Person ID: ${personId}`);
    console.log(`   Facility: ${facilityDoc.name}`);

    // Prepare payload for Java device service - matches the expected format
    const deviceKey = (facilityDoc.configuration?.deviceKey || facilityDeviceId).toLowerCase();
    console.log(`   Device Key (original): ${facilityDoc.configuration?.deviceKey || facilityDeviceId}`);
    console.log(`   Device Key (lowercase): ${deviceKey}`);
    console.log(`   Verification Style: 0 (any verification method)`);
    const javaServicePayload = {
      employeeId: personId,
      fullName: `${firstName} ${lastName}`,
      faceImage: faceImage,
      deviceKey: deviceKey,
      secret: facilityDoc.configuration?.deviceSecret || '123456',
      verificationStyle: 0 // Default: 0 = any verification method
    };

    console.log(`   Sending enrollment request to device service...`);

    // Call Java device service for employee registration
    const javaResponse = await axios.post(
      `${process.env.JAVA_SERVICE_URL || 'http://localhost:8081'}/api/employee/register`,
      javaServicePayload,
      {
        timeout: 30000, // 30 seconds timeout
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`   Device service response: ${javaResponse.status}`);

    if (!javaResponse.data.success) {
      console.error(`❌ Device enrollment failed: ${javaResponse.data.message}`);
      
      return res.status(502).json({
        success: false,
        message: 'Device enrollment failed',
        deviceError: javaResponse.data.message || 'Unknown device error',
        step: 'device_enrollment'
      });
    }

    console.log(`✅ Device enrollment successful!`);
    deviceEnrollmentSuccess = true;

    // ✅ STEP 4: SAVE TO DATABASE ONLY AFTER SUCCESSFUL DEVICE ENROLLMENT
    console.log(`💾 Device enrollment successful - Now saving to database...`);
    
    const employeeData = {
      employeeId, firstName, lastName, email, phone, facility,
      department, designation, shift, joiningDate,
      dateOfBirth, nationality, nationalId,
      profileImage,
      faceImageUploaded: true,
      status: 'active',
      deviceId: facilityDeviceId, // Facility's device ID (shared by all employees)
      biometricData: {
        faceId: personId, // Employee's unique person ID within device
        xo5PersonSn: personId,
        xo5PersonName: `${firstName} ${lastName}`,
        xo5DeviceKey: deviceKey, // Use the lowercase device key
        xo5DeviceId: facilityDeviceId, // Physical device identifier
        lastXO5Sync: new Date()
      }
    };

    const newEmployee = await Employee.create(employeeData);
    console.log(`✅ Employee saved to database with ID: ${newEmployee._id}`);

    // Populate related documents
    await newEmployee.populate([
      { path: 'facility', select: 'name code' },
      { path: 'shift', select: 'name code startTime endTime' }
    ]);

    console.log(`✅ ===== REGISTRATION COMPLETED SUCCESSFULLY (Device-First) =====\n`);

    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      data: {
        employee: newEmployee,
        deviceEnrollment: {
          deviceId: facilityDeviceId, // Facility's device ID
          personId: personId, // Employee's person ID within device
          status: 'enrolled',
          facilityName: facilityDoc.name
        },
        steps: {
          validation: 'completed',
          deviceEnrollment: 'completed',
          databaseSave: 'completed'
        }
      }
    });

  } catch (error) {
    console.error(`❌ Registration error:`, error);

    // ✅ DEVICE-FIRST ERROR HANDLING - No database cleanup needed!
    // Since we don't save to database until device enrollment succeeds,
    // we only need to handle device enrollment failures
    
    if (!deviceEnrollmentSuccess) {
      console.log(`❌ Device enrollment failed - No database cleanup required`);
    }

    // Handle different error types
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Device service is unavailable',
        error: 'SERVICE_UNAVAILABLE',
        step: 'device_enrollment'
      });
    }

    if (error.code === 'ETIMEDOUT') {
      return res.status(408).json({
        success: false,
        message: 'Device enrollment timed out',
        error: 'TIMEOUT',
        step: 'device_enrollment'
      });
    }

    if (error.response?.status >= 400) {
      return res.status(error.response.status).json({
        success: false,
        message: 'Device enrollment error',
        deviceError: error.response.data?.message || 'Device service error',
        step: 'device_enrollment'
      });
    }

    // Database or validation errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Employee already exists',
        error: 'DUPLICATE_ENTRY',
        step: 'database_save'
      });
    }

    // Generic error
    res.status(500).json({
      success: false,
      message: 'Employee registration failed',
      error: error.message,
      step: 'unknown'
    });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('facility shift');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    res.json({
      success: true,
      data: employee,
      message: 'Employee updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete employee (device-first approach)
// @route   DELETE /api/employees/:id
// @access  Private
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the employee with facility information
    const employee = await Employee.findById(id).populate('facility');
    
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    const facility = employee.facility;
    
    // ✅ STEP 1: DELETE FROM DEVICE FIRST
    if (facility?.configuration?.deleteUserApiUrl && employee.deviceId) {
      try {
        console.log(`\n🗑️ ===== DEVICE DELETE STARTED =====`);
        console.log(`   Employee: ${employee.firstName} ${employee.lastName}`);
        console.log(`   Device ID (personUUID): ${employee.deviceId}`);
        console.log(`   Facility: ${facility.name}`);
        
        // Use configured delete URL template
        let deviceDeleteUrl = facility.configuration.deleteUserApiUrl;
        
        // Replace placeholders with actual device ID
        deviceDeleteUrl = deviceDeleteUrl.replace('{person_uuid}', employee.deviceId);
        deviceDeleteUrl = deviceDeleteUrl.replace('{personUUID}', employee.deviceId);
        deviceDeleteUrl = deviceDeleteUrl.replace('{uuid}', employee.deviceId);
        deviceDeleteUrl = deviceDeleteUrl.replace('{id}', employee.deviceId);
        
        console.log(`   Delete URL: ${deviceDeleteUrl}`);
        
        const headers = {
          'Content-Type': 'application/json',
        };
        
        if (facility.deviceApiKey) {
          headers['Authorization'] = `Bearer ${facility.deviceApiKey}`;
          console.log(`   Using API Key: ${facility.deviceApiKey.substring(0, 10)}...`);
        }

        console.log(`   Sending DELETE request to device...`);

        // Send DELETE request to device
        const deviceResponse = await axios.delete(deviceDeleteUrl, {
          headers: headers,
          timeout: 15000, // 15 seconds timeout
          validateStatus: (status) => {
            // Accept 2xx and 404 (already deleted)
            return (status >= 200 && status < 300) || status === 404;
          }
        });

        console.log(`   Device response status: ${deviceResponse.status}`);
        console.log(`   Device response data: ${JSON.stringify(deviceResponse.data)}`);

        // Check if device deletion was successful
        if (deviceResponse.status === 404) {
          console.log(`ℹ️ Person not found on device (may have been deleted already)`);
        } else if (deviceResponse.status === 200 || deviceResponse.status === 204) {
          console.log(`✅ Employee deleted from device successfully`);
        } else if (deviceResponse.data?.result === 'success' || deviceResponse.data?.code === 0) {
          console.log(`✅ Employee deleted from device successfully`);
        } else {
          console.warn(`⚠️ Device returned status ${deviceResponse.status}, proceeding with caution`);
        }

      } catch (deviceError) {
        console.error(`❌ Device deletion failed: ${deviceError.message}`);
        
        // Handle different types of device errors
        if (deviceError.code === 'ECONNABORTED' || deviceError.code === 'ETIMEDOUT') {
          console.error(`   Error: Device request timed out`);
          return res.status(503).json({ 
            success: false,
            message: 'Device request timed out. Device may be offline.',
            error: 'DEVICE_TIMEOUT',
            employeeId: id,
            requiresConfirmation: true,
          });
        }
        
        if (deviceError.code === 'ECONNREFUSED' || deviceError.code === 'ENOTFOUND') {
          console.error(`   Error: Cannot connect to device`);
          return res.status(503).json({ 
            success: false,
            message: 'Cannot connect to device. Device is unreachable.',
            error: 'DEVICE_UNREACHABLE',
            employeeId: id,
            requiresConfirmation: true,
          });
        }

        if (deviceError.response) {
          console.error(`   Device responded with error: ${deviceError.response.status}`);
          console.error(`   Error data: ${JSON.stringify(deviceError.response.data)}`);
          
          // If device says person not found (404), proceed with DB deletion
          if (deviceError.response.status === 404) {
            console.log(`   ℹ️ Person not found on device, proceeding with DB deletion`);
          } else {
            return res.status(500).json({ 
              success: false,
              message: `Device error: ${deviceError.response.data?.message || deviceError.response.statusText || 'Unknown error'}`,
              error: 'DEVICE_ERROR',
              statusCode: deviceError.response.status,
              requiresConfirmation: true,
            });
          }
        } else {
          // Network error or other issue
          return res.status(500).json({ 
            success: false,
            message: `Failed to communicate with device: ${deviceError.message}`,
            error: 'DEVICE_ERROR',
            requiresConfirmation: true,
          });
        }
      }
    } else {
      if (!facility?.configuration?.deleteUserApiUrl) {
        console.log(`ℹ️ No delete API URL configured for facility ${facility?.name || 'Unknown'}`);
      }
      if (!employee.deviceId) {
        console.log(`ℹ️ No device ID found for employee ${employee.firstName} ${employee.lastName}`);
      }
    }

    // ✅ STEP 2: DELETE FROM DATABASE
    console.log(`\n🗑️ Deleting employee from database...`);
    
    // Count related attendance records
    const Attendance = require('../models/Attendance');
    const attendanceCount = await Attendance.countDocuments({ employee: id });
    console.log(`   Found ${attendanceCount} attendance records (will be preserved)`);
    
    // Delete the employee
    await Employee.findByIdAndDelete(id);
    
    console.log(`✅ Employee deleted from database successfully`);
    console.log(`✅ ===== DELETE COMPLETED =====\n`);

    res.json({ 
      success: true,
      message: 'Employee deleted successfully',
      deletedFrom: facility?.configuration?.deleteUserApiUrl && employee.deviceId ? 'device-and-database' : 'database-only',
      attendanceRecordsPreserved: attendanceCount,
      employeeName: `${employee.firstName} ${employee.lastName}`,
    });

  } catch (error) {
    console.error('❌ Error in deleteEmployee:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete employee',
      error: error.message,
    });
  }
};

// @desc    Force delete employee from database only
// @route   DELETE /api/employees/:id/force
// @access  Private
exports.forceDeleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await Employee.findById(id);
    
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    console.log(`\n⚠️ ===== FORCE DELETE (DB ONLY) =====`);
    console.log(`   Employee: ${employee.firstName} ${employee.lastName}`);
    console.log(`   Device ID: ${employee.deviceId}`);
    console.log(`   Warning: Employee may still exist on device`);
    
    // Count attendance records
    const Attendance = require('../models/Attendance');
    const attendanceCount = await Attendance.countDocuments({ employee: id });
    
    // Delete from database only
    await Employee.findByIdAndDelete(id);
    
    console.log(`✅ Employee force-deleted from database`);
    console.log(`⚠️ Manual device cleanup may be required`);
    console.log(`✅ ===== FORCE DELETE COMPLETED =====\n`);

    res.json({ 
      success: true,
      message: 'Employee deleted from database only',
      warning: 'Employee was not deleted from device. Manual device cleanup may be required.',
      deletedFrom: 'database-only',
      attendanceRecordsPreserved: attendanceCount,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      deviceCleanupRequired: true,
    });

  } catch (error) {
    console.error('❌ Error in forceDeleteEmployee:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to force delete employee',
      error: error.message,
    });
  }
};

// @desc    Get employee statistics
// @route   GET /api/employees/:id/stats
// @access  Private
exports.getEmployeeStats = async (req, res) => {
  try {
    const Attendance = require('../models/Attendance');
    const moment = require('moment');
    
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    const startOfMonth = moment().startOf('month').toDate();
    const endOfMonth = moment().endOf('month').toDate();
    
    const attendanceRecords = await Attendance.find({
      employee: req.params.id,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });
    
    const stats = {
      totalPresent: attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length,
      totalAbsent: attendanceRecords.filter(a => a.status === 'absent').length,
      totalLate: attendanceRecords.filter(a => a.status === 'late').length,
      totalHalfDay: attendanceRecords.filter(a => a.status === 'half-day').length,
      totalLeave: attendanceRecords.filter(a => a.status === 'on-leave').length,
      totalWorkHours: attendanceRecords.reduce((sum, a) => sum + (a.workHours || 0), 0),
      totalOvertime: attendanceRecords.reduce((sum, a) => sum + (a.overtime || 0), 0),
      averageLateMinutes: attendanceRecords.reduce((sum, a) => sum + (a.lateArrival || 0), 0) / (attendanceRecords.length || 1)
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
