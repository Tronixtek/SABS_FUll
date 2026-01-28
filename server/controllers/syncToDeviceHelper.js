const axios = require('axios');

/**
 * HELPER FUNCTION: SYNC EMPLOYEE TO XO5 DEVICE
 * Database-First Architecture - This function is called AFTER employee is saved to database
 * Can be used during initial registration or retry operations
 * 
 * @param {Object} employee - Mongoose employee document
 * @param {String} faceImage - Base64 encoded face image
 * @param {Object} facilityDoc - Mongoose facility document
 * @returns {Object} Sync result object with status, message, etc.
 */
async function syncToDevice(employee, faceImage, facilityDoc) {
  console.log(`\n🔄 ===== SYNCING EMPLOYEE TO DEVICE =====`);
  console.log(`   Employee: ${employee.firstName} ${employee.lastName}`);
  console.log(`   Employee ID: ${employee.employeeId}`);
  console.log(`   DB ID: ${employee._id}`);
  
  try {
    // Update sync status to 'syncing'
    employee.deviceSyncStatus = 'syncing';
    employee.deviceSyncAttempts = (employee.deviceSyncAttempts || 0) + 1;
    employee.lastDeviceSyncAttempt = new Date();
    await employee.save();
    
    // Prepare device credentials
    const facilityDeviceId = (facilityDoc.deviceInfo?.deviceId || facilityDoc.code || facilityDoc._id).toLowerCase();
    const deviceKey = facilityDoc.configuration?.deviceKey?.toLowerCase() || facilityDeviceId;
    const deviceSecret = facilityDoc.configuration?.deviceSecret || '123456';
    
    // Generate or use existing person ID
    let personId = employee.biometricData?.xo5PersonSn;
    if (!personId) {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      personId = `${employee.employeeId}${randomSuffix}`;
      if (personId.length > 32) {
        personId = personId.substring(0, 32);
      }
    }
    
    // Optimize face image
    let optimizedFaceImage = faceImage;
    if (faceImage.includes('data:image')) {
      optimizedFaceImage = faceImage.split(',')[1];
    }
    optimizedFaceImage = optimizedFaceImage.replace(/\s+/g, '');
    
    const estimatedSizeKB = Math.round((optimizedFaceImage.length * 3/4) / 1024);
    console.log(`   Face image size: ${estimatedSizeKB}KB`);
    console.log(`   Device Key: ${deviceKey}`);
    console.log(`   Person ID: ${personId}`);
    
    // Prepare payload for Java service
    const javaServicePayload = {
      employeeId: personId,
      fullName: `${employee.firstName} ${employee.lastName}`,
      faceImage: optimizedFaceImage,
      deviceKey: deviceKey,
      secret: deviceSecret,
      verificationStyle: 0,
      forceUpdate: false // Don't force update by default
    };
    
    // Call Java device service (use upload-face endpoint for database-first)
    console.log(`   Calling Java service: ${process.env.JAVA_SERVICE_URL || 'http://localhost:8081'}/api/employee/upload-face`);
    
    const javaResponse = await axios.post(
      `${process.env.JAVA_SERVICE_URL || 'http://localhost:8081'}/api/employee/upload-face`,
      javaServicePayload,
      {
        timeout: 60000,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const isSuccess = javaResponse.data.code === "000" || javaResponse.data.success === true;
    
    if (isSuccess) {
      console.log(`✅ Device sync successful!`);
      
      // Update employee with success
      employee.deviceSyncStatus = 'synced';
      employee.deviceSynced = true;
      employee.deviceSyncError = null;
      employee.biometricData = employee.biometricData || {};
      employee.biometricData.xo5PersonSn = personId;
      employee.biometricData.xo5PersonName = `${employee.firstName} ${employee.lastName}`;
      employee.biometricData.xo5DeviceKey = deviceKey;
      employee.biometricData.lastXO5Sync = new Date();
      await employee.save();
      
      return {
        success: true,
        status: 'synced',
        message: 'Employee synced to device successfully',
        personId: personId
      };
      
    } else {
      const errorCode = javaResponse.data.code || 'UNKNOWN';
      const errorMsg = javaResponse.data.msg || javaResponse.data.message || 'Unknown device error';
      
      console.warn(`⚠️ Device sync failed: [${errorCode}] ${errorMsg}`);
      
      // Update employee with failure
      employee.deviceSyncStatus = 'failed';
      employee.deviceSynced = false;
      employee.deviceSyncError = `[${errorCode}] ${errorMsg}`;
      await employee.save();
      
      return {
        success: false,
        status: 'failed',
        message: errorMsg,
        errorCode: errorCode
      };
    }
    
  } catch (error) {
    console.error(`❌ Device sync error:`, error.message);
    
    // Update employee with error
    employee.deviceSyncStatus = 'failed';
    employee.deviceSynced = false;
    employee.deviceSyncError = error.code === 'ECONNREFUSED' 
      ? 'Device service unavailable' 
      : error.message;
    await employee.save();
    
    return {
      success: false,
      status: 'failed',
      message: employee.deviceSyncError,
      errorCode: error.code || 'ERROR'
    };
  }
}

module.exports = syncToDevice;
