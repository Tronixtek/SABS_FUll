const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const Employee = require('../models/Employee');
const Facility = require('../models/Facility');
const Shift = require('../models/Shift');
const { 
  generateUniqueEmployeeId, 
  generateUniqueStaffId,
  generateUniqueDevicePersonId 
} = require('../utils/idGenerator');

// Configure multer for face image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/public-registrations');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(7);
    cb(null, `face-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG) are allowed'));
    }
  }
});

/**
 * @desc    Public employee self-registration
 * @route   POST /api/public/self-register
 * @access  Public (no authentication required)
 */
router.post('/self-register', upload.single('faceImage'), async (req, res) => {
  try {
    console.log('\n🌐 ===== PUBLIC SELF-REGISTRATION STARTED =====');
    console.log('📋 Request Body:', {
      ...req.body,
      faceImage: req.file ? 'File uploaded' : req.body.faceImageBase64 ? 'Base64 provided' : 'None'
    });

    const {
      firstName, lastName, email, phone, facility,
      department, designation, cadre, shift, staffId, dateOfBirth,
      nationality, gender, education,
      bloodGroup, allergies, address, faceImageBase64
    } = req.body;

    // ✅ STEP 1: VALIDATE REQUIRED FIELDS
    if (!firstName || !lastName || !phone || !facility || !shift || !staffId || !dateOfBirth || !nationality || !gender) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['firstName', 'lastName', 'phone', 'facility', 'shift', 'staffId', 'dateOfBirth', 'nationality', 'gender']
      });
    }
    
    // Validate face image is provided
    if (!req.file && !faceImageBase64) {
      return res.status(400).json({
        success: false,
        message: 'Face image is required. Please capture or upload your photo.',
        field: 'faceImage'
      });
    }
    
    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        field: 'email'
      });
    }
    
    // Validate phone number format (basic validation)
    if (phone && !/^[\d\s\-\+\(\)]+$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
        field: 'phone'
      });
    }

    // Check if staffId already exists
    const existingEmployee = await Employee.findOne({ staffId });
    if (existingEmployee && !existingEmployee.isDeleted) {
      // Check if this is a retry after face rejection
      if (existingEmployee.deviceSyncStatus === 'failed' && faceImageBase64) {
        console.log('🔄 Retrying device sync for existing employee after face rejection');
        console.log('   Employee ID:', existingEmployee._id);
        console.log('   Staff ID:', existingEmployee.staffId);
        console.log('   Previous sync status:', existingEmployee.deviceSyncStatus);
        
        // Update the face image and retry sync
        let faceImageData;
        let profileImagePath;
        
        if (req.file) {
          profileImagePath = `/uploads/public-registrations/${req.file.filename}`;
          const imageBuffer = fs.readFileSync(req.file.path);
          faceImageData = imageBuffer.toString('base64');
        } else if (faceImageBase64) {
          faceImageData = faceImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
          const filename = `face-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
          const uploadDir = path.join(__dirname, '../uploads/public-registrations');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const filepath = path.join(uploadDir, filename);
          const buffer = Buffer.from(faceImageData, 'base64');
          fs.writeFileSync(filepath, buffer);
          profileImagePath = `/uploads/public-registrations/${filename}`;
        }
        
        // Update employee with new image
        existingEmployee.profileImage = profileImagePath;
        await existingEmployee.save();
        
        // Populate for sync
        await existingEmployee.populate([
          { path: 'facility', select: 'name code configuration deviceInfo' },
          { path: 'shift', select: 'name code startTime endTime' }
        ]);
        
        // Jump to device sync section (will be handled below)
        return await retryDeviceSync(existingEmployee, faceImageData, res);
      }
      
      return res.status(409).json({
        success: false,
        message: 'Staff ID already exists. Please use a different Staff ID.',
        conflictField: 'staffId'
      });
    }

    // Validate facility exists
    const facilityDoc = await Facility.findById(facility);
    if (!facilityDoc) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    // Validate shift exists and is active
    const shiftDoc = await Shift.findOne({ 
      _id: shift,
      facility: facility,
      status: 'active'
    });

    if (!shiftDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shift selected. Please select a valid active shift for this facility.'
      });
    }

    // ✅ STEP 2: GENERATE UNIQUE IDs (ATOMIC - NO RACE CONDITIONS)
    console.log('🔢 Generating unique IDs...');
    
    const employeeId = await generateUniqueEmployeeId(facility);
    // Use the staffId provided by the user instead of auto-generating
    const xo5PersonSn = generateUniqueDevicePersonId(employeeId);

    console.log(`✅ IDs Generated:`, {
      employeeId,
      staffId, // User-provided
      xo5PersonSn
    });

    // ✅ STEP 3: PREPARE FACE IMAGE
    let profileImagePath = null;
    let faceImageData = null;

    console.log('📸 Image upload check:', {
      hasFile: !!req.file,
      hasBase64: !!faceImageBase64,
      base64Length: faceImageBase64?.length
    });

    if (req.file) {
      // File upload
      profileImagePath = `/uploads/public-registrations/${req.file.filename}`;
      // Read file and convert to base64 for future device sync
      const imageBuffer = fs.readFileSync(req.file.path);
      faceImageData = imageBuffer.toString('base64');
      console.log('✅ Face image uploaded:', profileImagePath);
    } else if (faceImageBase64) {
      // Base64 upload
      console.log('📸 Processing base64 image...', {
        hasBase64: !!faceImageBase64,
        base64Length: faceImageBase64?.length,
        base64Start: faceImageBase64?.substring(0, 50)
      });
      
      faceImageData = faceImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Save to file for display
      const filename = `face-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const uploadDir = path.join(__dirname, '../uploads/public-registrations');
      
      console.log('� __dirname:', __dirname);
      console.log('�📁 Upload directory path:', uploadDir);
      
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        console.log('🗂️ Creating upload directory...');
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filepath = path.join(uploadDir, filename);
      console.log('💾 Writing file to:', filepath);
      
      try {
        const buffer = Buffer.from(faceImageData, 'base64');
        console.log('📦 Buffer size:', buffer.length, 'bytes');
        
        // Validate buffer size (max 10MB)
        if (buffer.length > 10 * 1024 * 1024) {
          return res.status(400).json({
            success: false,
            message: 'Image file too large. Maximum size is 10MB.',
            field: 'faceImage'
          });
        }
        
        // Validate buffer is not empty
        if (buffer.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid image data. Please try again.',
            field: 'faceImage'
          });
        }
        
        fs.writeFileSync(filepath, buffer);
        console.log('✅ File write successful');
        
        // Verify file was written
        if (!fs.existsSync(filepath)) {
          console.error('❌ File write failed - file does not exist after write');
          return res.status(500).json({
            success: false,
            message: 'Failed to save image file. Please try again.'
          });
        }
        
        const stats = fs.statSync(filepath);
        console.log('✅ File verified - size:', stats.size, 'bytes');
        
      } catch (err) {
        console.error('❌ Error writing file:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to process image. Please try again.',
          error: err.message
        });
      }
      
      profileImagePath = `/uploads/public-registrations/${filename}`;
      console.log('✅ Face image saved from base64:', profileImagePath);
    }

    // ✅ STEP 4: CREATE EMPLOYEE RECORD (DATABASE ONLY - NO DEVICE SYNC)
    console.log('💾 Saving to database...');

    const facilityDeviceId = (facilityDoc.deviceInfo?.deviceId || facilityDoc.code || facility).toLowerCase();
    const deviceKey = facilityDoc.configuration?.deviceKey?.toLowerCase() || facilityDeviceId;
    
    // Check if facility has device configuration
    if (!facilityDoc.deviceInfo?.deviceId && !facilityDoc.code) {
      console.warn('⚠️ Facility has no device configuration');
      return res.status(400).json({
        success: false,
        message: 'This facility is not configured for biometric enrollment. Please contact admin.',
        error: 'FACILITY_NOT_CONFIGURED'
      });
    }
    
    // Validate Java service is accessible before creating employee
    try {
      const javaServiceUrl = process.env.JAVA_SERVICE_URL || 'http://localhost:8081';
      const healthCheck = await axios.get(`${javaServiceUrl}/actuator/health`, { timeout: 5000 });
      console.log('✅ Java service is available:', healthCheck.data.status);
    } catch (serviceError) {
      console.error('❌ Java service unavailable:', serviceError.message);
      return res.status(503).json({
        success: false,
        message: 'Biometric enrollment service is currently unavailable. Please try again later.',
        error: 'SERVICE_UNAVAILABLE'
      });
    }

    const employeeData = {
      employeeId,
      staffId,
      firstName,
      lastName,
      email: email || `${employeeId}@temp.local`, // Temporary email if not provided
      phone,
      facility,
      department: department || 'Unassigned',
      designation: designation || 'Employee',
      cadre: cadre || 'General',
      shift: shift,
      joiningDate: new Date(), // Registration date
      dateOfBirth,
      nationality,
      gender,
      education: education || 'Not Specified',
      bloodGroup: bloodGroup || undefined,
      allergies: allergies || undefined,
      address: typeof address === 'string' ? JSON.parse(address) : address,
      profileImage: profileImagePath,
      faceImageUploaded: !!faceImageData,
      status: 'active',
      deviceId: facilityDeviceId,
      
      // Default PIN for employee portal
      pin: '123456',
      employeeSelfServiceEnabled: true,
      pinMustChange: true,
      
      // Device sync status (pending admin action)
      deviceSynced: false,
      deviceSyncStatus: 'pending',
      
      // Biometric data for future device sync
      biometricData: {
        faceId: xo5PersonSn,
        xo5PersonSn: xo5PersonSn,
        xo5PersonName: `${firstName} ${lastName}`,
        xo5DeviceKey: deviceKey,
        xo5DeviceId: facilityDeviceId,
        syncStatus: 'pending', // Admin will sync later
        lastSyncAttempt: null,
        syncError: null
      },
      
      // Metadata
      metadata: {
        registrationSource: 'public_self_registration',
        registrationDate: new Date().toISOString(),
        requiresAdminReview: 'true',
        faceImageStored: faceImageData ? 'true' : 'false'
      }
    };

    const employee = await Employee.create(employeeData);

    // Populate relations
    await employee.populate([
      { path: 'facility', select: 'name code configuration deviceInfo' },
      { path: 'shift', select: 'name code startTime endTime' }
    ]);

    console.log('✅ Employee registered successfully:', employee._id);
    console.log('🔄 Attempting immediate device sync...');

    // ✅ STEP 5: ATTEMPT IMMEDIATE DEVICE SYNC
    let syncResult = { success: false, error: null };
    
    try {
      let base64Image;
      
      // Check if faceImageData is already base64 or a file path
      if (req.file) {
        // File upload - faceImageData is already base64 from line 136
        base64Image = faceImageData;
        console.log(`   Using base64 from file upload (${base64Image.length} chars)`);
      } else if (faceImageBase64) {
        // Base64 upload - faceImageData is already base64 from line 148
        base64Image = faceImageData;
        console.log(`   Using base64 from direct upload (${base64Image.length} chars)`);
      } else {
        throw new Error('No face image data available for sync');
      }
      
      // Clean up base64 (add padding if needed)
      const paddingNeeded = (4 - (base64Image.length % 4)) % 4;
      if (paddingNeeded > 0) {
        base64Image += '='.repeat(paddingNeeded);
        console.log(`   Added ${paddingNeeded} padding characters`);
      }
      
      // Prepare device sync payload
      const javaServicePayload = {
        employeeId: xo5PersonSn,
        fullName: `${firstName} ${lastName}`,
        faceImage: base64Image,
        deviceKey: deviceKey,
        secret: facilityDoc.configuration?.deviceSecret || '123456',
        verificationStyle: 0
      };
      
      console.log(`   Syncing to device: ${deviceKey}`);
      const javaResponse = await axios.post(
        `${process.env.JAVA_SERVICE_URL || 'http://localhost:8081'}/api/employee/register`,
        javaServicePayload,
        { timeout: 60000 }
      );
      
      console.log('📥 Device sync response:', javaResponse.data);
      
      // Check for face errors in deviceResponse field
      const deviceResponse = javaResponse.data.data?.deviceResponse || '';
      const isFaceError = javaResponse.data.code === "1500" ||
                         (javaResponse.data.msg && javaResponse.data.msg.includes('101010')) ||
                         deviceResponse.includes('101010') ||
                         deviceResponse.toLowerCase().includes('face already exists') ||
                         deviceResponse.includes('face image processing failed');
      
      if (isFaceError) {
        console.warn('⚠️ Face image rejected by device');
        syncResult.error = 'FACE_REJECTED';
        syncResult.message = 'Face image quality issue. Please retake photo with better lighting, no glasses/cap.';
        
        // Try to clean up orphan person record on device
        try {
          console.log('🗑️ Attempting to delete orphan person record...');
          const deletePayload = {
            employeeId: xo5PersonSn,
            deviceKey: deviceKey,
            secret: facilityDoc.configuration?.deviceSecret || '123456'
          };
          
          const deleteResponse = await axios.post(
            `${process.env.JAVA_SERVICE_URL || 'http://localhost:8081'}/api/employee/delete`,
            deletePayload,
            { timeout: 10000 }
          );
          
          if (deleteResponse.data.success) {
            console.log('✅ Orphan person record deleted successfully');
          } else {
            console.log('⚠️ Orphan cleanup response:', deleteResponse.data.msg);
          }
        } catch (cleanupError) {
          console.warn('⚠️ Orphan cleanup failed (may not exist):', cleanupError.message);
          // Don't fail registration due to cleanup error
        }
        
        // Update employee status
        employee.deviceSyncStatus = 'failed';
        employee.biometricData.syncStatus = 'failed';
        employee.biometricData.syncError = syncResult.message;
        employee.biometricData.lastSyncAttempt = new Date();
        await employee.save();
        
      } else if (javaResponse.data.success || javaResponse.data.code === "000") {
        console.log('✅ Device sync successful!');
        syncResult.success = true;
        
        // Update employee with sync success
        employee.deviceSynced = true;
        employee.deviceSyncStatus = 'synced';
        employee.biometricData.syncStatus = 'synced';
        employee.biometricData.lastXO5Sync = new Date();
        employee.biometricData.syncError = null;
        await employee.save();
        
      } else {
        console.warn('⚠️ Device sync failed:', javaResponse.data.msg);
        syncResult.error = 'SYNC_FAILED';
        syncResult.message = javaResponse.data.msg || 'Device sync failed';
        
        employee.deviceSyncStatus = 'failed';
        employee.biometricData.syncStatus = 'failed';
        employee.biometricData.syncError = syncResult.message;
        await employee.save();
      }
      
    } catch (syncError) {
      console.error('❌ Device sync error:', syncError.message);
      syncResult.error = 'SYNC_ERROR';
      syncResult.message = syncError.message;
      
      employee.deviceSyncStatus = 'failed';
      employee.biometricData.syncStatus = 'failed';
      employee.biometricData.syncError = syncError.message;
      await employee.save();
    }

    console.log('===== PUBLIC REGISTRATION COMPLETED =====\n');

    // ✅ STEP 6: RETURN RESPONSE BASED ON SYNC RESULT
    if (syncResult.error === 'FACE_REJECTED') {
      // Face rejected - allow retry
      return res.status(422).json({
        success: false,
        error: 'FACE_REJECTED',
        message: syncResult.message,
        canRetry: true,
        data: {
          employeeId: employee._id,
          staffId: employee.staffId,
          requiresImageRetake: true
        }
      });
    }
    
    // Registration successful (device sync may have failed but employee is created)
    res.status(201).json({
      success: true,
      message: syncResult.success 
        ? 'Registration successful! Your biometric has been enrolled.'
        : 'Registration successful! Your account has been created.',
      deviceSyncStatus: employee.deviceSyncStatus,
      data: {
        employee: {
          id: employee._id,
          employeeId: employee.employeeId,
          staffId: employee.staffId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          phone: employee.phone,
          facility: employee.facility,
          shift: employee.shift,
          status: employee.status,
          deviceSyncStatus: employee.deviceSyncStatus
        },
        credentials: {
          staffId: employee.staffId,
          pin: '123456',
          note: 'Use this Staff ID and PIN to login to the Employee Portal. You must change your PIN on first login.'
        },
        nextSteps: [
          'Your account has been created successfully',
          'An administrator will sync your biometric data to the device',
          'You can login to the Employee Portal using your Staff ID and PIN',
          'Please change your PIN after first login for security'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Public registration error:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field} already exists. Please contact administrator.`,
        error: 'DUPLICATE_ENTRY'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again or contact administrator.',
      error: error.message
    });
  }
});

