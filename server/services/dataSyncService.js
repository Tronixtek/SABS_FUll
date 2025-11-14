const cron = require('node-cron');
const axios = require('axios');
const Facility = require('../models/Facility');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Shift = require('../models/Shift');
const moment = require('moment-timezone');
const { syncLogger, userSyncLogger, attendanceLogger } = require('../utils/logger');
const emailService = require('./emailService');

class DataSyncService {
  constructor() {
    this.syncInterval = process.env.SYNC_INTERVAL || 5;
    this.isRunning = false;
  }

  // Helper method to detect offline ngrok endpoints
  isOfflineEndpoint(url) {
    if (!url || typeof url !== 'string') return true;
    
    // Check for ngrok URLs that are likely to be offline
    const ngrokPattern = /https?:\/\/[a-f0-9]+\.ngrok-free\.app/i;
    const isNgrokUrl = ngrokPattern.test(url);
    
    // Also check for other common placeholder/test URLs
    const testUrls = [
      'test-device.com',
      'facility1-server.com',
      'facility2-server.com',
      'localhost',
      '127.0.0.1'
    ];
    
    const isTestUrl = testUrls.some(testUrl => url.includes(testUrl));
    
    return isNgrokUrl || isTestUrl;
  }

  startSync() {
    syncLogger.info(`🔄 Starting data sync service (Every ${this.syncInterval} minutes)`);

    const cronExpression = `*/${this.syncInterval} * * * *`;
    cron.schedule(cronExpression, async () => {
      if (!this.isRunning) await this.syncAllFacilities();
    });

    setTimeout(() => {
      this.syncAllFacilities();
    }, 30000);
  }

  async syncAllFacilities() {
    this.isRunning = true;
    syncLogger.info(`📊 Starting facility sync at ${new Date().toISOString()}`);

    try {
      const facilities = await Facility.find({
        status: 'active',
        'configuration.autoSync': true,
      });

      const syncPromises = facilities.map((facility) =>
        this.syncFacility(facility).catch((err) => {
          syncLogger.error(`❌ Error syncing facility ${facility.name}: ${err.message}`);
          return null;
        })
      );

      const results = await Promise.allSettled(syncPromises);
      const successCount = results.filter((r) => r.status === 'fulfilled' && r.value).length;
      const failCount = results.filter((r) => r.status === 'rejected' || !r.value).length;

      syncLogger.info(`✅ Sync completed: ${successCount} succeeded, ${failCount} failed`);
    } catch (error) {
      syncLogger.error('❌ Fatal error in syncAllFacilities', { error: error.message });
    } finally {
      this.isRunning = false;
    }
  }

