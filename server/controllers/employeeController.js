const Employee = require('../models/Employee');
const Facility = require('../models/Facility');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const javaServiceClient = require('../services/javaServiceClient');
const syncToDevice = require('./syncToDeviceHelper');
const { generateUniqueEmployeeId } = require('../utils/idGenerator');

// Helper function to generate unique employee ID (ATOMIC - prevents race conditions)
const generateEmployeeId = async (facilityId) => {
  // Use new atomic counter system
  return generateUniqueEmployeeId(facilityId);
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
    
    // Don't apply pagination if limit is very high (client-side pagination)
    const shouldPaginate = limit <= 100;
    const skip = shouldPaginate ? (page - 1) * limit : 0;
    
    const query_builder = Employee.find(query)
      .populate('facility', 'name code')
      .populate('shift', 'name code startTime endTime')
      .skip(skip)
      .sort({ createdAt: -1 });
    
    if (shouldPaginate) {
      query_builder.limit(parseInt(limit));
    }
    
    const employees = await query_builder;
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
    
    // Generate unique person ID for device (alphanumeric only - XO5 doesn't accept special chars)
    // Format: EMPLOYEEID + RANDOM (e.g., PHC00001A7X2M)
    // Employee ID is already unique, random suffix prevents edge-case collisions
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const personId = `${employeeId}${randomSuffix}`;
    
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
// Optimize face image - clean up data URI prefix if present
    let optimizedFaceImage = faceImage;
    if (faceImage.startsWith('data:')) {
      // Extract base64 part after comma
      const parts = faceImage.split(',');
      optimizedFaceImage = parts.length > 1 ? parts[1] : parts[0];
    } else if (faceImage.includes('data:image')) {
      // Handle malformed data URI
      optimizedFaceImage = faceImage.split(',').pop();
    }
    
    // Remove whitespace and any non-base64 characters (only keep valid base64 chars)
    optimizedFaceImage = optimizedFaceImage.replace(/[^A-Za-z0-9+/=]/g, '');
    
    // Ensure proper base64 padding (length must be multiple of 4)
    const paddingNeeded = (4 - (optimizedFaceImage.length % 4)) % 4;
    if (paddingNeeded > 0) {
      optimizedFaceImage += '='.repeat(paddingNeeded);
      console.log(`   ✓ Added ${paddingNeeded} padding character(s) to base64 string`);
    }

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
        console.error('Full error:', deviceError.response?.data || deviceError);
        
        // Extract detailed error from Java service response
        let errorMessage = 'Unknown device error';
        let errorCode = 'ERROR';
        
        if (deviceError.response?.data) {
          // Java service returned an error response
          const javaErrorData = deviceError.response.data;
          errorCode = javaErrorData.code || 'ERROR';
          errorMessage = javaErrorData.msg || javaErrorData.message || 'Unknown device error';
        } else if (deviceError.code === 'ECONNREFUSED') {
          errorMessage = 'Device service is not running or unavailable';
          errorCode = 'CONNECTION_REFUSED';
        } else if (deviceError.code === 'ETIMEDOUT') {
          errorMessage = 'Device service request timed out';
          errorCode = 'TIMEOUT';
        } else {
          errorMessage = deviceError.message || 'Failed to connect to device service';
          errorCode = deviceError.code || 'ERROR';
        }
        
        // Update employee with sync error (but keep employee record)
        savedEmployee.deviceSynced = false;
        savedEmployee.biometricData.syncStatus = 'failed';
        savedEmployee.biometricData.syncError = `[${errorCode}] ${errorMessage}`;
        savedEmployee.biometricData.lastSyncAttempt = new Date();
        await savedEmployee.save();

        deviceEnrollmentResult = {
          status: 'error',
          message: errorMessage,
          errorCode: errorCode,
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
    
    // Handle face image update if provided
    if (updateData.capturedImage && updateData.capturedImage.startsWith('data:image')) {
      const fs = require('fs');
      const path = require('path');
      
      // Extract base64 data
      const faceImageData = updateData.capturedImage.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Generate filename
      const filename = `face-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const uploadDir = path.join(__dirname, '../uploads/public-registrations');
      
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Save image file
      const filepath = path.join(uploadDir, filename);
      fs.writeFileSync(filepath, Buffer.from(faceImageData, 'base64'));
      
      // Update the profileImage path
      updateData.profileImage = `/uploads/public-registrations/${filename}`;
      
      console.log('✅ Updated profile image:', updateData.profileImage);
    }
    
    // Remove capturedImage from updateData as it's not a DB field
    delete updateData.capturedImage;
    
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

    // Allow re-sync even if already synced (record may be deleted from device)
    console.log(`\n🔄 ===== ${employee.deviceSynced ? 'RE-SYNC' : 'RETRY'} DEVICE SYNC =====`);

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

    // Optimize face image - clean up data URI prefix if present
    let optimizedFaceImage = faceImage;
    console.log(`   📊 Original image length: ${faceImage.length} characters`);
    console.log(`   📊 First 100 chars: ${faceImage.substring(0, 100)}`);
    
    // Check if it's a file path/URL instead of base64 data
    if (faceImage.startsWith('http://') || faceImage.startsWith('https://') || faceImage.startsWith('/uploads/') || faceImage.startsWith('uploads/')) {
      console.log(`   📷 Image is a URL/path, reading from disk...`);
      try {
        // Extract the file path from URL if needed
        let filePath = faceImage;
        if (faceImage.startsWith('http')) {
          // Extract path after domain: https://domain.com/uploads/... -> /uploads/...
          const urlObj = new URL(faceImage);
          filePath = urlObj.pathname;
        }
        
        // Convert to absolute path: /uploads/... -> server/uploads/...
        if (filePath.startsWith('/')) {
          filePath = filePath.substring(1); // Remove leading slash
        }
        const absolutePath = path.join(__dirname, '..', filePath);
        console.log(`   📂 Reading file: ${absolutePath}`);
        
        // Read file and convert to base64
        const imageBuffer = fs.readFileSync(absolutePath);
        optimizedFaceImage = imageBuffer.toString('base64');
        console.log(`   ✅ File read successfully: ${Math.round(imageBuffer.length / 1024)}KB`);
      } catch (fileError) {
        console.error(`   ❌ Failed to read image file: ${fileError.message}`);
        return res.status(400).json({
          success: false,
          message: 'Failed to read employee image file'
        });
      }
    } else if (faceImage.startsWith('data:')) {
      // Remove data URI prefix (data:image/jpeg;base64,)
      optimizedFaceImage = faceImage.split(',')[1];
      console.log(`   📊 After data URI removal: ${optimizedFaceImage.length} characters`);
    } else if (faceImage.includes('data:image')) {
      // Fallback for partial match
      optimizedFaceImage = faceImage.split(',')[1];
      console.log(`   📊 After fallback split: ${optimizedFaceImage.length} characters`);
    }
    
    // Remove whitespace and any non-base64 characters (clean up automatically)
    const beforeRegex = optimizedFaceImage.length;
    optimizedFaceImage = optimizedFaceImage.replace(/[^A-Za-z0-9+/=]/g, '');
    console.log(`   📊 After regex cleanup: ${optimizedFaceImage.length} characters (removed ${beforeRegex - optimizedFaceImage.length})`);
    
    // Ensure proper base64 padding (length must be multiple of 4)
    const paddingNeeded = (4 - (optimizedFaceImage.length % 4)) % 4;
    if (paddingNeeded > 0) {
      optimizedFaceImage += '='.repeat(paddingNeeded);
      console.log(`   ✓ Added ${paddingNeeded} padding character(s) to base64 string`);
    }
    
    // Log warning if we cleaned up invalid characters
    const originalLength = faceImage.length;
    const cleanedLength = optimizedFaceImage.length;
    if (originalLength !== cleanedLength) {
      console.log(`   ⚠️ Cleaned up ${originalLength - cleanedLength} invalid characters from image data`);
    }
    
    // Validate base64 format after cleanup
    if (!/^[A-Za-z0-9+/=]+$/.test(optimizedFaceImage)) {
      console.error(`❌ Invalid base64 format - contains illegal characters even after cleanup`);
      return res.status(400).json({
        success: false,
        message: 'Invalid image format - base64 validation failed'
      });
    }
    
    // Final length check
    if (optimizedFaceImage.length % 4 !== 0) {
      console.error(`❌ Invalid base64 length: ${optimizedFaceImage.length} (must be multiple of 4)`);
      return res.status(400).json({
        success: false,
        message: 'Invalid image format - incorrect base64 padding'
      });
    }

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

      console.log('📥 Java Service Response:', JSON.stringify(javaResponse.data, null, 2));

      // Check for face already exists error in deviceResponse field (nested in data.data)
      const deviceResponse = javaResponse.data.data?.deviceResponse || '';
      console.log('🔍 Checking deviceResponse field:', deviceResponse);
      console.log('🔍 javaResponse.data.code:', javaResponse.data.code);
      console.log('🔍 javaResponse.data.msg:', javaResponse.data.msg);
      console.log('🔍 javaResponse.data.success:', javaResponse.data.success);
      
      const isFaceAlreadyExists = javaResponse.data.code === "1500" || // Face already exists (orphan created)
                                  (javaResponse.data.msg && javaResponse.data.msg.includes('101010')) || // error code in msg
                                  deviceResponse.includes('101010') || // error code in deviceResponse
                                  deviceResponse.toLowerCase().includes('face already exists'); // text match (case insensitive)
      
      console.log('🔍 isFaceAlreadyExists:', isFaceAlreadyExists);
      
      const isDuplicatePerson = javaResponse.data.code === "100911" || javaResponse.data.code === "DUPLICATE_EMPLOYEE"; // Person already exists
      const isSuccess = (javaResponse.data.code === "000" || javaResponse.data.success === true) && !isFaceAlreadyExists; // Success only if no face error
      
      console.log('🔍 isDuplicatePerson:', isDuplicatePerson);
      console.log('🔍 isSuccess:', isSuccess);
      
      // Handle face already exists error (101010) - orphan person created, need cleanup
      if (isFaceAlreadyExists) {
        console.warn(`⚠️ Face already exists on device (error 101010) - cleaning up orphan person record`);
        console.log(`   Person ID to delete: ${personId}`);
        console.log(`   Device Key: ${deviceKey}`);
        
        // Delete the orphan person record
        try {
          const deletePayload = {
            employeeId: personId,
            deviceKey: deviceKey,
            secret: employee.facility.configuration?.deviceSecret || '123456'
          };
          
          console.log(`   🗑️ Calling delete endpoint: ${process.env.JAVA_SERVICE_URL}/api/employee/delete`);
          const deleteResponse = await axios.post(
            `${process.env.JAVA_SERVICE_URL || 'http://localhost:8081'}/api/employee/delete`,
            deletePayload,
            { timeout: 10000 }
          );
          console.log(`   ✅ Orphan person record deleted successfully: ${personId}`);
          console.log(`   Delete response:`, JSON.stringify(deleteResponse.data, null, 2));
        } catch (cleanupError) {
          console.warn(`   ⚠️ Failed to delete orphan record:`, cleanupError.message);
          if (cleanupError.response) {
            console.warn(`   Delete error response:`, JSON.stringify(cleanupError.response.data, null, 2));
          }
        }
        
        // Update employee with failure
        employee.deviceSynced = false;
        employee.deviceSyncStatus = 'failed';
        employee.biometricData.syncStatus = 'failed';
        employee.biometricData.syncError = 'Face already exists - retry with clearer image';
        employee.biometricData.lastSyncAttempt = new Date();
        await employee.save();
        
        return res.status(409).json({
          success: false,
          message: 'Face already registered on device. Please capture a NEW photo without glasses, cap, or uniform. Ensure good lighting and retry.',
          deviceErrorCode: '1500',
          canRetry: true,
          data: {
            employeeId: employee._id,
            deviceSyncStatus: 'failed',
            syncStatus: 'failed',
            lastAttempt: employee.biometricData.lastSyncAttempt
          }
        });
      }
      
      // Handle success: false with no error details - check Java service logs for actual error
      if (javaResponse.data.success === false && !javaResponse.data.code) {
        console.warn(`⚠️ Java service returned success: false with no error details`);
        console.warn('📥 This usually means the employee already exists on the device');
        console.warn('📥 Treating as successful sync (duplicate employee)');
        
        employee.deviceSynced = true;
        employee.deviceSyncStatus = 'synced';
        employee.biometricData.syncStatus = 'synced';
        employee.biometricData.lastXO5Sync = new Date();
        employee.biometricData.lastSyncAttempt = new Date();
        employee.biometricData.syncError = null;
        await employee.save();

        return res.json({
          success: true,
          message: 'Employee already synced to biometric device',
          data: {
            employeeId: employee._id,
            deviceSynced: true,
            deviceSyncStatus: 'synced',
            syncStatus: 'synced',
            lastSync: employee.biometricData.lastXO5Sync
          }
        });
      }

      if (isSuccess || isDuplicatePerson) {
        if (isDuplicatePerson) {
          console.log(`✅ Device sync successful (employee already exists on device)`);
        } else {
          console.log(`✅ Device sync successful!`);
        }
        
        // Update employee record - update both fields for compatibility
        employee.deviceSynced = true;
        employee.deviceSyncStatus = 'synced'; // Add this field
        employee.biometricData.syncStatus = 'synced';
        employee.biometricData.lastXO5Sync = new Date();
        employee.biometricData.lastSyncAttempt = new Date();
        employee.biometricData.syncError = null;
        await employee.save();

        return res.json({
          success: true,
          message: isDuplicatePerson 
            ? 'Employee already synced to biometric device' 
            : 'Employee synced to biometric device successfully',
          data: {
            employeeId: employee._id,
            deviceSynced: true,
            deviceSyncStatus: 'synced',
            syncStatus: 'synced',
            lastSync: employee.biometricData.lastXO5Sync
          }
        });
      } else {
        const errorCode = javaResponse.data.code || 'UNKNOWN';
        let errorMsg = javaResponse.data.msg || javaResponse.data.message || 'Unknown device error';
        
        // Handle face quality errors (code 1006 or 101008 in message)
        const isFaceMergeError = errorCode === '1006' || errorCode === '101008' || errorMsg.includes('101008') || errorMsg.toLowerCase().includes('face fails to merger') || errorMsg.toLowerCase().includes('failed to add face');
        
        if (isFaceMergeError) {
          // Face merge failed - orphan person record may exist, try to clean up
          console.warn(`⚠️ Face merge failed - attempting to clean up orphan person record`);
          try {
            const deletePayload = {
              employeeId: personId, // Use the exact personId that was created
              deviceKey: deviceKey,
              secret: employee.facility.configuration?.deviceSecret || '123456'
            };
            
            await axios.post(
              `${process.env.JAVA_SERVICE_URL || 'http://localhost:8081'}/api/employee/delete`,
              deletePayload,
              { timeout: 10000 }
            );
            console.log(`   ✅ Orphan person record cleaned up`);
          } catch (cleanupError) {
            console.warn(`   ⚠️ Cleanup failed (orphan may still exist):`, cleanupError.message);
          }
          
          errorMsg = 'Photo quality issue: Please ensure the image meets requirements (clear face, good lighting, front-facing) and re-upload the photo';
        }
        
        console.warn(`⚠️ Device sync failed: [${errorCode}] ${errorMsg}`);
        console.warn('📥 Full Java response:', JSON.stringify(javaResponse.data, null, 2));
        
        // Update with failure - update both fields for compatibility
        employee.deviceSynced = false;
        employee.deviceSyncStatus = 'failed'; // Add this field
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
            deviceSyncStatus: 'failed',
            syncStatus: 'failed',
            lastAttempt: employee.biometricData.lastSyncAttempt
          }
        });
      }

    } catch (deviceError) {
      console.error(`❌ Device sync error:`, deviceError.message);
      console.error('📥 Error response data:', JSON.stringify(deviceError.response?.data, null, 2));
      console.error('📥 Error status:', deviceError.response?.status);
      
      // Extract detailed error from Java service response
      let errorMessage = 'Unknown device error';
      let errorCode = 'ERROR';
      
      if (deviceError.response?.data) {
        // Java service returned an error response
        const javaErrorData = deviceError.response.data;
        errorCode = javaErrorData.code || 'ERROR';
        errorMessage = javaErrorData.msg || javaErrorData.message || 'Unknown device error';
        
        // Check if this is a duplicate employee error (treat as success)
        if (errorCode === '100911' || errorCode === 'DUPLICATE_EMPLOYEE' || errorCode === '1500' || (errorMessage && errorMessage.includes('101010'))) {
          console.log(`✅ Device sync successful (employee/face already exists on device)`);
          
          employee.deviceSynced = true;
          employee.deviceSyncStatus = 'synced';
          employee.biometricData.syncStatus = 'synced';
          employee.biometricData.lastXO5Sync = new Date();
          employee.biometricData.lastSyncAttempt = new Date();
          employee.biometricData.syncError = null;
          await employee.save();

          return res.json({
            success: true,
            message: 'Employee already synced to biometric device',
            data: {
              employeeId: employee._id,
              deviceSynced: true,
              deviceSyncStatus: 'synced',
              syncStatus: 'synced',
              lastSync: employee.biometricData.lastXO5Sync
            }
          });
        }
        
        // Handle face quality/merger errors (code 1006 or 101008 in message)
        const isFaceMergeError = errorCode === '1006' || errorCode === '101008' || errorMessage.includes('101008') || errorMessage.toLowerCase().includes('face fails to merger') || errorMessage.toLowerCase().includes('failed to add face');
        
        if (isFaceMergeError) {
          // Face merge failed - orphan person record may exist, try to clean up
          console.warn(`⚠️ Face merge failed (catch block) - attempting to clean up orphan person record`);
          try {
            const deletePayload = {
              employeeId: personId,
              deviceKey: deviceKey,
              secret: employee.facility.configuration?.deviceSecret || '123456'
            };
            
            await axios.post(
              `${process.env.JAVA_SERVICE_URL || 'http://localhost:8081'}/api/employee/delete`,
              deletePayload,
              { timeout: 10000 }
            );
            console.log(`   ✅ Orphan person record cleaned up`);
          } catch (cleanupError) {
            console.warn(`   ⚠️ Cleanup failed (orphan may still exist):`, cleanupError.message);
          }
          
          errorMessage = 'Photo quality issue: Please ensure the image meets requirements (clear face, good lighting, front-facing) and re-upload the photo';
          errorCode = 'POOR_IMAGE_QUALITY';
        }
      } else if (deviceError.code === 'ECONNREFUSED') {
        errorMessage = 'Device service is not running or unavailable';
        errorCode = 'CONNECTION_REFUSED';
      } else if (deviceError.code === 'ETIMEDOUT') {
        errorMessage = 'Device service request timed out';
        errorCode = 'TIMEOUT';
      } else {
        errorMessage = deviceError.message || 'Failed to connect to device service';
        errorCode = deviceError.code || 'ERROR';
      }
      
      // Update with error
      employee.deviceSynced = false;
      employee.biometricData.syncStatus = 'failed';
      employee.biometricData.syncError = `[${errorCode}] ${errorMessage}`;
      employee.biometricData.lastSyncAttempt = new Date();
      await employee.save();

      return res.status(503).json({
        success: false,
        message: errorMessage,
        deviceErrorCode: errorCode,
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

        // Check if employee not found on device (error 1003) - this is OK, proceed with DB deletion
        if (deleteResponse.data.code === '1003' || deleteResponse.data.errorCode === '1003') {
          console.log(`⚠️ Employee not found on device (already deleted or never synced)`);
          console.log(`✅ Proceeding with database deletion since device is clean`);
          // Continue to step 3 - database deletion
        } else if (!deleteResponse.data.success) {
          // Other device deletion errors - BLOCK database deletion
          console.log(`❌ Device deletion failed - BLOCKING database deletion`);
          
          return res.status(503).json({
            success: false,
            message: `Device deletion failed: ${deleteResponse.data.msg || deleteResponse.data.message}`,
            error: 'DEVICE_DELETION_FAILED',
            details: deleteResponse.data
          });
        } else {
          console.log(`✅ Device deletion successful`);
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

// @desc    Bulk sync employees to device
// @route   POST /api/employees/bulk-sync
// @access  Private
exports.bulkSyncEmployees = async (req, res) => {
  try {
    const { employeeIds } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of employee IDs to sync'
      });
    }

    console.log(`\n🔄 ===== BULK DEVICE SYNC (${employeeIds.length} employees) =====`);

    const results = {
      total: employeeIds.length,
      successful: [],
      failed: [],
      skipped: []
    };

    // Process employees sequentially to avoid overwhelming the device
    for (const employeeId of employeeIds) {
      try {
        console.log(`\n🔄 Processing employee ${results.successful.length + results.failed.length + results.skipped.length + 1}/${employeeIds.length}`);
        
        const employee = await Employee.findById(employeeId).populate('facility shift');
        
        if (!employee) {
          console.log(`❌ SKIP: Employee not found (ID: ${employeeId})`);
          results.skipped.push({
            employeeId,
            reason: 'Employee not found'
          });
          continue;
        }

        if (!employee.facility) {
          console.log(`❌ SKIP: ${employee.firstName} ${employee.lastName} - No facility assigned`);
          results.skipped.push({
            employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            reason: 'No facility assigned'
          });
          continue;
        }

        // Use the same sync logic as retry-device-sync - same device key fallback
        const axios = require('axios');
        const fs = require('fs');
        const path = require('path');
        
        // Use same device key logic as single sync - with fallback to facility code
        const facilityDeviceId = (employee.facility.deviceInfo?.deviceId || employee.facility.code).toLowerCase();
        const deviceKey = employee.facility.configuration?.deviceKey?.toLowerCase() || facilityDeviceId;
        const personId = employee.employeeId;
        
        console.log(`📱 Device Key: ${deviceKey} (from ${employee.facility.configuration?.deviceKey ? 'config' : 'facility code'})`);

        // Get profile image
        let capturedImage = employee.profileImage || employee.capturedImage;
        if (!capturedImage) {
          console.log(`❌ SKIP: ${employee.firstName} ${employee.lastName} - No profile image available`);
          console.log(`   profileImage: ${employee.profileImage || 'none'}`);
          console.log(`   capturedImage: ${employee.capturedImage || 'none'}`);
          results.skipped.push({
            employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            reason: 'No profile image available'
          });
          continue;
        }

        // Prepare image data - handle file paths and base64
        let optimizedFaceImage = capturedImage;
        
        // If it's a file path, read and convert to base64
        if (capturedImage.startsWith('/uploads/') || capturedImage.startsWith('uploads/')) {
          try {
            // Files are in server/uploads/, so go up one level from controllers/
            const imagePath = path.join(__dirname, '..', capturedImage);
            console.log(`📷 Reading image file: ${imagePath}`);
            const imageBuffer = fs.readFileSync(imagePath);
            optimizedFaceImage = imageBuffer.toString('base64');
            console.log(`✅ Image converted to base64 (${Math.round(optimizedFaceImage.length / 1024)}KB)`);
          } catch (fileError) {
            console.log(`❌ SKIP: ${employee.firstName} ${employee.lastName} - Failed to read image file`);
            console.log(`   Error: ${fileError.message}`);
            console.log(`   Path: ${capturedImage}`);
            results.skipped.push({
              employeeId,
              name: `${employee.firstName} ${employee.lastName}`,
              reason: `Failed to read image file: ${fileError.message}`
            });
            continue;
          }
        } else if (capturedImage.startsWith('http://') || capturedImage.startsWith('https://')) {
          console.log(`❌ SKIP: ${employee.firstName} ${employee.lastName} - Remote URL not supported`);
          results.skipped.push({
            employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            reason: 'Remote URLs not supported, image must be local'
          });
          continue;
        } else {
          // Already base64, extract if data URI
          console.log(`📷 Using base64 image (${Math.round(capturedImage.length / 1024)}KB)`);
          if (optimizedFaceImage.startsWith('data:')) {
            // Remove data URI prefix (data:image/jpeg;base64,)
            optimizedFaceImage = optimizedFaceImage.split(',')[1] || optimizedFaceImage;
          } else if (optimizedFaceImage.includes(',')) {
            // Fallback: split by comma if present
            optimizedFaceImage = optimizedFaceImage.split(',')[1];
          }
        }
        
        // Final cleanup: remove whitespace and any non-base64 characters (automatic cleanup)
        const beforeCleanup = optimizedFaceImage.length;
        optimizedFaceImage = optimizedFaceImage.replace(/[^A-Za-z0-9+/=]/g, '');
        const afterCleanup = optimizedFaceImage.length;
        
        // Ensure proper base64 padding (length must be multiple of 4)
        const paddingNeeded = (4 - (optimizedFaceImage.length % 4)) % 4;
        if (paddingNeeded > 0) {
          optimizedFaceImage += '='.repeat(paddingNeeded);
          console.log(`   ✓ Added ${paddingNeeded} padding character(s) to base64 string`);
        }
        
        if (beforeCleanup !== afterCleanup) {
          console.log(`   ⚠️ Cleaned up ${beforeCleanup - afterCleanup} invalid characters from image data`);
        }
        
        // Validate base64 (should only contain A-Z, a-z, 0-9, +, /, =)
        if (!/^[A-Za-z0-9+/=]+$/.test(optimizedFaceImage)) {
          console.log(`❌ SKIP: ${employee.firstName} ${employee.lastName} - Invalid base64 format even after cleanup`);
          console.log(`   First 100 chars: ${optimizedFaceImage.substring(0, 100)}`);
          results.skipped.push({
            employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            reason: 'Invalid base64 image format (contains illegal characters)'
          });
          continue;
        }

        const javaServicePayload = {
          employeeId: personId,
          fullName: `${employee.firstName} ${employee.lastName}`,
          faceImage: optimizedFaceImage,
          deviceKey: deviceKey,
          secret: employee.facility.configuration?.deviceSecret || '123456',
          verificationStyle: 0
        };

        try {
          const javaResponse = await axios.post(
            `${process.env.JAVA_SERVICE_URL || 'http://localhost:8081'}/api/employee/register`,
            javaServicePayload,
            {
              timeout: 60000,
              headers: { 'Content-Type': 'application/json' }
            }
          );

          const isSuccess = javaResponse.data.code === "000" || javaResponse.data.success === true;
          const isDuplicate = javaResponse.data.code === "100911" || 
                             javaResponse.data.code === "DUPLICATE_EMPLOYEE" ||
                             javaResponse.data.code === "1500" || // Face already exists
                             (javaResponse.data.msg && javaResponse.data.msg.includes('101010')); // face already exists

          if (isSuccess || isDuplicate) {
            employee.deviceSynced = true;
            employee.deviceSyncStatus = 'synced';
            employee.biometricData.syncStatus = 'synced';
            employee.biometricData.lastXO5Sync = new Date();
            employee.biometricData.lastSyncAttempt = new Date();
            employee.biometricData.syncError = null;
            await employee.save();

            results.successful.push({
              employeeId,
              name: `${employee.firstName} ${employee.lastName}`,
              message: isDuplicate ? 'Already synced' : 'Synced successfully'
            });
          } else {
            employee.deviceSyncStatus = 'failed';
            employee.biometricData.syncStatus = 'failed';
            await employee.save();

            // Handle face quality errors
            const errorCode = javaResponse.data.code || 'UNKNOWN';
            let errorMsg = javaResponse.data.msg || 'Unknown error';
            
            if (errorCode === '1006' || errorCode === '101008' || errorMsg.includes('101008') || errorMsg.toLowerCase().includes('face fails to merger') || errorMsg.toLowerCase().includes('failed to add face')) {
              errorMsg = 'Photo quality issue: Please ensure the image meets requirements (clear face, good lighting, front-facing) and re-upload the photo';
            }

            results.failed.push({
              employeeId,
              name: `${employee.firstName} ${employee.lastName}`,
              error: errorMsg
            });
          }
        } catch (deviceError) {
          const errorCode = deviceError.response?.data?.code;
          const errorMsg = deviceError.response?.data?.msg;
          const isDuplicate = errorCode === '100911' || errorCode === 'DUPLICATE_EMPLOYEE' || errorCode === '1500' || (errorMsg && errorMsg.includes('101010'));

          if (isDuplicate) {
            employee.deviceSynced = true;
            employee.deviceSyncStatus = 'synced';
            employee.biometricData.syncStatus = 'synced';
            employee.biometricData.lastXO5Sync = new Date();
            employee.biometricData.lastSyncAttempt = new Date();
            employee.biometricData.syncError = null;
            await employee.save();

            results.successful.push({
              employeeId,
              name: `${employee.firstName} ${employee.lastName}`,
              message: 'Already synced'
            });
          } else {
            employee.deviceSyncStatus = 'failed';
            employee.biometricData.syncStatus = 'failed';
            await employee.save();

            // Handle face quality errors (code 1006 or 101008 in message)
            let errorMsg = deviceError.response?.data?.msg || deviceError.message;
            const errorCode = deviceError.response?.data?.code;
            
            if (errorCode === '1006' || errorCode === '101008' || errorMsg.includes('101008') || errorMsg.toLowerCase().includes('face fails to merger') || errorMsg.toLowerCase().includes('failed to add face')) {
              errorMsg = 'Photo quality issue: Please ensure the image meets requirements (clear face, good lighting, front-facing) and re-upload the photo';
            }

            results.failed.push({
              employeeId,
              name: `${employee.firstName} ${employee.lastName}`,
              error: errorMsg
            });
          }
        }

      } catch (error) {
        console.error(`Error processing employee ${employeeId}:`, error);
        results.failed.push({
          employeeId,
          error: error.message
        });
      }
    }

    console.log(`\n✅ Bulk sync complete: ${results.successful.length} successful, ${results.failed.length} failed, ${results.skipped.length} skipped`);

    res.json({
      success: true,
      message: `Bulk sync complete: ${results.successful.length} successful, ${results.failed.length} failed, ${results.skipped.length} skipped`,
      data: results
    });

  } catch (error) {
    console.error('Bulk sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all registered persons from the biometric device
 * @desc    Fetch all employees registered on the device with their photos
 * @route   POST /api/employees/device/get-all-persons
 * @access  Private
 */
exports.getAllPersonsFromDevice = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('🔍 FETCH ALL PERSONS FROM DEVICE');
    console.log('========================================\n');

    const { deviceKey, secret, includePhotos = false } = req.body;

    // Validate required fields
    if (!deviceKey || !secret) {
      return res.status(400).json({
        success: false,
        message: 'Device key and secret are required'
      });
    }

    console.log(`📡 Device Key: ${deviceKey}`);
    console.log(`🔐 Secret: ${secret.substring(0, 4)}***`);
    console.log(`📸 Include Photos: ${includePhotos}`);

    // Call Java service to get all persons from device
    const javaServiceUrl = process.env.JAVA_SERVICE_URL || 'http://localhost:8081';
    const endpoint = `${javaServiceUrl}/api/device/get-all-persons`;

    console.log(`\n📞 Calling Java service: ${endpoint}`);

    try {
      const response = await axios.post(endpoint, {
        deviceKey,
        secret,
        includePhotos
      }, {
        timeout: 600000, // 10 min timeout (checking hasPhoto status for 1000+ persons takes time)
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`\n✅ Java service response received`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Success: ${response.data?.success}`);

      if (response.data?.success) {
        const persons = response.data?.data?.persons || [];
        const totalPersons = response.data?.data?.totalPersons || 0;

        console.log(`\n📊 Device Registry:`);
        console.log(`   Total persons on device: ${totalPersons}`);
        console.log(`   Persons with photos: ${persons.filter(p => p.hasPhoto).length}`);
        console.log(`   Persons without photos: ${persons.filter(p => !p.hasPhoto).length}`);

        // Log sample of first few persons
        if (persons.length > 0) {
          console.log(`\n👥 Sample of registered persons:`);
          persons.slice(0, 5).forEach((person, index) => {
            console.log(`   ${index + 1}. ${person.name} (ID: ${person.employeeId}) - Photo: ${person.hasPhoto ? '✅' : '❌'}`);
          });
          if (persons.length > 5) {
            console.log(`   ... and ${persons.length - 5} more`);
          }
        }

        return res.json({
          success: true,
          message: `Retrieved ${totalPersons} persons from device`,
          data: {
            totalPersons,
            persons,
            deviceKey,
            timestamp: new Date()
          }
        });

      } else {
        console.error(`\n❌ Java service returned error: ${response.data?.message}`);
        
        return res.status(400).json({
          success: false,
          message: response.data?.message || 'Failed to fetch persons from device',
          data: response.data?.data
        });
      }

    } catch (javaServiceError) {
      console.error(`\n❌ Java service error:`, javaServiceError.message);
      
      if (javaServiceError.response) {
        console.error(`   Status: ${javaServiceError.response.status}`);
        console.error(`   Data:`, javaServiceError.response.data);
        
        return res.status(javaServiceError.response.status || 500).json({
          success: false,
          message: javaServiceError.response.data?.message || 'Java service error',
          error: javaServiceError.response.data
        });
      } else if (javaServiceError.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          message: 'Java service is not running. Please start the Java attendance service.',
          error: 'Service unavailable'
        });
      } else {
        throw javaServiceError;
      }
    }

  } catch (error) {
    console.error('\n❌ Error fetching persons from device:', error.message);
    console.error(error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch persons from device',
      error: error.message
    });
  }
};