/**
 * @desc    Get available facilities for public registration
 * @route   GET /api/public/facilities
 * @access  Public
 */
router.get('/facilities', async (req, res) => {
  try {
    // Get all active facilities (allowPublicRegistration check can be added later)
    const facilities = await Facility.find({ 
      status: 'active'
    }).select('name code address');

    res.json({
      success: true,
      data: facilities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch facilities',
      error: error.message
    });
  }
});

/**
 * @desc    Check registration status
 * @route   GET /api/public/registration-status/:staffId
 * @access  Public
 */
router.get('/registration-status/:staffId', async (req, res) => {
  try {
    const employee = await Employee.findOne({ 
      staffId: req.params.staffId 
    })
    .select('firstName lastName staffId deviceSyncStatus deviceSynced biometricData.syncStatus')
    .populate('facility', 'name');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.json({
      success: true,
      data: {
        name: `${employee.firstName} ${employee.lastName}`,
        staffId: employee.staffId,
        facility: employee.facility.name,
        deviceSyncStatus: employee.biometricData?.syncStatus || 'pending',
        deviceSynced: employee.deviceSynced,
        canLogin: employee.deviceSynced
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check status',
      error: error.message
    });
  }
});

// @desc    Get all active shifts (PUBLIC - No Auth Required)
// @route   GET /api/public/shifts
// @access  Public
router.get('/shifts', async (req, res) => {
  try {
    const shifts = await Shift.find({ status: 'active' })
      .populate('facility', 'name code')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: shifts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper function to retry device sync
async function retryDeviceSync(employee, faceImageData, res) {
  console.log('🔄 Attempting device sync retry...');
  
  let syncResult = { success: false, error: null };
  
  try {
    let base64Image = faceImageData;
    
    // Clean up base64 (add padding if needed)
    const paddingNeeded = (4 - (base64Image.length % 4)) % 4;
    if (paddingNeeded > 0) {
      base64Image += '='.repeat(paddingNeeded);
      console.log(`   Added ${paddingNeeded} padding characters`);
    }
    
    // Prepare device sync payload
    const xo5PersonSn = employee.biometricData.xo5PersonSn;
    const deviceKey = employee.biometricData.xo5DeviceKey;
    
    const javaServicePayload = {
      employeeId: xo5PersonSn,
      fullName: `${employee.firstName} ${employee.lastName}`,
      faceImage: base64Image,
      deviceKey: deviceKey,
      secret: employee.facility.configuration?.deviceSecret || '123456',
      verificationStyle: 0
    };
    
    console.log(`   Syncing to device: ${deviceKey}`);
    const javaResponse = await axios.post(
      `${process.env.JAVA_SERVICE_URL || 'http://localhost:8081'}/api/employee/register`,
      javaServicePayload,
      { timeout: 60000 }
    );
    
    console.log('📥 Device sync response:', javaResponse.data);
    
    // Check for face errors in deviceResponse field
    const deviceResponse = javaResponse.data.data?.deviceResponse || '';
    const isFaceError = javaResponse.data.code === "1500" ||
                       (javaResponse.data.msg && javaResponse.data.msg.includes('101010')) ||
                       deviceResponse.includes('101010') ||
                       deviceResponse.toLowerCase().includes('face already exists') ||
                       deviceResponse.includes('face image processing failed');
    
    if (isFaceError) {
      console.warn('⚠️ Face image rejected by device (retry)');
      syncResult.error = 'FACE_REJECTED';
      syncResult.message = 'Face image quality issue. Please retake photo with better lighting, no glasses/cap.';
      
      // Try to clean up orphan person record
      try {
        console.log('🗑️ Attempting to delete orphan person record (retry)...');
        const deletePayload = {
          employeeId: xo5PersonSn,
          deviceKey: deviceKey,
          secret: employee.facility.configuration?.deviceSecret || '123456'
        };
        
        const deleteResponse = await axios.post(
          `${process.env.JAVA_SERVICE_URL || 'http://localhost:8081'}/api/employee/delete`,
          deletePayload,
          { timeout: 10000 }
        );
        
        if (deleteResponse.data.success) {
          console.log('✅ Orphan person record deleted successfully');
        }
      } catch (cleanupError) {
        console.warn('⚠️ Orphan cleanup failed:', cleanupError.message);
      }
      
      employee.deviceSyncStatus = 'failed';
      employee.biometricData.syncStatus = 'failed';
      employee.biometricData.syncError = syncResult.message;
      employee.biometricData.lastSyncAttempt = new Date();
      await employee.save();
      
      return res.status(422).json({
        success: false,
        error: 'FACE_REJECTED',
        message: syncResult.message,
        canRetry: true,
        data: {
          employeeId: employee._id,
          staffId: employee.staffId,
          requiresImageRetake: true
        }
      });
      
    } else if (javaResponse.data.success || javaResponse.data.code === "000") {
      console.log('✅ Device sync successful on retry!');
      syncResult.success = true;
      
      employee.deviceSynced = true;
      employee.deviceSyncStatus = 'synced';
      employee.biometricData.syncStatus = 'synced';
      employee.biometricData.lastXO5Sync = new Date();
      employee.biometricData.syncError = null;
      await employee.save();
      
      return res.status(200).json({
        success: true,
        message: 'Registration successful! Your biometric has been enrolled.',
        deviceSyncStatus: 'synced',
        data: {
          employee: {
            id: employee._id,
            employeeId: employee.employeeId,
            staffId: employee.staffId,
            firstName: employee.firstName,
            lastName: employee.lastName,
            deviceSyncStatus: 'synced'
          }
        }
      });
      
    } else {
      console.warn('⚠️ Device sync failed (retry):', javaResponse.data.msg);
      syncResult.error = 'SYNC_FAILED';
      syncResult.message = javaResponse.data.msg || 'Device sync failed';
      
      employee.deviceSyncStatus = 'failed';
      employee.biometricData.syncStatus = 'failed';
      employee.biometricData.syncError = syncResult.message;
      await employee.save();
      
      return res.status(500).json({
        success: false,
        error: 'SYNC_FAILED',
        message: syncResult.message
      });
    }
    
  } catch (syncError) {
    console.error('❌ Device sync error (retry):', syncError.message);
    
    employee.deviceSyncStatus = 'failed';
    employee.biometricData.syncStatus = 'failed';
    employee.biometricData.syncError = syncError.message;
    await employee.save();
    
    return res.status(500).json({
      success: false,
      error: 'SYNC_ERROR',
      message: syncError.message
    });
  }
}

module.exports = router;