  async syncFacility(facility) {
    try {
      // Skip facilities with offline ngrok URLs or invalid endpoints
      if (this.isOfflineEndpoint(facility.deviceApiUrl)) {
        syncLogger.info(`⏭️ Skipping ${facility.name}: Offline ngrok endpoint detected`);
        await facility.updateSyncStatus('skipped', 'Offline ngrok endpoint - sync disabled to reduce noise');
        return true; // Return success to avoid error count
      }

      syncLogger.info(`\n🔄 ===== FACILITY SYNC STARTED =====`);
      syncLogger.info(`📍 Facility: ${facility.name}`);
      syncLogger.info(`🕐 Time: ${moment().format('YYYY-MM-DD HH:mm:ss')}`);

      await facility.updateSyncStatus('in-progress');

      const headers = {};
      if (facility.deviceApiKey) headers['Authorization'] = `Bearer ${facility.deviceApiKey}`;

      // STEP 1: SYNC USERS (NON-BLOCKING)
      if (facility.configuration?.userApiUrl) {
        if (this.isOfflineEndpoint(facility.configuration.userApiUrl)) {
          syncLogger.info(`⏭️ Step 1: Skipping user sync (offline endpoint detected)`);
        } else {
          syncLogger.info(`👥 Step 1: Syncing users first...`);
          try {
            await this.syncDeviceUsers(facility, headers);
          } catch (userSyncError) {
            syncLogger.warn(`⚠️ User sync failed, but continuing with attendance sync`);
            syncLogger.warn(`   Error: ${userSyncError.message}`);
            syncLogger.warn(`   Attendance sync will continue but may skip records for unknown employees`);
          }
        }
      } else {
        syncLogger.info(`ℹ️ Step 1: Skipping user sync (no userApiUrl configured)`);
      }

      // STEP 2: FETCH ATTENDANCE
      syncLogger.info(`📊 Step 2: Fetching attendance data...`);

      const requestBody = {
        from: facility.deviceInfo?.lastSyncTime || moment().subtract(24, 'hours').toISOString(),
        to: moment().toISOString(),
      };

      const response = await axios.post(facility.deviceApiUrl, requestBody, {
        headers: { ...headers, 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      syncLogger.info(`📥 Received response from ${facility.name}`);
      syncLogger.info(`   Status: ${response.status}`);
      syncLogger.info(`   Response preview: ${JSON.stringify(response.data, null, 2).substring(0, 500)}`);

      // ✅ Handle device response
      let attendanceRecords = [];
      if (Array.isArray(response.data?.device_response?.info?.SearchInfo)) {
        attendanceRecords = response.data.device_response.info.SearchInfo;
        syncLogger.info(`   Format: device_response.info.SearchInfo[]`);
        
        // ✅ AUTO-CAPTURE DEVICE ID if not already saved
        const deviceInfo = response.data.device_response.info;
        if (deviceInfo?.DeviceID) {
          const deviceId = String(deviceInfo.DeviceID);
          if (!facility.deviceInfo.deviceId || facility.deviceInfo.deviceId !== deviceId) {
            facility.deviceInfo.deviceId = deviceId;
            syncLogger.info(`   📱 Auto-captured Device ID: ${deviceId}`);
            
            if (facility.isModified('deviceInfo')) {
              await facility.save();
              syncLogger.info(`   💾 Updated facility device information`);
            }
          }
        }
      } else {
        syncLogger.error(`❌ Invalid attendance response format`);
        throw new Error('Invalid attendance format');
      }

      syncLogger.info(`📊 Found ${attendanceRecords.length} attendance records`);
      if (!attendanceRecords.length) {
        await facility.updateSyncStatus('success');
        return true;
      }

      let processed = 0;
      for (const record of attendanceRecords) {
        const result = await this.processAttendanceRecord(record, facility);
        if (result) processed++;
      }

      await facility.updateSyncStatus('success');
      syncLogger.info(`✅ Facility ${facility.name}: Processed ${processed} records`);
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      syncLogger.error(`❌ Sync failed for ${facility.name}: ${errorMessage}`);
      await facility.updateSyncStatus('failed', errorMessage);
      throw error;
    }
  }

  async syncDeviceUsers(facility, headers) {
    try {
      const userApiUrl = facility.configuration.userApiUrl;
      if (!userApiUrl) {
        userSyncLogger.info(`ℹ️ No userApiUrl configured for ${facility.name}`);
        return;
      }

      userSyncLogger.info(`\n👥 ===== USER SYNC STARTED =====`);
      userSyncLogger.info(`📥 Fetching from: ${userApiUrl}`);

      const response = await axios.post(userApiUrl, {}, {
        headers: { ...headers, 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      userSyncLogger.info(`📥 Response status: ${response.status}`);
      userSyncLogger.info(`📜 Full response data: ${JSON.stringify(response.data, null, 2)}`);

      // Check if response has the expected structure
      if (!response.data) {
        userSyncLogger.error(`❌ No response data received`);
        return;
      }

      if (!response.data.device_response) {
        userSyncLogger.error(`❌ Missing device_response in response`);
        userSyncLogger.error(`   Available keys: ${Object.keys(response.data).join(', ')}`);
        return;
      }

      if (!response.data.device_response.info) {
        userSyncLogger.error(`❌ Missing device_response.info in response`);
        userSyncLogger.error(`   Available keys: ${Object.keys(response.data.device_response).join(', ')}`);
        return;
      }

      // ✅ FIX: Handle both SearchInfo and List formats
      let users = [];
      const info = response.data.device_response.info;
      
      if (info.SearchInfo && Array.isArray(info.SearchInfo)) {
        // Format: device_response.info.SearchInfo[] (attendance records format)
        users = info.SearchInfo;
        userSyncLogger.info(`✅ Format detected: device_response.info.SearchInfo[]`);
      } else if (info.List && Array.isArray(info.List)) {
        // Format: device_response.info.List[] (user list format)
        users = info.List;
        userSyncLogger.info(`✅ Format detected: device_response.info.List[]`);
      } else {
        userSyncLogger.error(`❌ No user list found in response`);
        userSyncLogger.error(`   Available keys: ${Object.keys(info).join(', ')}`);
        return;
      }
      userSyncLogger.info(`📋 Found ${users.length} users from device`);

      // ✅ AUTO-CAPTURE DEVICE ID AND MODEL
      const deviceInfo = response.data.device_response.info;
      if (deviceInfo?.DeviceID) {
        const deviceId = String(deviceInfo.DeviceID);
        if (!facility.deviceInfo.deviceId || facility.deviceInfo.deviceId !== deviceId) {
          facility.deviceInfo.deviceId = deviceId;
          userSyncLogger.info(`📱 Auto-captured Device ID: ${deviceId}`);
        }
      }
      
      // Save device model if available
      if (deviceInfo?.DeviceModel && !facility.deviceInfo.deviceModel) {
        facility.deviceInfo.deviceModel = deviceInfo.DeviceModel;
        userSyncLogger.info(`📱 Auto-captured Device Model: ${deviceInfo.DeviceModel}`);
      }
      
      // Save facility if device info was updated
      if (facility.isModified('deviceInfo')) {
        await facility.save();
        userSyncLogger.info(`💾 Updated facility device information`);
      }

      if (users.length === 0) {
        userSyncLogger.info(`ℹ️ No users to process`);
        return;
      }

      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        userSyncLogger.info(`\n� Processing user ${i + 1}/${users.length}:`);
        userSyncLogger.info(`   Raw data: ${JSON.stringify(user, null, 2)}`);

        const name = user.Name || user.name || 'Unknown';
        // Support both personUUID (new) and IdCard (legacy)
        const personUUID = user.personUUID || user.PersonUUID || user.IdCard || null;
        const idCard = user.IdCard ? String(user.IdCard) : undefined;
        const rfid = user.RFIDCard && user.RFIDCard !== '0' ? String(user.RFIDCard) : null;
        const regPicinfo = user.RegPicinfo || null;

        userSyncLogger.info(`   Extracted: Name="${name}", personUUID="${personUUID}", IdCard="${idCard}", RFID="${rfid}"`);

        if (!personUUID && !idCard && !rfid) {
          userSyncLogger.warn(`   ⚠️ Skipping - no valid ID found`);
          skippedCount++;
          continue;
        }

        const searchConditions = [];
        // Search by personUUID (primary), IdCard, or RFID
        if (personUUID) searchConditions.push({ deviceId: personUUID });
        if (idCard) searchConditions.push({ deviceId: idCard });
        if (rfid) searchConditions.push({ 'biometricData.cardId': rfid });

        userSyncLogger.info(`   Searching for employee with: ${JSON.stringify(searchConditions)}`);

        let employee = await Employee.findOne({
          facility: facility._id,
          $or: searchConditions,
        });

        if (!employee) {
          userSyncLogger.info(`   ➕ Employee not found, creating new...`);
          
          const defaultShift = await Shift.findOne({ facility: facility._id, isDefault: true });
          
          employee = new Employee({
            firstName: name.split(' ')[0] || 'Unknown',
            lastName: name.split(' ').slice(1).join(' ') || '',
            facility: facility._id,
            status: 'active',
            deviceId: personUUID || idCard, // Prefer personUUID
            biometricData: { cardId: rfid },
            profileImage: regPicinfo,
            shift: defaultShift ? defaultShift._id : undefined,
          });
          
          const savedEmployee = await employee.save();
          createdCount++;
          userSyncLogger.info(`   ✅ Created employee: ${savedEmployee.firstName} ${savedEmployee.lastName}`);
          userSyncLogger.info(`      ID: ${savedEmployee._id}`);
          userSyncLogger.info(`      Device ID (personUUID): ${savedEmployee.deviceId}`);
          userSyncLogger.info(`      RFID: ${savedEmployee.biometricData?.cardId || 'N/A'}`);
        } else {
          userSyncLogger.info(`   ℹ️ Employee exists: ${employee.firstName} ${employee.lastName}`);
          userSyncLogger.info(`      ID: ${employee._id}`);
          userSyncLogger.info(`      Current Device ID: ${employee.deviceId}`);
          userSyncLogger.info(`      Current RFID: ${employee.biometricData?.cardId || 'N/A'}`);
          
          // Update if needed
          let updated = false;
          const bestDeviceId = personUUID || idCard;
          
          if (bestDeviceId && employee.deviceId !== bestDeviceId) {
            employee.deviceId = bestDeviceId;
            updated = true;
            userSyncLogger.info(`      📝 Updating Device ID to: ${bestDeviceId}`);
          }
          if (rfid && employee.biometricData?.cardId !== rfid) {
            if (!employee.biometricData) employee.biometricData = {};
            employee.biometricData.cardId = rfid;
            updated = true;
            userSyncLogger.info(`      📝 Updating RFID to: ${rfid}`);
          }
          if (regPicinfo && employee.profileImage !== regPicinfo) {
            employee.profileImage = regPicinfo;
            updated = true;
            userSyncLogger.info(`      📝 Updating profile image`);
          }
          
          if (updated) {
            await employee.save();
            updatedCount++;
            userSyncLogger.info(`      ✅ Employee updated`);
          } else {
            userSyncLogger.info(`      ℹ️ No changes needed`);
          }
        }
      }

      userSyncLogger.info(`\n✅ ===== USER SYNC COMPLETED =====`);
      userSyncLogger.info(`   Facility: ${facility.name}`);
      userSyncLogger.info(`   Total users from device: ${users.length}`);
      userSyncLogger.info(`   ✅ Created: ${createdCount}`);
      userSyncLogger.info(`   📝 Updated: ${updatedCount}`);
      userSyncLogger.info(`   ⏭️  Skipped: ${skippedCount}`);
      
    } catch (error) {
      userSyncLogger.error(`❌ User sync failed: ${error.message}`);
      userSyncLogger.error(`   Stack: ${error.stack}`);
      if (error.response) {
        userSyncLogger.error(`   Response status: ${error.response.status}`);
        userSyncLogger.error(`   Response data: ${JSON.stringify(error.response.data)}`);
      }
    }
  }

  normalizeRecord(record) {
    try {
      attendanceLogger.info('📥 Raw attendance record:', JSON.stringify(record, null, 2));

      // ✅ Handle multiple possible field name variations
      const normalized = {
        deviceId: record.personUUID || 
                  record.PersonUUID || 
                  record.personId || 
                  record.PersonId || 
                  record.deviceId ||
                  record.IdCard ||
                  record.id ||
                  null,
        
        cardId: record.RFIDCard || 
                record.rfidCard ||
                record.IdCard || 
                record.idCard ||
                record.cardId ||
                record.cardNumber ||
                null,
        
        name: record.Name || 
              record.name || 
              record.personName ||
              record.PersonName ||
              record.userName ||
              'Unknown',
        
        timestamp: record.Time || 
                   record.time || 
                   record.timestamp || 
                   record.checkTime ||
                   record.datetime ||
                   new Date().toISOString(),
        
        raw: record
      };

      attendanceLogger.info('✅ Normalized record:', {
        deviceId: normalized.deviceId,
        cardId: normalized.cardId,
        name: normalized.name,
        timestamp: normalized.timestamp
      });

      // Validate required fields
      if (!normalized.deviceId && !normalized.cardId) {
        attendanceLogger.error('❌ Missing required identification fields');
        attendanceLogger.error('   Available keys:', Object.keys(record).join(', '));
        throw new Error('Missing required identification fields (deviceId or cardId)');
      }

      if (!normalized.timestamp) {
        attendanceLogger.error('❌ Missing timestamp field');
        attendanceLogger.error('   Available keys:', Object.keys(record).join(', '));
        throw new Error('Missing required field: timestamp');
      }

      // Validate timestamp format
      try {
        const testDate = new Date(normalized.timestamp);
        if (isNaN(testDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (error) {
        attendanceLogger.error(`❌ Invalid timestamp format: ${normalized.timestamp}`);
        throw new Error(`Invalid timestamp format: ${normalized.timestamp}`);
      }

      return normalized;
      
    } catch (error) {
      attendanceLogger.error('❌ Error normalizing record:', error.message);
      attendanceLogger.error('   Raw record:', JSON.stringify(record, null, 2));
      throw error;
    }
  }

  // ========== BREAK PROCESSING METHOD ==========
  async processBreakRecord(rec, attendance, facility, timestamp) {
    try {
      attendanceLogger.info('\n☕ ===== PROCESSING BREAK RECORD =====');
      
      const shift = await Shift.findById(attendance.shift);
      
      // Check if break tracking is enabled for this shift
      if (!shift.breakTrackingEnabled) {
        attendanceLogger.info('ℹ️ Break tracking not enabled for this shift');
        return false;
      }

      if (!shift.breaks || shift.breaks.length === 0) {
        attendanceLogger.info('ℹ️ No breaks configured for this shift');
        return false;
      }

      // Determine break type based on time window
      const recordHour = timestamp.hours();
      const recordMinute = timestamp.minutes();
      const recordTimeInMinutes = recordHour * 60 + recordMinute;

      attendanceLogger.info(`   Record time: ${timestamp.format('HH:mm:ss')} (${recordTimeInMinutes} mins from midnight)`);

      let matchedBreak = null;
      for (const breakConfig of shift.breaks) {
        const [startHour, startMin] = breakConfig.startWindow.split(':').map(Number);
        const [endHour, endMin] = breakConfig.endWindow.split(':').map(Number);
        const startWindowMinutes = startHour * 60 + startMin;
        const endWindowMinutes = endHour * 60 + endMin;

        attendanceLogger.info(`   Checking ${breakConfig.name} (${breakConfig.type}): ${breakConfig.startWindow} - ${breakConfig.endWindow}`);

        if (recordTimeInMinutes >= startWindowMinutes && recordTimeInMinutes <= endWindowMinutes) {
          matchedBreak = breakConfig;
          attendanceLogger.info(`   ✅ Matched break: ${breakConfig.name}`);
          break;
        }
      }

      if (!matchedBreak) {
        attendanceLogger.warn('⚠️ Break time outside configured windows, using first break config');
        matchedBreak = shift.breaks[0];
      }

      attendanceLogger.info(`\n   Break Configuration:`);
      attendanceLogger.info(`   Name: ${matchedBreak.name}`);
      attendanceLogger.info(`   Type: ${matchedBreak.type}`);
      attendanceLogger.info(`   Expected duration: ${matchedBreak.duration} minutes`);
      attendanceLogger.info(`   Max duration: ${matchedBreak.maxDuration} minutes`);
      attendanceLogger.info(`   Is paid: ${matchedBreak.isPaid ? 'Yes' : 'No'}`);

      if (!attendance.breaks) {
        attendance.breaks = [];
      }

      // Find ongoing break of same type
      const ongoingBreak = attendance.breaks.find(
        b => b.type === matchedBreak.type && b.status === 'ongoing'
      );

      if (ongoingBreak) {
        // ========== BREAK END ==========
        attendanceLogger.info(`\n🏁 ===== ENDING BREAK =====`);
        
        ongoingBreak.endTime = timestamp.toDate();
        
        const startMoment = moment(ongoingBreak.startTime);
        const durationMinutes = timestamp.diff(startMoment, 'minutes');
        ongoingBreak.duration = durationMinutes;

        attendanceLogger.info(`   Break started: ${startMoment.format('HH:mm:ss')}`);
        attendanceLogger.info(`   Break ended: ${timestamp.format('HH:mm:ss')}`);
        attendanceLogger.info(`   Duration: ${durationMinutes} minutes`);

        // Check if break exceeded max duration
        if (durationMinutes > matchedBreak.maxDuration) {
          ongoingBreak.status = 'exceeded';
          const excessMinutes = durationMinutes - matchedBreak.maxDuration;
          attendanceLogger.warn(`\n⚠️ BREAK EXCEEDED!`);
          attendanceLogger.warn(`   Took: ${durationMinutes} minutes`);
          attendanceLogger.warn(`   Max allowed: ${matchedBreak.maxDuration} minutes`);
          attendanceLogger.warn(`   Excess: ${excessMinutes} minutes`);
        } else if (durationMinutes < matchedBreak.duration * 0.5) {
          ongoingBreak.status = 'completed';
          attendanceLogger.info(`\n✅ Break completed (shorter than expected)`);
          attendanceLogger.info(`   Expected: ${matchedBreak.duration} minutes`);
          attendanceLogger.info(`   Actual: ${durationMinutes} minutes`);
        } else {
          ongoingBreak.status = 'completed';
          attendanceLogger.info(`\n✅ Break completed normally`);
        }

      } else {
        // ========== BREAK START ==========
        attendanceLogger.info(`\n🚀 ===== STARTING BREAK =====`);
        
        const newBreak = {
          type: matchedBreak.type,
          name: matchedBreak.name,
          startTime: timestamp.toDate(),
          status: 'ongoing',
          recordedBy: 'device'
        };

        attendance.breaks.push(newBreak);
        attendanceLogger.info(`   Break type: ${matchedBreak.name} (${matchedBreak.type})`);
        attendanceLogger.info(`   Started at: ${timestamp.format('HH:mm:ss')}`);
        attendanceLogger.info(`   Expected duration: ${matchedBreak.duration} minutes`);
      }

      // Recalculate total break time (only completed/exceeded breaks)
      const completedBreaks = attendance.breaks.filter(
        b => b.status === 'completed' || b.status === 'exceeded'
      );
      
      attendance.totalBreakTime = completedBreaks.reduce((total, b) => total + b.duration, 0);

      attendanceLogger.info(`\n📊 ===== BREAK SUMMARY =====`);
      attendanceLogger.info(`   Total breaks taken: ${attendance.breaks.length}`);
      attendanceLogger.info(`   Completed breaks: ${completedBreaks.length}`);
      attendanceLogger.info(`   Total break time: ${attendance.totalBreakTime} minutes (${(attendance.totalBreakTime / 60).toFixed(2)} hours)`);

      // Recalculate net work hours if both check-in and check-out exist
      if (attendance.checkIn?.time && attendance.checkOut?.time) {
        const checkInMoment = moment(attendance.checkIn.time);
        const checkOutMoment = moment(attendance.checkOut.time);
        
        const grossMinutes = checkOutMoment.diff(checkInMoment, 'minutes');
        const grossHours = grossMinutes / 60;
        
        // Calculate net work hours (gross - breaks)
        const netMinutes = grossMinutes - attendance.totalBreakTime;
        const netHours = netMinutes / 60;
        
        attendance.workHours = Math.round(grossHours * 100) / 100; // Gross hours
        attendance.netWorkHours = Math.round(netHours * 100) / 100; // Net hours

        attendanceLogger.info(`\n⏱️ ===== WORK HOURS RECALCULATION =====`);
        attendanceLogger.info(`   Check-in: ${checkInMoment.format('HH:mm:ss')}`);
        attendanceLogger.info(`   Check-out: ${checkOutMoment.format('HH:mm:ss')}`);
        attendanceLogger.info(`   Gross hours: ${attendance.workHours} hours`);
        attendanceLogger.info(`   Break time: ${(attendance.totalBreakTime / 60).toFixed(2)} hours`);
        attendanceLogger.info(`   Net work hours: ${attendance.netWorkHours} hours`);

        // Check break compliance
        const totalScheduledBreak = shift.breaks.reduce((sum, b) => sum + b.duration, 0);
        
        if (attendance.totalBreakTime > totalScheduledBreak * 1.5) {
          attendance.breakCompliance = 'exceeded';
          attendanceLogger.warn(`   ⚠️ Break compliance: EXCEEDED (took ${Math.round((attendance.totalBreakTime / totalScheduledBreak - 1) * 100)}% more than scheduled)`);
        } else if (attendance.totalBreakTime < totalScheduledBreak * 0.5) {
          attendance.breakCompliance = 'insufficient';
          attendanceLogger.info(`   ℹ️ Break compliance: INSUFFICIENT (took less than expected)`);
        } else {
          attendance.breakCompliance = 'compliant';
          attendanceLogger.info(`   ✅ Break compliance: COMPLIANT`);
        }
      }

      await attendance.save();
      attendanceLogger.info(`\n✅ Break record saved successfully!`);
      
      return true;

    } catch (error) {
      attendanceLogger.error(`❌ Error processing break: ${error.message}`);
      attendanceLogger.error(error.stack);
      return false;
    }
  }

  async processAttendanceRecord(record, facility) {
    try {
      attendanceLogger.info('\n📋 ===== PROCESSING ATTENDANCE RECORD =====');
      
      const rec = this.normalizeRecord(record);
      attendanceLogger.info(`🔍 Processing: ${rec.name}`);
      attendanceLogger.info(`   Device ID: ${rec.deviceId}`);
      attendanceLogger.info(`   Card ID: ${rec.cardId}`);
      attendanceLogger.info(`   Timestamp: ${rec.timestamp}`);

      // Build search conditions
      const searchConditions = [];
      if (rec.deviceId) searchConditions.push({ deviceId: rec.deviceId });
      if (rec.cardId) searchConditions.push({ 'biometricData.cardId': rec.cardId });
      if (rec.name !== 'Unknown') {
        const firstName = rec.name.split(' ')[0];
        searchConditions.push({ firstName: new RegExp(`^${firstName}`, 'i') });
      }

      attendanceLogger.info(`   Searching with conditions: ${JSON.stringify(searchConditions)}`);

      const employee = await Employee.findOne({
        facility: facility._id,
        $or: searchConditions,
      }).populate('shift');

      if (!employee) {
        attendanceLogger.warn(`❌ Employee not found!`);
        attendanceLogger.warn(`   Facility: ${facility.name} (${facility._id})`);
        attendanceLogger.warn(`   Searched with:`);
        attendanceLogger.warn(`      Device ID: ${rec.deviceId}`);
        attendanceLogger.warn(`      Card ID: ${rec.cardId}`);
        attendanceLogger.warn(`      Name: ${rec.name}`);
        attendanceLogger.warn(`   ⚠️ This employee must be added to the system first!`);
        return false;
      }

      attendanceLogger.info(`✅ Employee found: ${employee.firstName} ${employee.lastName}`);
      attendanceLogger.info(`   Employee ID: ${employee._id}`);
      attendanceLogger.info(`   Device ID in DB: ${employee.deviceId}`);
      attendanceLogger.info(`   Card ID in DB: ${employee.biometricData?.cardId || 'N/A'}`);

      const shift = employee.shift;
      if (!shift) {
        attendanceLogger.warn(`⚠️ No shift assigned to ${employee.firstName} ${employee.lastName}`);
        attendanceLogger.warn(`   Please assign a shift to this employee in the system`);
        return false;
      }

      attendanceLogger.info(`✅ Shift found: ${shift.name}`);
      attendanceLogger.info(`   Working hours: ${shift.startTime} - ${shift.endTime}`);

      const timestamp = moment(rec.timestamp).tz(facility.timezone || 'Africa/Lagos');
      const dateOnly = timestamp.clone().startOf('day').toDate();

      attendanceLogger.info(`📅 Attendance date: ${dateOnly.toISOString()}`);
      attendanceLogger.info(`⏰ Check time: ${timestamp.format('YYYY-MM-DD HH:mm:ss')}`);

      let attendance = await Attendance.findOne({
        employee: employee._id,
        date: dateOnly,
      }).populate('shift');

      if (!attendance) {
        attendanceLogger.info('📝 Creating new attendance record...');
        
        attendance = new Attendance({
          employee: employee._id,
          facility: facility._id,
          date: dateOnly,
          shift: shift._id,
          scheduledCheckIn: this.calculateScheduledTime(dateOnly, shift.startTime, facility.timezone),
          scheduledCheckOut: this.calculateScheduledTime(dateOnly, shift.endTime, facility.timezone),
          status: 'absent', // Default status, will be updated when check-in/out is recorded
          deviceData: { raw: [], synced: true },
        });
      } else {
        attendanceLogger.info(`📝 Updating existing attendance record (ID: ${attendance._id})`);
      }

      // ✅ IMPROVED LOGIC: Smart check-in/check-out detection based on shift midpoint
      
      // Parse shift times
      const [startHour, startMin] = shift.startTime.split(':').map(Number);
      const [endHour, endMin] = shift.endTime.split(':').map(Number);
      
      // Calculate time in minutes from midnight
      const shiftStartMinutes = startHour * 60 + startMin;
      const shiftEndMinutes = endHour * 60 + endMin;
      const shiftMidpoint = (shiftStartMinutes + shiftEndMinutes) / 2;
      
      // Get record time in minutes from midnight
      const recordHour = timestamp.hours();
      const recordMinute = timestamp.minutes();
      const recordTimeInMinutes = recordHour * 60 + recordMinute;

      attendanceLogger.info(`\n⏰ ===== TIME ANALYSIS =====`);
      attendanceLogger.info(`   Shift start: ${shift.startTime} (${shiftStartMinutes} mins)`);
      attendanceLogger.info(`   Shift end: ${shift.endTime} (${shiftEndMinutes} mins)`);
      attendanceLogger.info(`   Shift midpoint: ${Math.floor(shiftMidpoint / 60)}:${String(Math.floor(shiftMidpoint % 60)).padStart(2, '0')} (${shiftMidpoint.toFixed(0)} mins)`);
      attendanceLogger.info(`   Record time: ${recordHour}:${String(recordMinute).padStart(2, '0')} (${recordTimeInMinutes} mins)`);

      // ✅ CHECK IF THIS IS A BREAK RECORD
      let isBreakRecord = false;
      
      if (shift.breakTrackingEnabled && shift.breaks && shift.breaks.length > 0) {
        attendanceLogger.info(`\n🔍 Checking if this is a break record...`);
        
        for (const breakConfig of shift.breaks) {
          const [bStartHour, bStartMin] = breakConfig.startWindow.split(':').map(Number);
          const [bEndHour, bEndMin] = breakConfig.endWindow.split(':').map(Number);
          const breakStartMinutes = bStartHour * 60 + bStartMin;
          const breakEndMinutes = bEndHour * 60 + bEndMin;

          attendanceLogger.info(`   Break window: ${breakConfig.name} (${breakConfig.startWindow} - ${breakConfig.endWindow})`);

          if (recordTimeInMinutes >= breakStartMinutes && recordTimeInMinutes <= breakEndMinutes) {
            // This record falls within a break window
            if (attendance.checkIn?.time && !attendance.checkOut?.time) {
              // Check-in already exists, no check-out yet - this is likely a break
              isBreakRecord = true;
              attendanceLogger.info(`   ✅ This is a BREAK record (${breakConfig.name})`);
              break;
            }
          }
        }
      }

      if (isBreakRecord) {
        attendanceLogger.info('\n☕ Processing as BREAK record');
        await this.processBreakRecord(rec, attendance, facility, timestamp);
        return true;
      }

      // ✅ DETERMINE: CHECK-IN or CHECK-OUT based on shift midpoint
      if (recordTimeInMinutes <= shiftMidpoint) {
        // ========== CHECK-IN LOGIC ==========
        if (!attendance.checkIn?.time) {
          attendanceLogger.info(`\n✅ ===== RECORDING CHECK-IN =====`);
          
          attendance.checkIn = {
            time: timestamp.toDate(),
            method: 'face',
            recordedBy: 'system',
          };

          // Calculate early/late arrival
          const gracePeriod = shift.gracePeriod?.checkIn || 15;
          const lateThreshold = shiftStartMinutes + gracePeriod;
          const earlyThreshold = shiftStartMinutes - 30; // 30 minutes early threshold
          
          attendanceLogger.info(`   Grace period: ${gracePeriod} minutes`);
          attendanceLogger.info(`   Early threshold: ${Math.floor(earlyThreshold / 60)}:${String(earlyThreshold % 60).padStart(2, '0')}`);
          attendanceLogger.info(`   On-time window: ${shift.startTime} to ${Math.floor(lateThreshold / 60)}:${String(lateThreshold % 60).padStart(2, '0')}`);

          // ✅ CHECK FOR EARLY ARRIVAL
          if (recordTimeInMinutes < earlyThreshold) {
            const minutesEarly = earlyThreshold - recordTimeInMinutes;
            attendance.earlyArrival = minutesEarly;
            attendance.status = 'present';
            attendanceLogger.info(`\n🌅 EARLY ARRIVAL DETECTED!`);
            attendanceLogger.info(`   Arrived: ${minutesEarly} minutes early`);
            attendanceLogger.info(`   Status: PRESENT (Early)`);
          }
          // ✅ CHECK FOR LATE ARRIVAL
          else if (recordTimeInMinutes > lateThreshold) {
            const minutesLate = recordTimeInMinutes - lateThreshold;
            attendance.lateArrival = minutesLate;
            attendance.status = 'late';
            attendanceLogger.info(`\n⚠️ LATE ARRIVAL DETECTED!`);
            attendanceLogger.info(`   Late by: ${minutesLate} minutes`);
            attendanceLogger.info(`   Status: LATE`);
          }
          // ✅ ON-TIME ARRIVAL
          else {
            attendance.status = 'present';
            const minutesDiff = recordTimeInMinutes - shiftStartMinutes;
            attendanceLogger.info(`\n✅ ON-TIME ARRIVAL!`);
            if (minutesDiff < 0) {
              attendanceLogger.info(`   Arrived: ${Math.abs(minutesDiff)} minutes before shift start`);
            } else if (minutesDiff === 0) {
              attendanceLogger.info(`   Arrived: Exactly on time!`);
            } else {
              attendanceLogger.info(`   Arrived: ${minutesDiff} minutes after shift start (within grace period)`);
            }
            attendanceLogger.info(`   Status: PRESENT`);
          }

          attendanceLogger.info(`   Check-in recorded: ${timestamp.format('HH:mm:ss')}`);

        } else {
          attendanceLogger.info(`\nℹ️ Check-in already exists: ${moment(attendance.checkIn.time).format('HH:mm:ss')}`);
          attendanceLogger.info(`   Ignoring duplicate check-in at: ${timestamp.format('HH:mm:ss')}`);
        }

      } else {
        // ========== CHECK-OUT LOGIC ==========
        if (!attendance.checkOut?.time) {
          attendanceLogger.info(`\n✅ ===== RECORDING CHECK-OUT =====`);
          
          attendance.checkOut = {
            time: timestamp.toDate(),
            method: 'face',
            recordedBy: 'system',
          };

          attendanceLogger.info(`   Check-out recorded: ${timestamp.format('HH:mm:ss')}`);

          // ✅ CALCULATE WORK HOURS (if check-in exists)
          if (attendance.checkIn?.time) {
            const checkInMoment = moment(attendance.checkIn.time);
            const checkOutMoment = timestamp;
            
            const grossMinutes = checkOutMoment.diff(checkInMoment, 'minutes');
            const grossHours = grossMinutes / 60;
            
            // Get total break time (from tracked breaks or default)
            let totalBreakMinutes = attendance.totalBreakTime || 0;
            
            // If breaks not tracked but shift has break time configured, use that
            if (totalBreakMinutes === 0 && shift.breakTime > 0 && !shift.breakTrackingEnabled) {
              totalBreakMinutes = shift.breakTime;
              attendanceLogger.info(`   Using default break time: ${totalBreakMinutes} minutes (break tracking not enabled)`);
            }
            
            // Calculate net work hours (gross - breaks)
            const netMinutes = grossMinutes - totalBreakMinutes;
            const netHours = netMinutes / 60;
            
            attendance.workHours = Math.round(grossHours * 100) / 100; // Gross hours
            attendance.netWorkHours = Math.round(netHours * 100) / 100; // Net hours

            attendanceLogger.info(`\n⏱️ ===== WORK HOURS CALCULATION =====`);
            attendanceLogger.info(`   Check-in: ${checkInMoment.format('HH:mm:ss')}`);
            attendanceLogger.info(`   Check-out: ${checkOutMoment.format('HH:mm:ss')}`);
            attendanceLogger.info(`   Gross time: ${grossMinutes} minutes (${attendance.workHours} hours)`);
            attendanceLogger.info(`   Break time: ${totalBreakMinutes} minutes (${(totalBreakMinutes / 60).toFixed(2)} hours)`);
            attendanceLogger.info(`   Net work hours: ${attendance.netWorkHours} hours`);

            // ✅ CHECK FOR EARLY DEPARTURE
            const gracePeriodCheckOut = shift.gracePeriod?.checkOut || 15;
            const earlyDepartureThreshold = shiftEndMinutes - gracePeriodCheckOut;
            
            if (recordTimeInMinutes < earlyDepartureThreshold) {
              const minutesEarly = earlyDepartureThreshold - recordTimeInMinutes;
              attendance.earlyDeparture = minutesEarly;
              attendanceLogger.info(`\n⚠️ EARLY DEPARTURE DETECTED!`);
              attendanceLogger.info(`   Left: ${minutesEarly} minutes early`);
            } else {
              attendanceLogger.info(`\n✅ ON-TIME OR LATE DEPARTURE`);
              const minutesAfterShiftEnd = recordTimeInMinutes - shiftEndMinutes;
              if (minutesAfterShiftEnd > 0) {
                attendanceLogger.info(`   Left: ${minutesAfterShiftEnd} minutes after shift end`);
              } else {
                attendanceLogger.info(`   Left: Within grace period`);
              }
            }

            // ✅ CHECK FOR HALF-DAY (use net work hours)
            const requiredHours = shift.workingHours || 8;
            const halfDayThreshold = requiredHours / 2;

            if (attendance.netWorkHours < halfDayThreshold && attendance.status !== 'late') {
              attendance.status = 'half-day';
              attendanceLogger.info(`\n⚠️ HALF-DAY DETECTED!`);
              attendanceLogger.info(`   Net worked: ${attendance.netWorkHours} hours`);
              attendanceLogger.info(`   Required: ${requiredHours} hours`);
              attendanceLogger.info(`   Half-day threshold: ${halfDayThreshold} hours`);
            } else if (attendance.status === 'present') {
              attendanceLogger.info(`\n✅ FULL DAY COMPLETED`);
              attendanceLogger.info(`   Net worked: ${attendance.netWorkHours} hours`);
              attendanceLogger.info(`   Required: ${requiredHours} hours`);
            }

            // ✅ CHECK FOR OVERTIME (use net work hours)
            if (attendance.netWorkHours > requiredHours) {
              const overtimeHours = attendance.netWorkHours - requiredHours;
              attendance.overtime = Math.round(overtimeHours * 100) / 100;
              attendanceLogger.info(`\n⏰ OVERTIME DETECTED!`);
              attendanceLogger.info(`   Net hours: ${attendance.netWorkHours}`);
              attendanceLogger.info(`   Required: ${requiredHours}`);
              attendanceLogger.info(`   Overtime: ${attendance.overtime} hours`);
            }

          } else {
            attendanceLogger.warn(`\n⚠️ WARNING: Check-out without check-in!`);
          }

        } else {
          attendanceLogger.info(`\nℹ️ Check-out already exists: ${moment(attendance.checkOut.time).format('HH:mm:ss')}`);
          attendanceLogger.info(`   Ignoring duplicate check-out at: ${timestamp.format('HH:mm:ss')}`);
        }
      }

      // Add raw record data
      if (!attendance.deviceData) attendance.deviceData = { raw: [], synced: true };
      attendance.deviceData.raw.push(rec.raw);
      
      await attendance.save();

      attendanceLogger.info(`\n✅ ===== ATTENDANCE SAVED SUCCESSFULLY =====`);
      attendanceLogger.info(`   Employee: ${employee.firstName} ${employee.lastName}`);
      attendanceLogger.info(`   Attendance ID: ${attendance._id}`);
      attendanceLogger.info(`   Date: ${moment(dateOnly).format('YYYY-MM-DD')}`);
      attendanceLogger.info(`   Status: ${attendance.status.toUpperCase()}`);
      attendanceLogger.info(`   Check-in: ${attendance.checkIn?.time ? moment(attendance.checkIn.time).format('HH:mm:ss') : 'Not recorded'}`);
      attendanceLogger.info(`   Check-out: ${attendance.checkOut?.time ? moment(attendance.checkOut.time).format('HH:mm:ss') : 'Not recorded'}`);
      if (attendance.earlyArrival) {
        attendanceLogger.info(`   🌅 Early Arrival: ${attendance.earlyArrival} minutes`);
      }
      if (attendance.lateArrival) {
        attendanceLogger.info(`   ⚠️ Late Arrival: ${attendance.lateArrival} minutes`);
      }
      if (attendance.earlyDeparture) {
        attendanceLogger.info(`   ⚠️ Early Departure: ${attendance.earlyDeparture} minutes`);
      }
      if (attendance.workHours) {
        attendanceLogger.info(`   ⏱️ Gross Hours: ${attendance.workHours} hours`);
      }
      if (attendance.totalBreakTime > 0) {
        attendanceLogger.info(`   ☕ Break Time: ${(attendance.totalBreakTime / 60).toFixed(2)} hours (${attendance.breaks.length} breaks)`);
        attendanceLogger.info(`   📊 Break Compliance: ${attendance.breakCompliance.toUpperCase()}`);
      }
      if (attendance.netWorkHours) {
        attendanceLogger.info(`   ✅ Net Work Hours: ${attendance.netWorkHours} hours`);
      }
      if (attendance.overtime) {
        attendanceLogger.info(`   ⏰ Overtime: ${attendance.overtime} hours`);
      }
      attendanceLogger.info(`===============================================\n`);

      // 📧 Send email notifications based on attendance status
      try {
        if (attendance.status === 'late' && attendance.lateArrival > 0) {
          await emailService.sendLateArrivalNotification(employee, attendance);
          attendanceLogger.info(`📧 Late arrival notification queued for ${employee.email}`);
        } else if (attendance.status === 'absent') {
          await emailService.sendAbsentNotification(employee, attendance.date);
          attendanceLogger.info(`📧 Absent notification queued for ${employee.email}`);
        }
      } catch (emailError) {
        attendanceLogger.warn(`⚠️ Email notification failed: ${emailError.message}`);
        // Don't fail the whole process if email fails
      }

      return true;
    } catch (error) {
      attendanceLogger.error(`❌ ===== ATTENDANCE PROCESSING FAILED =====`);
      attendanceLogger.error(`   Error: ${error.message}`);
      attendanceLogger.error(`   Stack: ${error.stack}`);
      return false;
    }
  }

  calculateScheduledTime(date, timeString, timezone) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return moment.tz(date, timezone)
      .hours(hours)
      .minutes(minutes)
      .seconds(0)
      .milliseconds(0)
      .toDate();
  }

  async manualSync(facilityId) {
    const facility = await Facility.findById(facilityId);
    if (!facility) throw new Error('Facility not found');
    return await this.syncFacility(facility);
  }
}

module.exports = DataSyncService;
