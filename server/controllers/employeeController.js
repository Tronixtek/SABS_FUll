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

// @desc    Register new employee with Java XO5 integration
// @route   POST /api/employees/register
// @access  Private
exports.registerEmployeeWithDevice = async (req, res) => {
  let deviceEnrollmentSuccess = false;
  
  try {
    console.log(`\n🚀 ===== EMPLOYEE REGISTRATION STARTED (Device-First) =====`);
    
    const {
      employeeId, staffId, firstName, lastName, email, phone, facility,
      department, designation, cadre, shift, joiningDate,
      dateOfBirth, nationality, nationalId, gender, education,
      bloodGroup, allergies, address, profileImage, faceImage
    } = req.body;

    // ✅ STEP 1: VALIDATE INPUT DATA (NO deviceId required)
    console.log(`📋 Validating registration data...`);
    
    if (!employeeId || !staffId || !firstName || !lastName || !email || !facility || !department || !designation || !shift) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['employeeId', 'staffId', 'firstName', 'lastName', 'email', 'facility', 'department', 'designation', 'shift']
      });
    }

    if (!faceImage) {
      return res.status(400).json({
        success: false,
        message: 'Face image is required for biometric device enrollment'
      });
    }

    // Check for existing employee - only staffId is unique
    const existingEmployee = await Employee.findOne({ staffId });

    if (existingEmployee) {
      // ✅ If employee was soft-deleted, restore instead of creating new
      if (existingEmployee.isDeleted) {
        console.log(`♻️ Found soft-deleted employee with matching Staff ID - restoring`);
        console.log(`   Staff ID: ${existingEmployee.staffId}`);
        console.log(`   Deleted at: ${existingEmployee.deletedAt}`);
        
        // Update with new data
        existingEmployee.employeeId = employeeId;
        existingEmployee.firstName = firstName;
        existingEmployee.lastName = lastName;
        existingEmployee.email = email;
        existingEmployee.phone = phone;
        existingEmployee.facility = facility;
        existingEmployee.department = department;
        existingEmployee.designation = designation;
        existingEmployee.cadre = cadre;
        existingEmployee.shift = shift;
        existingEmployee.joiningDate = joiningDate;
        existingEmployee.dateOfBirth = dateOfBirth;
        existingEmployee.nationality = nationality;
        existingEmployee.nationalId = nationalId;
        existingEmployee.gender = gender;
        existingEmployee.education = education;
        existingEmployee.bloodGroup = bloodGroup;
        existingEmployee.allergies = allergies;
        existingEmployee.address = address;
        existingEmployee.profileImage = profileImage;
        existingEmployee.status = 'active';
        existingEmployee.faceImageUploaded = true;
        
        console.log(`✅ Employee data updated, proceeding with device enrollment...`);
        
        // Store for later use in database save step
        var restoringEmployee = existingEmployee;
        
      } else {
        // Employee exists and is NOT deleted - this is a real conflict
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
    // IMPORTANT: Convert to lowercase - device is case-sensitive!
    const facilityDeviceId = (facilityDoc.deviceInfo?.deviceId || facilityDoc.code || facility).toLowerCase();
    
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
    // Device key is already lowercase from facilityDeviceId
    const deviceKey = facilityDoc.configuration?.deviceKey?.toLowerCase() || facilityDeviceId;
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

    // Debug the response structure
    console.log(`   Java response code: ${javaResponse.data.code}`);
    console.log(`   Java response msg: ${javaResponse.data.msg}`);
    console.log(`   Java response success: ${javaResponse.data.success}`);
    
    // Check success - handle BOTH response formats:
    // Format 1 (BaseResult): { "code": "000", "msg": "..." }
    // Format 2 (Simple): { "success": true }
    const isJavaServiceSuccess = 
      javaResponse.data.code === "000" || 
      javaResponse.data.success === true;
    
    if (!isJavaServiceSuccess) {
      const errorCode = javaResponse.data.code || 'UNKNOWN';
      const errorMsg = javaResponse.data.msg || javaResponse.data.message || 'Unknown device error';
      
      console.error(`❌ Device enrollment failed [Code: ${errorCode}]: ${errorMsg}`);
      console.error(`   Full error response:`, javaResponse.data);
      
      // Provide more user-friendly error messages
      let userMessage = errorMsg;
      if (errorCode === '1002') {
        userMessage = `Device connection failed: ${errorMsg}. Please ensure the attendance device is powered on and connected to the network.`;
      } else if (errorCode === '1001') {
        userMessage = `Invalid data: ${errorMsg}`;
      } else if (errorCode === 'DUPLICATE_EMPLOYEE') {
        userMessage = `Employee is already enrolled on the device.`;
      }
      
      return res.status(502).json({
        success: false,
        message: userMessage,
        deviceError: errorMsg,
        deviceErrorCode: errorCode,
        deviceResponse: javaResponse.data,
        step: 'device_enrollment'
      });
    }

    console.log(`✅ Device enrollment successful!`);
    deviceEnrollmentSuccess = true;

    // ✅ STEP 4: SAVE TO DATABASE ONLY AFTER SUCCESSFUL DEVICE ENROLLMENT
    console.log(`💾 Device enrollment successful - Now saving to database...`);
    
    // Set default PIN for self-service portal
    const defaultPin = '123456'; // Default PIN for all new employees
    
    let savedEmployee;
    
    // Check if we're restoring an exact-match soft-deleted employee or creating new
    if (typeof restoringEmployee !== 'undefined' && restoringEmployee) {
      console.log(`♻️ Restoring exact-match soft-deleted employee to database...`);
      
      // Update device-related fields
      restoringEmployee.deviceId = facilityDeviceId;
      restoringEmployee.pin = defaultPin;
      restoringEmployee.employeeSelfServiceEnabled = true;
      restoringEmployee.pinMustChange = true;
      restoringEmployee.biometricData = {
        faceId: personId,
        xo5PersonSn: personId,
        xo5PersonName: `${firstName} ${lastName}`,
        xo5DeviceKey: deviceKey,
        xo5DeviceId: facilityDeviceId,
        lastXO5Sync: new Date()
      };
      
      // Restore the employee (undelete)
      await restoringEmployee.restore();
      savedEmployee = restoringEmployee;
      
      console.log(`✅ Employee restored from soft-delete with ID: ${savedEmployee._id}`);
    } else {
      console.log(`💾 Creating new employee record...`);
      
      const employeeData = {
        employeeId, staffId, firstName, lastName, email, phone, facility,
        department, designation, cadre, shift, joiningDate,
        dateOfBirth, nationality, nationalId, gender, education,
        bloodGroup, allergies, address,
        profileImage,
        faceImageUploaded: true,
        status: 'active',
        deviceId: facilityDeviceId,
        pin: defaultPin,
        employeeSelfServiceEnabled: true,
        pinMustChange: true,
        biometricData: {
          faceId: personId,
          xo5PersonSn: personId,
          xo5PersonName: `${firstName} ${lastName}`,
          xo5DeviceKey: deviceKey,
          xo5DeviceId: facilityDeviceId,
          lastXO5Sync: new Date()
        }
      };

      savedEmployee = await Employee.create(employeeData);
      console.log(`✅ Employee saved to database with ID: ${savedEmployee._id}`);
    }
    
    console.log(`🔑 Default PIN: ${defaultPin}`);

    // Populate related documents
    await savedEmployee.populate([
      { path: 'facility', select: 'name code' },
      { path: 'shift', select: 'name code startTime endTime' }
    ]);

    console.log(`✅ ===== REGISTRATION COMPLETED SUCCESSFULLY (Device-First) =====\n`);

    res.status(201).json({
      success: true,
      message: typeof restoringEmployee !== 'undefined' && restoringEmployee
        ? 'Employee restored and re-enrolled successfully' 
        : 'Employee registered successfully',
      data: {
        employee: savedEmployee,
        deviceEnrollment: {
          deviceId: facilityDeviceId,
          personId: personId,
          status: 'enrolled',
          facilityName: facilityDoc.name
        },
        selfServiceCredentials: {
          staffId: savedEmployee.staffId || savedEmployee.employeeId,
          pin: defaultPin,
          note: 'Default PIN is 123456. Employee must change it on first login.'
        },
        steps: {
          validation: 'completed',
          deviceEnrollment: 'completed',
          databaseSave: 'completed'
        },
        wasRestored: !!(typeof restoringEmployee !== 'undefined' && restoringEmployee)
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
          
          // Auto-generate PIN for self-service portal
          const recoveryGeneratedPin = Math.floor(100000 + Math.random() * 900000).toString();
          
          // Continue with database save since device enrollment actually succeeded
          const employeeData = {
            employeeId, firstName, lastName, email, phone, facility,
            department, designation, shift, joiningDate,
            dateOfBirth, nationality, nationalId,
            profileImage,
            faceImageUploaded: true,
            status: 'active',
            deviceId: facilityDeviceId,
            pin: recoveryGeneratedPin,
            employeeSelfServiceEnabled: true,
            pinMustChange: true,
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
              selfServiceCredentials: {
                staffId: newEmployee.staffId || newEmployee.employeeId,
                pin: recoveryGeneratedPin,
                note: 'This PIN will only be displayed once. Please save it securely and provide it to the employee.'
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

        // Use Java service for device deletion
        const deletePayload = {
          employeeId: employee.employeeId, // Staff ID (e.g., PHC00001)
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

