const Employee = require('../models/Employee');
const Facility = require('../models/Facility');
const axios = require('axios');
const javaServiceClient = require('../services/javaServiceClient');
const syncToDevice = require('./syncToDeviceHelper');

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
        { staffId: { $regex: search, $options: 'i' } },
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

    // Set default PIN for self-service portal
    const defaultPin = '123456'; // Default PIN for all new employees
    req.body.pin = defaultPin;
    req.body.employeeSelfServiceEnabled = true;
    req.body.pinMustChange = true; // Force change on first login

    // Create employee in MERN database
    const employee = await Employee.create(req.body);
    await employee.populate('facility shift');

    console.log('✅ Employee created in MERN database:', employee.employeeId);
    console.log('🔑 Default PIN:', defaultPin);

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
    
    // Return employee data with default PIN
    res.status(201).json({
      success: true,
      data: employee,
      message: 'Employee created successfully',
      selfServiceCredentials: {
        staffId: employee.staffId || employee.employeeId,
        pin: defaultPin,
        note: 'Default PIN is 123456. Employee must change it on first login.'
      }
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

// @desc    Register new employee with Java XO5 integration (DATABASE-FIRST APPROACH)
// @route   POST /api/employees/register
// @access  Private
exports.registerEmployeeWithDevice = async (req, res) => {
  let savedEmployee = null;
  let deviceEnrollmentAttempted = false;
  
  try {
    console.log(`\n🚀 ===== EMPLOYEE REGISTRATION STARTED (Database-First) =====`);
    
    const {
      employeeId, staffId, firstName, lastName, email, phone, facility,
      department, designation, cadre, shift, joiningDate,
      dateOfBirth, nationality, nationalId, gender, education,
      bloodGroup, allergies, address, profileImage, faceImage
    } = req.body;

    // ✅ STEP 1: VALIDATE INPUT DATA
    console.log(`📋 Validating registration data...`);
    
    if (!employeeId || !staffId || !firstName || !lastName || !email || !facility || !department || !designation || !shift) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['employeeId', 'staffId', 'firstName', 'lastName', 'email', 'facility', 'department', 'designation', 'shift']
      });
    }

    // Check for existing employee - only staffId is unique
    const existingEmployee = await Employee.findOne({ staffId });

    if (existingEmployee && !existingEmployee.isDeleted) {
      return res.status(409).json({
        success: false,
        message: 'Staff ID already exists',
        conflictField: 'staffId',
        existingEmployee: {
          id: existingEmployee._id,
          employeeId: existingEmployee.employeeId,
          staffId: existingEmployee.staffId,
          name: `${existingEmployee.firstName} ${existingEmployee.lastName}`,
          status: existingEmployee.status
        }
      });
    }

    // Get facility information
    const Facility = require('../models/Facility');
    const facilityDoc = await Facility.findById(facility);
    
    if (!facilityDoc) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    console.log(`✅ Validation passed for employee: ${firstName} ${lastName} (${employeeId})`);

    // ✅ STEP 2: SAVE TO DATABASE FIRST (SOURCE OF TRUTH)
    console.log(`💾 Saving employee to database (source of truth)...`);
    
    // Set default PIN for self-service portal
    const defaultPin = '123456';
    
    // Prepare facility device info
    const facilityDeviceId = (facilityDoc.deviceInfo?.deviceId || facilityDoc.code || facility).toLowerCase();
    const deviceKey = facilityDoc.configuration?.deviceKey?.toLowerCase() || facilityDeviceId;
    
    // Generate unique person ID for device
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    let personId = `${employeeId}${randomSuffix}`;
    if (personId.length > 32) {
      personId = personId.substring(0, 32);
    }
    
    const employeeData = {
      employeeId, staffId, firstName, lastName, email, phone, facility,
      department, designation, cadre, shift, joiningDate,
      dateOfBirth, nationality, nationalId, gender, education,
      bloodGroup, allergies, address,
      profileImage,
      faceImageUploaded: !!faceImage,
      status: 'active',
      deviceId: facilityDeviceId,
      pin: defaultPin,
      employeeSelfServiceEnabled: true,
      pinMustChange: true,
      deviceSynced: false, // Will be updated after successful device enrollment
      biometricData: {
        faceId: personId,
        xo5PersonSn: personId,
        xo5PersonName: `${firstName} ${lastName}`,
        xo5DeviceKey: deviceKey,
        xo5DeviceId: facilityDeviceId,
        syncStatus: 'pending', // pending, synced, failed
        lastSyncAttempt: null,
        syncError: null
      }
    };

    // Handle soft-deleted employee restoration
    if (existingEmployee && existingEmployee.isDeleted) {
      console.log(`♻️ Restoring soft-deleted employee...`);
      Object.assign(existingEmployee, employeeData);
      await existingEmployee.restore();
      savedEmployee = existingEmployee;
    } else {
      savedEmployee = await Employee.create(employeeData);
    }
    
    console.log(`✅ Employee saved to database with ID: ${savedEmployee._id}`);
    console.log(`   Device sync status: pending`);

    // Populate related documents
    await savedEmployee.populate([
      { path: 'facility', select: 'name code' },
      { path: 'shift', select: 'name code startTime endTime' }
    ]);

    // ✅ STEP 3: ATTEMPT DEVICE ENROLLMENT (NON-BLOCKING)
    let deviceEnrollmentResult = {
      status: 'skipped',
      message: 'No face image provided',
      deviceSynced: false
    };

    // Check if facility supports smart device integration
    const supportsDeviceIntegration = facilityDoc.configuration?.integrationType === 'java-xo5';

    if (faceImage && supportsDeviceIntegration) {
      deviceEnrollmentAttempted = true;
      console.log(`🔄 Attempting device enrollment...`);
      console.log(`   Employee DB ID: ${savedEmployee._id}`);
      console.log(`   Person ID: ${personId}`);
      console.log(`   Facility Device: ${facilityDeviceId}`);

      try {
        // Optimize face image
        let optimizedFaceImage = faceImage;
        if (faceImage.includes('data:image')) {
          optimizedFaceImage = faceImage.split(',')[1];
        }
        optimizedFaceImage = optimizedFaceImage.replace(/\s+/g, '');

        const estimatedSizeKB = Math.round((optimizedFaceImage.length * 3/4) / 1024);
        console.log(`   Image size: ${estimatedSizeKB}KB`);

        const javaServicePayload = {
          employeeId: personId,
          fullName: `${firstName} ${lastName}`,
          faceImage: optimizedFaceImage,
          deviceKey: deviceKey,
          secret: facilityDoc.configuration?.deviceSecret || '123456',
          verificationStyle: 0
        };

        // Call Java device service with timeout
        const javaResponse = await axios.post(
          `${process.env.JAVA_SERVICE_URL || 'http://localhost:8081'}/api/employee/register`,
          javaServicePayload,
          {
            timeout: 60000,
            headers: { 'Content-Type': 'application/json' }
          }
        );

        const isSuccess = javaResponse.data.code === "000" || javaResponse.data.success === true;

        if (isSuccess) {
          console.log(`✅ Device enrollment successful!`);
          
          // Update employee record with sync success
          savedEmployee.deviceSynced = true;
          savedEmployee.biometricData.syncStatus = 'synced';
          savedEmployee.biometricData.lastXO5Sync = new Date();
          savedEmployee.biometricData.lastSyncAttempt = new Date();
          await savedEmployee.save();

          deviceEnrollmentResult = {
            status: 'success',
            message: 'Face enrolled to biometric device successfully',
            deviceSynced: true,
            personId: personId
          };
        } else {
          const errorCode = javaResponse.data.code || 'UNKNOWN';
          const errorMsg = javaResponse.data.msg || javaResponse.data.message || 'Unknown device error';
          
          console.warn(`⚠️ Device enrollment failed: [${errorCode}] ${errorMsg}`);
          
          // Update employee with sync failure (but keep employee record)
          savedEmployee.deviceSynced = false;
          savedEmployee.biometricData.syncStatus = 'failed';
          savedEmployee.biometricData.syncError = `[${errorCode}] ${errorMsg}`;
          savedEmployee.biometricData.lastSyncAttempt = new Date();
          await savedEmployee.save();

          deviceEnrollmentResult = {
            status: 'failed',
            message: errorMsg,
            errorCode: errorCode,
            deviceSynced: false,
            canRetry: true
          };
        }

      } catch (deviceError) {
        console.error(`❌ Device enrollment error:`, deviceError.message);
        
        // Update employee with sync error (but keep employee record)
        savedEmployee.deviceSynced = false;
        savedEmployee.biometricData.syncStatus = 'failed';
        savedEmployee.biometricData.syncError = deviceError.message;
        savedEmployee.biometricData.lastSyncAttempt = new Date();
        await savedEmployee.save();

        deviceEnrollmentResult = {
          status: 'error',
          message: deviceError.code === 'ECONNREFUSED' 
            ? 'Device service unavailable' 
            : deviceError.message,
          errorCode: deviceError.code || 'ERROR',
          deviceSynced: false,
          canRetry: true
        };
      }
    } else if (!supportsDeviceIntegration) {
      console.log(`ℹ️ Facility does not support biometric device integration`);
      deviceEnrollmentResult.message = 'Facility does not support biometric integration';
    }

    console.log(`✅ ===== REGISTRATION COMPLETED =====`);
    console.log(`   Employee ID: ${savedEmployee._id}`);
    console.log(`   Device Synced: ${deviceEnrollmentResult.deviceSynced}`);
    console.log(`   Sync Status: ${savedEmployee.biometricData.syncStatus}\n`);

    // Return success response (even if device enrollment failed)
    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      data: {
        employee: savedEmployee,
        deviceEnrollment: deviceEnrollmentResult,
        selfServiceCredentials: {
          staffId: savedEmployee.staffId || savedEmployee.employeeId,
          pin: defaultPin,
          note: 'Default PIN is 123456. Employee must change it on first login.'
        },
        steps: {
          validation: 'completed',
          databaseSave: 'completed',
          deviceEnrollment: deviceEnrollmentResult.status
        }
      }
    });

  } catch (error) {
    console.error(`❌ ===== REGISTRATION ERROR =====`);
    console.error(`Error: ${error.message}`);
    console.error(`Stack:`, error.stack);

    // If employee was saved but device enrollment failed, still return success
    if (savedEmployee && deviceEnrollmentAttempted) {
      return res.status(201).json({
        success: true,
        message: 'Employee created but device enrollment failed. You can retry sync later.',
        data: {
          employee: savedEmployee,
          deviceEnrollment: {
            status: 'failed',
            message: error.message,
            canRetry: true
          },
          selfServiceCredentials: {
            staffId: savedEmployee.staffId || savedEmployee.employeeId,
            pin: '123456',
            note: 'Default PIN is 123456. Employee must change it on first login.'
          },
          steps: {
            validation: 'completed',
            databaseSave: 'completed',
            deviceEnrollment: 'failed'
          }
        }
      });
    }

    // Database error - complete failure
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Employee already exists',
        error: 'DUPLICATE_ENTRY',
        step: 'database_save'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Employee registration failed',
      error: error.message
    });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private
