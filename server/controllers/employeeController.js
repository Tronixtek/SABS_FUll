const Employee = require('../models/Employee');
const Facility = require('../models/Facility');
const axios = require('axios');
const javaServiceClient = require('../services/javaServiceClient');

// Helper function to generate unique employee ID
const generateEmployeeId = async (facilityId) => {
  try {
    const facility = await Facility.findById(facilityId);
    if (!facility) {
      throw new Error('Facility not found');
    }

    // Use first 3 letters of facility name - REMOVE ALL NON-ALPHANUMERIC
    let facilityPrefix = facility.name
      .toUpperCase()
      .replace(/[^A-Z]/g, '')  // Remove ALL non-alphabetic characters (no underscores!)
      .substring(0, 3);         // Take first 3 letters
    
    // Ensure we have at least 3 characters (pad with X if needed)
    while (facilityPrefix.length < 3) {
      facilityPrefix += 'X';
    }
    
    // Find the last employee ID for this facility (no underscore in search)
    const lastEmployee = await Employee.findOne({
      employeeId: { $regex: `^${facilityPrefix}` }
    }).sort({ employeeId: -1 });

    let nextNumber = 1;
    if (lastEmployee) {
      // Extract the number from the last employee ID (e.g., HOT00123 -> 123)
      const match = lastEmployee.employeeId.match(/([0-9]+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    // Pad with zeros to make it 5 digits - NO UNDERSCORE!
    const paddedNumber = String(nextNumber).padStart(5, '0');
    const employeeId = `${facilityPrefix}${paddedNumber}`; // Removed underscore!

    // Double-check uniqueness
    const exists = await Employee.findOne({ employeeId });
    if (exists) {
      // If somehow exists, try the next number
      return generateEmployeeId(facilityId);
    }

    return employeeId;
  } catch (error) {
    throw new Error(`Failed to generate employee ID: ${error.message}`);
  }
};

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
    } else if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
      if (req.user.facilities.length > 0) {
        query.facility = { $in: req.user.facilities };
      } else {
        // If no facilities assigned, return empty
        return res.json({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, pages: 0 }
        });
      }
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
    // Auto-generate employee ID if not provided
    if (!req.body.employeeId && req.body.facility) {
      req.body.employeeId = await generateEmployeeId(req.body.facility);
    }

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
    // XO5 device has max 32 character limit for person IDs
    let personId = employeeId;
    
    // Validate person ID length for XO5 device compatibility
    if (personId.length > 32) {
      console.warn(`⚠️ Person ID too long (${personId.length} chars), truncating to 32 characters`);
      personId = personId.substring(0, 32);
    }
    
    console.log(`📱 Facility Device ID: ${facilityDeviceId}`);
    console.log(`👤 Employee Person ID: ${personId} (${personId.length} chars)`);

    // ✅ STEP 3: ENROLL TO BIOMETRIC DEVICE FIRST (NO DATABASE SAVE YET)
    console.log(`🔄 Starting biometric device enrollment...`);
    console.log(`   Facility Device ID: ${facilityDeviceId}`);
    console.log(`   Employee Person ID: ${personId}`);
    console.log(`   Facility: ${facilityDoc.name}`);

    // Prepare payload for Java device service - matches the expected format
    const deviceKey = (facilityDoc.configuration?.deviceKey || facilityDeviceId).toLowerCase();
    console.log(`   Device Key: ${deviceKey}`);
    console.log(`   Verification Style: 0 (any verification method)`);
    
    // ✅ OPTIMIZE FACE IMAGE FOR XO5 DEVICE
    console.log(`🖼️ Optimizing face image for XO5 device...`);
    
    let optimizedFaceImage = faceImage;
    
    // Remove data URL prefix if present (data:image/jpeg;base64,)
    if (faceImage.includes('data:image')) {
      optimizedFaceImage = faceImage.split(',')[1];
    }
    
    // Validate Base64 format
    if (!optimizedFaceImage || optimizedFaceImage.length < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Invalid face image format or image too small',
        hint: 'Please ensure the image is properly captured and is at least 640x480 resolution'
      });
    }
    
    // Log image details for debugging
    console.log(`   Original image length: ${faceImage.length}`);
    console.log(`   Optimized image length: ${optimizedFaceImage.length}`);
    console.log(`   Image starts with: ${optimizedFaceImage.substring(0, 20)}...`);
    console.log(`   Image ends with: ...${optimizedFaceImage.substring(optimizedFaceImage.length - 10)}`);
    
    const javaServicePayload = {
      employeeId: personId,
      fullName: `${firstName} ${lastName}`,
      faceImage: optimizedFaceImage, // Use cleaned Base64 image
      deviceKey: deviceKey,
      secret: facilityDoc.configuration?.deviceSecret || '123456',
      verificationStyle: 0 // Default: 0 = any verification method
    };

    console.log(`   === JAVA SERVICE PAYLOAD DEBUG ===`);
    console.log(`   Employee ID: ${javaServicePayload.employeeId}`);
    console.log(`   Full Name: ${javaServicePayload.fullName}`);
    console.log(`   Device Key: ${javaServicePayload.deviceKey}`);
    console.log(`   Secret: ${javaServicePayload.secret}`);
    console.log(`   Verification Style: ${javaServicePayload.verificationStyle}`);
    console.log(`   Face Image Length: ${javaServicePayload.faceImage.length}`);
    console.log(`   Full Payload (without image): ${JSON.stringify({...javaServicePayload, faceImage: '[BASE64_DATA]'})}`);
    console.log(`   Sending enrollment request to device service...`);

    // Call Java device service for employee registration
    const javaResponse = await axios.post(
      `${process.env.JAVA_SERVICE_URL || 'http://localhost:8081'}/api/employee/register`,
      javaServicePayload,
      {
        timeout: 60000, // Increased to 60 seconds for XO5 device operations
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`   Device service response: ${javaResponse.status}`);
    console.log(`   Full Java service response:`, JSON.stringify(javaResponse.data, null, 2));

    // Debug the success property specifically
    console.log(`   Java response success property: ${javaResponse.data.success}`);
    console.log(`   Java response code: ${javaResponse.data.code}`);
    console.log(`   Java response message: ${javaResponse.data.msg || javaResponse.data.message}`);
    console.log(`   Java response success type: ${typeof javaResponse.data.success}`);
    
    // Check success using Java service's actual response format
    const isJavaServiceSuccess = javaResponse.data.success === true || 
                                javaResponse.data.code === "000" ||
                                (javaResponse.data.code && javaResponse.data.code.toString() === "000");
    
    if (!isJavaServiceSuccess) {
      const errorMsg = javaResponse.data.msg || javaResponse.data.message || javaResponse.data.error || 'Unknown device error';
      console.error(`❌ Device enrollment failed: ${errorMsg}`);
      console.error(`   Full error response:`, javaResponse.data);
      
      return res.status(502).json({
        success: false,
        message: 'Device enrollment failed',
        deviceError: errorMsg,
        deviceResponse: javaResponse.data,
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
    console.error(`❌ ===== REGISTRATION ERROR DETAILS =====`);
    console.error(`Error message: ${error.message}`);
    console.error(`Error code: ${error.code}`);
    console.error(`Error stack:`, error.stack);
    console.error(`Device enrollment success: ${deviceEnrollmentSuccess}`);
    
    if (error.response) {
      console.error(`HTTP response status: ${error.response.status}`);
      console.error(`HTTP response data:`, error.response.data);
    }
    console.error(`❌ ===== END ERROR DETAILS =====`);

    // ✅ DEVICE-FIRST ERROR HANDLING - No database cleanup needed!
    // Since we don't save to database until device enrollment succeeds,
    // we only need to handle device enrollment failures
    
    if (!deviceEnrollmentSuccess) {
      console.log(`❌ Device enrollment failed - No database cleanup required`);
    }

    // Handle different error types
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      console.log(`⚠️ TIMEOUT: Device operation may have succeeded but response was slow`);
      console.log(`   Recommendation: Check device to see if employee ${personId} was actually enrolled`);
      
      // Try to verify if the employee was actually enrolled despite timeout
      try {
        console.log(`🔍 Attempting to verify if employee was enrolled despite timeout...`);
        
        // Quick verification call to Java service
        const verificationResponse = await axios.post(
          `${process.env.JAVA_SERVICE_URL || 'http://localhost:8081'}/api/employee/validate`,
          {
            employeeId: personId,
            deviceKey: deviceKey,
            secret: facilityDoc.configuration?.deviceSecret || '123456'
          },
          {
            timeout: 10000 // Quick 10-second timeout for verification
          }
        );
        
        if (verificationResponse.data.success && verificationResponse.data.data.exists) {
          console.log(`✅ TIMEOUT RECOVERY: Employee was successfully enrolled despite timeout!`);
          console.log(`   Proceeding with database save...`);
          
          // Continue with database save since device enrollment actually succeeded
          const employeeData = {
            employeeId, firstName, lastName, email, phone, facility,
            department, designation, shift, joiningDate,
            dateOfBirth, nationality, nationalId,
            profileImage,
            faceImageUploaded: true,
            status: 'active',
            deviceId: facilityDeviceId,
            biometricData: {
              faceId: personId,
              xo5PersonSn: personId,
              xo5PersonName: `${firstName} ${lastName}`,
              xo5DeviceKey: deviceKey,
              xo5DeviceId: facilityDeviceId,
              lastXO5Sync: new Date()
            }
          };

          const newEmployee = await Employee.create(employeeData);
          await newEmployee.populate([
            { path: 'facility', select: 'name code' },
            { path: 'shift', select: 'name code startTime endTime' }
          ]);

          console.log(`✅ TIMEOUT RECOVERY COMPLETED - Employee saved to database after verification`);

          return res.status(201).json({
            success: true,
            message: 'Employee registered successfully (recovered from timeout)',
            data: {
              employee: newEmployee,
              deviceEnrollment: {
                deviceId: facilityDeviceId,
                personId: personId,
                status: 'enrolled',
                facilityName: facilityDoc.name,
                note: 'Enrollment succeeded despite initial timeout'
              },
              steps: {
                validation: 'completed',
                deviceEnrollment: 'completed',
                databaseSave: 'completed'
              }
            }
          });
        }
      } catch (verificationError) {
        console.log(`❌ Verification failed: ${verificationError.message}`);
      }
      
      return res.status(408).json({
        success: false,
        message: 'Device enrollment timed out after 60 seconds',
        error: 'TIMEOUT',
        step: 'device_enrollment',
        possibleSuccess: true,
        recommendedAction: 'Check device to verify if employee was actually enrolled',
        employeeId: personId
      });
    }
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Device service is unavailable',
        error: 'SERVICE_UNAVAILABLE',
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

// @desc    Delete employee with validation-first approach
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

    console.log(`\n� ===== VALIDATION-FIRST DELETE STARTED =====`);
    console.log(`   Employee: ${employee.firstName} ${employee.lastName}`);
    console.log(`   Employee ID: ${employee.employeeId}`);
    console.log(`   Device ID: ${employee.deviceId}`);
    console.log(`   Facility: ${employee.facility?.name || 'Unknown'}`);

    const facility = employee.facility;

    // ✅ STEP 1: VALIDATE DEVICE CONFIGURATION & EMPLOYEE EXISTS ON DEVICE
    if (facility?.configuration?.deleteUserApiUrl && employee.deviceId) {
      console.log(`\n🔍 Step 1: Device validation configured`);
      console.log(`   Delete URL: ${facility.configuration.deleteUserApiUrl}`);

      try {
        // ✅ STEP 2: VALIDATE EMPLOYEE EXISTS ON DEVICE VIA JAVA SERVICE
        console.log(`\n🔍 Step 2: Validating employee exists on device via Java service...`);
        
        const javaServiceClient = require('../services/javaServiceClient');
        
        if (!javaServiceClient.isEnabled()) {
          console.log(`⚠️ Java service integration is disabled - skipping validation`);
          // Fall back to direct device deletion without validation
          return await performDirectDeviceDelete(req, res, employee, facility);
        }

        // Use Java service for validation and deletion
        const validationPayload = {
          employeeId: employee.deviceId || employee.employeeId,
          deviceKey: facility.configuration.deviceKey,
          secret: facility.configuration.secret
        };

        console.log(`   Sending validation request to Java service...`);
        const validationResponse = await javaServiceClient.client.post('/api/employee/delete', validationPayload);

        console.log(`   Java service response:`, validationResponse.data);

        if (!validationResponse.data.success) {
          // Handle specific error cases
          if (validationResponse.data.errorCode === '1003') {
            console.log(`❌ Employee not found on device - cannot proceed with deletion`);
            return res.status(400).json({
              success: false,
              message: 'Employee not found on biometric device. Cannot proceed with validation-first deletion.',
              error: 'EMPLOYEE_NOT_ON_DEVICE',
              details: {
                employeeId: employee.employeeId,
                deviceChecked: true,
                canForceDelete: true,
                suggestion: 'Use force delete if you want to remove from database only'
              },
              requiresConfirmation: true
            });
          } else {
            // Other validation/device error
            console.log(`❌ Device validation failed: ${validationResponse.data.message}`);
            return res.status(503).json({
              success: false,
              message: `Device operation failed: ${validationResponse.data.message}`,
              error: 'DEVICE_OPERATION_FAILED',
              details: validationResponse.data,
              requiresConfirmation: true
            });
          }
        }

        // ✅ STEP 3: EMPLOYEE EXISTS AND WAS DELETED FROM DEVICE SUCCESSFULLY
        console.log(`✅ Employee validated and deleted from device successfully`);

      } catch (deviceError) {
        console.error(`❌ Device validation/deletion failed:`, deviceError.message);
        
        // Handle Java service connectivity issues
        if (deviceError.code === 'ECONNABORTED' || deviceError.code === 'ETIMEDOUT') {
          return res.status(503).json({ 
            success: false,
            message: 'Java service request timed out. Service may be offline.',
            error: 'JAVA_SERVICE_TIMEOUT',
            employeeId: id,
            requiresConfirmation: true,
          });
        }
        
        if (deviceError.code === 'ECONNREFUSED' || deviceError.code === 'ENOTFOUND') {
          return res.status(503).json({ 
            success: false,
            message: 'Cannot connect to Java service. Service is unreachable.',
            error: 'JAVA_SERVICE_UNREACHABLE',
            employeeId: id,
            requiresConfirmation: true,
          });
        }

        // Java service error response
        if (deviceError.response) {
          return res.status(500).json({ 
            success: false,
            message: `Java service error: ${deviceError.response.data?.message || deviceError.response.statusText}`,
            error: 'JAVA_SERVICE_ERROR',
            statusCode: deviceError.response.status,
            details: deviceError.response.data,
            requiresConfirmation: true,
          });
        }

        // Network or other error
        return res.status(500).json({ 
          success: false,
          message: `Failed to communicate with Java service: ${deviceError.message}`,
          error: 'JAVA_SERVICE_ERROR',
          requiresConfirmation: true,
        });
      }
    } else {
      console.log(`ℹ️ No device validation configured - proceeding with database-only soft delete`);
      if (!facility?.configuration?.deleteUserApiUrl) {
        console.log(`   No delete API URL configured for facility ${facility?.name || 'Unknown'}`);
      }
      if (!employee.deviceId) {
        console.log(`   No device ID found for employee ${employee.firstName} ${employee.lastName}`);
      }
    }

    // ✅ STEP 4: SOFT DELETE FROM DATABASE
    console.log(`\n🗑️ Step 4: Performing soft delete from database...`);
    
    // Count related attendance records
    const Attendance = require('../models/Attendance');
    const attendanceCount = await Attendance.countDocuments({ employee: id });
    console.log(`   Found ${attendanceCount} attendance records (will be preserved)`);
    
    // Perform soft delete using the new method
    await employee.softDelete('user_request');
    
    console.log(`✅ Employee soft deleted from database successfully`);
    console.log(`✅ ===== VALIDATION-FIRST DELETE COMPLETED =====\n`);

    res.json({ 
      success: true,
      message: 'Employee deleted successfully with validation-first approach',
      deletedFrom: facility?.configuration?.deleteUserApiUrl && employee.deviceId ? 'device-and-database' : 'database-only',
      deletionType: 'soft_delete',
      attendanceRecordsPreserved: attendanceCount,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      canBeRestored: true,
      validationPerformed: true
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

// Helper function for direct device delete (fallback)
async function performDirectDeviceDelete(req, res, employee, facility) {
  console.log(`\n🔄 Falling back to direct device deletion...`);
  
  try {
    // Use configured delete URL template
    let deviceDeleteUrl = facility.configuration.deleteUserApiUrl;
    
    // Replace placeholders with actual device ID
    deviceDeleteUrl = deviceDeleteUrl.replace('{person_uuid}', employee.deviceId);
    deviceDeleteUrl = deviceDeleteUrl.replace('{personUUID}', employee.deviceId);
    deviceDeleteUrl = deviceDeleteUrl.replace('{uuid}', employee.deviceId);
    deviceDeleteUrl = deviceDeleteUrl.replace('{id}', employee.deviceId);
    
    console.log(`   Delete URL: ${deviceDeleteUrl}`);
    
    const headers = { 'Content-Type': 'application/json' };
    if (facility.deviceApiKey) {
      headers['Authorization'] = `Bearer ${facility.deviceApiKey}`;
    }

    // Send DELETE request to device
    const axios = require('axios');
    const deviceResponse = await axios.delete(deviceDeleteUrl, {
      headers: headers,
      timeout: 15000,
      validateStatus: (status) => (status >= 200 && status < 300) || status === 404
    });

    if (deviceResponse.status === 404) {
      console.log(`ℹ️ Person not found on device (may have been deleted already)`);
    } else {
      console.log(`✅ Employee deleted from device successfully`);
    }

    // Proceed with soft delete
    await employee.softDelete('user_request');
    
    const Attendance = require('../models/Attendance');
    const attendanceCount = await Attendance.countDocuments({ employee: employee._id });
    
    return res.json({ 
      success: true,
      message: 'Employee deleted successfully (direct device method)',
      deletedFrom: 'device-and-database',
      deletionType: 'soft_delete',
      attendanceRecordsPreserved: attendanceCount,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      canBeRestored: true,
      validationPerformed: false
    });
    
  } catch (error) {
    console.error('❌ Direct device delete failed:', error);
    throw error;
  }
}

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

// @desc    Generate next employee ID for a facility
// @route   GET /api/employees/generate-id/:facilityId
// @access  Private
exports.generateNextEmployeeId = async (req, res) => {
  try {
    const employeeId = await generateEmployeeId(req.params.facilityId);
    
    res.json({
      success: true,
      data: { employeeId }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete employee from XO5 device
// @route   DELETE /api/employees/device/:employeeId
// @access  Private (Facility Manager - own facility only, Admin - any facility)
exports.deleteEmployeeFromDevice = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    console.log(`\n=== DELETE EMPLOYEE FROM DEVICE ===`);
    console.log(`Employee ID: ${employeeId}`);
    console.log(`Requested by: ${req.user.role} (${req.user.email})`);
    
    // Find the employee
    const employee = await Employee.findOne({ employeeId }).populate('facility');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employeeId} not found`
      });
    }
    
    // Permission check: Facility managers can only delete from their assigned facilities
    if (req.user.role === 'facility-manager') {
      const canAccess = req.user.facilities.some(
        facilityId => facilityId.toString() === employee.facility._id.toString()
      );
      
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete employees from your assigned facilities'
        });
      }
    }
    
    // Admin and super-admin can delete from any facility
    
    const facility = employee.facility;
    
    // Check if facility has device configured
    if (!facility.configuration?.deviceKey) {
      console.log(`⚠️ Facility does not have device configured - only updating database`);
      
      // No device configured, just update the employee record
      employee.biometricData = {
        ...employee.biometricData,
        lastXO5Sync: null
      };
      employee.faceImageUploaded = false;
      await employee.save();
      
      return res.json({
        success: true,
        message: `Employee ${employeeId} (${employee.firstName} ${employee.lastName}) removed from database. Note: Facility "${facility.name}" does not have a device configured, so no device deletion was performed.`,
        data: {
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          facility: facility.name,
          note: 'No device configured - database only update'
        }
      });
    }
    
    const deviceKey = facility.configuration.deviceKey.toLowerCase();
    const secret = facility.configuration.deviceSecret || '';
    const personId = employee.biometricData?.xo5PersonSn || employeeId;
    
    console.log(`Facility: ${facility.name}`);
    console.log(`Device Key: ${deviceKey}`);
    console.log(`Person ID: ${personId}`);
    
    // Call Java service to delete employee from device
    try {
      const javaResponse = await axios.post('http://localhost:8081/api/employee/delete', {
        employeeId: personId,  // Java API expects 'employeeId' field (which is the person's ID on the device)
        deviceKey: deviceKey,
        secret: secret
      }, {
        timeout: 30000
      });
      
      console.log(`Java service response:`, javaResponse.data);
      
      if (javaResponse.data.success) {
        console.log(`✅ Employee deleted from device successfully`);
        
        // Update employee record to mark as not enrolled
        employee.biometricData = {
          ...employee.biometricData,
          lastXO5Sync: null
        };
        employee.faceImageUploaded = false;
        await employee.save();
        
        res.json({
          success: true,
          message: `Employee ${employeeId} (${employee.firstName} ${employee.lastName}) deleted from device successfully`,
          data: {
            employeeId: employee.employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            facility: facility.name,
            deviceResponse: javaResponse.data.message
          }
        });
      } else {
        console.log(`❌ Failed to delete from device: ${javaResponse.data.message}`);
        res.status(400).json({
          success: false,
          message: javaResponse.data.message || 'Failed to delete employee from device'
        });
      }
      
    } catch (javaError) {
      console.error('Java service error:', javaError.message);
      
      if (javaError.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          message: 'Device service is not available. Please ensure the Java service is running.'
        });
      }
      
      res.status(500).json({
        success: false,
        message: javaError.response?.data?.message || 'Failed to communicate with device service'
      });
    }
    
  } catch (error) {
    console.error('Error deleting employee from device:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete employee from device'
    });
  }
};