/**
 * Get photos for device persons from MongoDB
 * @desc    Fetch photos from MongoDB for employees registered on device
 * @route   POST /api/employees/device/get-photos
 * @access  Private
 */
exports.getPhotosForDevicePersons = async (req, res) => {
  try {
    const { employeeIds, facilityId } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({
        success: false,
        message: 'Employee IDs array is required'
      });
    }

    console.log(`\n📸 Fetching photos for ${employeeIds.length} device persons from MongoDB`);

    // Find employees by their XO5 person SN (device's sn field is stored as biometricData.xo5PersonSn)
    const query = {
      'biometricData.xo5PersonSn': { $in: employeeIds },
      isDeleted: false
    };

    if (facilityId) {
      query.facility = facilityId;
    }

    const employees = await Employee.find(query)
      .select('employeeId staffId firstName lastName profileImage biometricData.xo5PersonSn')
      .lean();

    console.log(`✅ Found ${employees.length} employees in MongoDB`);

    // Create a map of device SN (xo5PersonSn) to photo
    const photoMap = {};
    employees.forEach(emp => {
      if (emp.profileImage && emp.biometricData?.xo5PersonSn) {
        const deviceSn = emp.biometricData.xo5PersonSn;
        photoMap[deviceSn] = {
          employeeId: deviceSn,  // Use device SN as the key for matching
          staffId: emp.staffId,
          name: `${emp.firstName} ${emp.lastName}`,
          photo: emp.profileImage
        };
      }
    });

    res.json({
      success: true,
      message: `Retrieved photos for ${Object.keys(photoMap).length} employees`,
      data: {
        photoMap,
        totalRequested: employeeIds.length,
        totalFound: Object.keys(photoMap).length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching photos from MongoDB:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch photos from database',
      error: error.message
    });
  }
};