exports.updateEmployee = async (req, res) => {
  try {
    // Clean up empty string values for ObjectId fields to prevent cast errors
    const updateData = { ...req.body };
    
    // List of fields that are ObjectId references
    const objectIdFields = ['facility', 'department', 'shift', 'salaryGrade'];
    
    // Convert empty strings to undefined for ObjectId fields
    objectIdFields.forEach(field => {
      if (updateData[field] === '' || updateData[field] === null) {
        updateData[field] = undefined;
      }
    });
    
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
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

// @desc    Retry device sync for employee with failed enrollment
// @route   POST /api/employees/:id/retry-device-sync
// @access  Private
exports.retryDeviceSync = async (req, res) => {
  try {
    const { id } = req.params;
    const { faceImage } = req.body;

    // Find employee
    const employee = await Employee.findById(id).populate('facility');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if already synced
    if (employee.deviceSynced && employee.biometricData?.syncStatus === 'synced') {
      return res.status(400).json({
        success: false,
        message: 'Employee is already synced to device',
        syncStatus: employee.biometricData.syncStatus,
        lastSync: employee.biometricData.lastXO5Sync
      });
    }

    // Check facility supports device integration
    if (employee.facility.configuration?.integrationType !== 'java-xo5') {
      return res.status(400).json({
        success: false,
        message: 'Facility does not support biometric device integration'
      });
    }

    if (!faceImage) {
      return res.status(400).json({
        success: false,
        message: 'Face image is required for device enrollment'
      });
    }

    console.log(`\n🔄 ===== RETRY DEVICE SYNC =====`);
    console.log(`   Employee: ${employee.firstName} ${employee.lastName}`);
    console.log(`   DB ID: ${employee._id}`);
    console.log(`   Current Sync Status: ${employee.biometricData?.syncStatus || 'unknown'}`);

    // Prepare device enrollment
    const facilityDeviceId = (employee.facility.deviceInfo?.deviceId || employee.facility.code).toLowerCase();
    const deviceKey = employee.facility.configuration?.deviceKey?.toLowerCase() || facilityDeviceId;
    const personId = employee.biometricData?.xo5PersonSn || employee.biometricData?.faceId;

    // Optimize face image
    let optimizedFaceImage = faceImage;
    if (faceImage.includes('data:image')) {
      optimizedFaceImage = faceImage.split(',')[1];
    }
    optimizedFaceImage = optimizedFaceImage.replace(/\s+/g, '');

    const estimatedSizeKB = Math.round((optimizedFaceImage.length * 3/4) / 1024);
    console.log(`   Image size: ${estimatedSizeKB}KB`);
    console.log(`   Person ID: ${personId}`);

    const javaServicePayload = {
      employeeId: personId,
      fullName: `${employee.firstName} ${employee.lastName}`,
      faceImage: optimizedFaceImage,
      deviceKey: deviceKey,
      secret: employee.facility.configuration?.deviceSecret || '123456',
      verificationStyle: 0
    };

    try {
      // Attempt device enrollment
      const javaResponse = await axios.post(
        `${process.env.JAVA_SERVICE_URL || 'http://localhost:8081'}/api/employee/register`,
        javaServicePayload,
        {
          timeout: 60000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const isSuccess = javaResponse.data.code === "000" || javaResponse.data.success === true;

      if (isSuccess) {
        console.log(`✅ Device sync successful!`);
        
        // Update employee record
        employee.deviceSynced = true;
        employee.biometricData.syncStatus = 'synced';
        employee.biometricData.lastXO5Sync = new Date();
        employee.biometricData.lastSyncAttempt = new Date();
        employee.biometricData.syncError = null;
        await employee.save();

        return res.json({
          success: true,
          message: 'Employee synced to biometric device successfully',
          data: {
            employeeId: employee._id,
            deviceSynced: true,
            syncStatus: 'synced',
            lastSync: employee.biometricData.lastXO5Sync
          }
        });
      } else {
        const errorCode = javaResponse.data.code || 'UNKNOWN';
        const errorMsg = javaResponse.data.msg || javaResponse.data.message || 'Unknown device error';
        
        console.warn(`⚠️ Device sync failed: [${errorCode}] ${errorMsg}`);
        
        // Update with failure
        employee.deviceSynced = false;
        employee.biometricData.syncStatus = 'failed';
        employee.biometricData.syncError = `[${errorCode}] ${errorMsg}`;
        employee.biometricData.lastSyncAttempt = new Date();
        await employee.save();

        return res.status(502).json({
          success: false,
          message: errorMsg,
          deviceErrorCode: errorCode,
          canRetry: true,
          data: {
            employeeId: employee._id,
            syncStatus: 'failed',
            lastAttempt: employee.biometricData.lastSyncAttempt
          }
        });
      }

    } catch (deviceError) {
      console.error(`❌ Device sync error:`, deviceError.message);
      
      // Update with error
      employee.deviceSynced = false;
      employee.biometricData.syncStatus = 'failed';
      employee.biometricData.syncError = deviceError.message;
      employee.biometricData.lastSyncAttempt = new Date();
      await employee.save();

      return res.status(503).json({
        success: false,
        message: deviceError.code === 'ECONNREFUSED' 
          ? 'Device service unavailable' 
          : 'Failed to connect to device service',
        error: deviceError.message,
        canRetry: true
      });
    }

  } catch (error) {
    console.error('Retry device sync error:', error);
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

    console.log(`\n🗑️ ===== VALIDATION-FIRST DELETE STARTED =====`);
    console.log(`   Employee: ${employee.firstName} ${employee.lastName}`);
    console.log(`   Employee ID: ${employee.employeeId}`);
    console.log(`   Device ID: ${employee.deviceId}`);
    console.log(`   Facility: ${employee.facility?.name || 'Unknown'}`);

    const facility = employee.facility;
    
    // Enhanced debugging for device deletion prerequisites
    console.log(`\n📋 Device Deletion Prerequisites Check:`);
    console.log(`   Employee deviceId exists: ${!!employee.deviceId}`);
    console.log(`   Employee deviceId value: ${employee.deviceId || 'NOT SET - Never enrolled on device'}`);

    // ✅ CRITICAL RULE: If employee has deviceId, MUST delete from device first
    if (employee.deviceId) {
      console.log(`\n🚨 MANDATORY DEVICE DELETION REQUIRED`);
      console.log(`   Employee was enrolled on device (deviceId: ${employee.deviceId})`);
      console.log(`   MUST delete from device before database deletion`);

      try {
        // ✅ STEP 2: DELETE FROM DEVICE VIA JAVA SERVICE
        console.log(`\n🔍 Step 2: Deleting employee from device via Java service...`);
        
        const javaServiceClient = require('../services/javaServiceClient');
        
        console.log(`   Java service enabled: ${javaServiceClient.isEnabled()}`);
        console.log(`   Java service URL: ${javaServiceClient.baseURL}`);
        
        if (!javaServiceClient.isEnabled()) {
          console.log(`❌ Java service integration is DISABLED - cannot proceed`);
          return res.status(503).json({
            success: false,
            message: 'Cannot delete employee: Java service integration is disabled but employee exists on device',
            error: 'JAVA_SERVICE_DISABLED',
            details: {
              employeeId: employee.employeeId,
              deviceId: employee.deviceId,
              requiresDeviceDeletion: true
            }
          });
        }

        // Get device secret from environment or use default
        const deviceSecret = process.env.DEVICE_SECRET || '123456';

        // ✅ CRITICAL: Use the EXACT personId that was used during enrollment (includes random suffix)
        // This is stored in biometricData.xo5PersonSn during enrollment
        const personIdToDelete = employee.biometricData?.xo5PersonSn || employee.employeeId;
        
        console.log(`   Person ID on device: ${personIdToDelete}`);
        console.log(`   Base employee ID: ${employee.employeeId}`);
        console.log(`   ${personIdToDelete !== employee.employeeId ? '⚠️ Using personId with suffix (from enrollment)' : 'ℹ️ No suffix found, using base ID'}`);

        // Use Java service for device deletion
        const deletePayload = {
          employeeId: personIdToDelete, // MUST use the exact personId from enrollment (with random suffix)
          deviceKey: employee.deviceId, // Device-generated ID (e.g., 020e7096a03f178165)
          secret: deviceSecret // Device secret from environment
        };

        console.log(`   Payload being sent to Java service:`, JSON.stringify(deletePayload, null, 2));
        console.log(`   Sending DELETE request to Java service...`);
        const deleteResponse = await javaServiceClient.client.post('/api/employee/delete', deletePayload);

        console.log(`   Java service response:`, deleteResponse.data);

        if (!deleteResponse.data.success) {
          // Device deletion failed - CANNOT proceed with database deletion
          console.log(`❌ Device deletion failed - BLOCKING database deletion`);
          
          if (deleteResponse.data.errorCode === '1003') {
            return res.status(400).json({
              success: false,
              message: 'Employee not found on biometric device',
              error: 'EMPLOYEE_NOT_ON_DEVICE',
              details: {
                employeeId: employee.employeeId,
                deviceId: employee.deviceId,
                canForceDelete: true,
                suggestion: 'Employee may have been deleted from device manually. Use force delete if needed.'
              }
            });
          }
          
          return res.status(503).json({
            success: false,
            message: `Device deletion failed: ${deleteResponse.data.message}`,
            error: 'DEVICE_DELETION_FAILED',
            details: deleteResponse.data
          });
        }

        // ✅ STEP 3: DEVICE DELETION SUCCESSFUL - NOW SAFE TO DELETE FROM DATABASE
        console.log(`✅ Employee deleted from device successfully`);
        console.log(`✅ Proceeding with database deletion...`);
        
        // ✅ STEP 4: SOFT DELETE FROM DATABASE AFTER SUCCESSFUL DEVICE DELETION
        console.log(`\n🗑️ Step 4: Performing soft delete from database...`);
        
        const Attendance = require('../models/Attendance');
        const attendanceCount = await Attendance.countDocuments({ employee: id });
        console.log(`   Found ${attendanceCount} attendance records (will be preserved)`);
        
        await employee.softDelete('user_request');
        
        console.log(`✅ Employee soft deleted from database successfully`);
        console.log(`✅ ===== DEVICE-FIRST DELETE COMPLETED =====\n`);

        return res.json({ 
          success: true,
          message: 'Employee deleted successfully from device and database',
          deletedFrom: 'device-and-database',
          deletionType: 'soft_delete',
          attendanceRecordsPreserved: attendanceCount,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          canBeRestored: true,
          deviceDeletionPerformed: true
        });

      } catch (deviceError) {
        console.error(`❌ Device deletion error - BLOCKING database deletion:`, deviceError.message);
        
        // Handle Java service connectivity issues - BLOCK database deletion
        if (deviceError.code === 'ECONNABORTED' || deviceError.code === 'ETIMEDOUT') {
          return res.status(503).json({ 
            success: false,
            message: 'Cannot delete: Java service request timed out. Employee remains on device.',
            error: 'JAVA_SERVICE_TIMEOUT',
            employeeId: id,
            deviceDeletionFailed: true
          });
        }
        
        if (deviceError.code === 'ECONNREFUSED' || deviceError.code === 'ENOTFOUND') {
          return res.status(503).json({ 
            success: false,
            message: 'Cannot delete: Java service is unreachable. Employee remains on device.',
            error: 'JAVA_SERVICE_UNREACHABLE',
            employeeId: id,
            deviceDeletionFailed: true
          });
        }

        // Java service error response - BLOCK database deletion
        if (deviceError.response) {
          return res.status(500).json({ 
            success: false,
            message: `Cannot delete: Java service error - ${deviceError.response.data?.message || deviceError.response.statusText}`,
            error: 'JAVA_SERVICE_ERROR',
            statusCode: deviceError.response.status,
            details: deviceError.response.data,
            deviceDeletionFailed: true
          });
        }

        // Network or other error - BLOCK database deletion
        return res.status(500).json({ 
          success: false,
          message: `Cannot delete: Failed to communicate with Java service - ${deviceError.message}`,
          error: 'JAVA_SERVICE_ERROR',
          deviceDeletionFailed: true
        });
      }
    } else {
      // ✅ SAFE PATH: Employee was never enrolled on device (no deviceId)
      console.log(`\n✅ SAFE DATABASE-ONLY DELETION`);
      console.log(`   Employee has no deviceId - was never enrolled on device`);
      console.log(`   Safe to delete from database only`);
      
      // ✅ SOFT DELETE FROM DATABASE (safe because employee was never on device)
      console.log(`\n🗑️ Performing soft delete from database...`);
      
      const Attendance = require('../models/Attendance');
      const attendanceCount = await Attendance.countDocuments({ employee: id });
      console.log(`   Found ${attendanceCount} attendance records (will be preserved)`);
      
      await employee.softDelete('user_request');
      
      console.log(`✅ Employee soft deleted from database successfully`);
      console.log(`✅ ===== DATABASE-ONLY DELETE COMPLETED =====\n`);

      return res.json({ 
        success: true,
        message: 'Employee deleted successfully (database only - never enrolled on device)',
        deletedFrom: 'database-only',
        deletionType: 'soft_delete',
        attendanceRecordsPreserved: attendanceCount,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        canBeRestored: true,
        deviceDeletionPerformed: false,
        reason: 'Employee was never enrolled on biometric device'
      });
    }

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

