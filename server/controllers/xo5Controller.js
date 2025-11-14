const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Facility = require('../models/Facility');
const Shift = require('../models/Shift');
const LeaveRequest = require('../models/LeaveRequest');
const moment = require('moment-timezone');
const { attendanceLogger } = require('../utils/logger');

// Track processed records to avoid duplicates
const processedRecords = new Set();

// Function to determine if a record represents a VERIFIED/SUCCESSFUL check-in/out event
function isValidXO5Record(data) {
  // Skip if no data
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // Must have essential fields
  if (!data.recordId || !data.deviceKey || !data.recordTimeStr) {
    return false;
  }
  
  // Skip if we've already processed this exact record
  const recordKey = `${data.deviceKey}-${data.recordId}-${data.recordTime}`;
  if (processedRecords.has(recordKey)) {
    return false;
  }
  
  // STRICT FILTERING: Only successful access by registered users
  const isSuccessfulAccess = data.resultFlag === '1'; // Must be SUCCESS (not failed)
  const isRegisteredUser = data.personType === '1'; // Must be REGISTERED user (not stranger)
  const hasPersonIdentified = data.personSn && data.personSn !== ''; // Must have person serial number
  const hasValidVerification = data.faceFlag === '1' || data.fingerFlag === '1' || data.cardFlag === '1'; // Must have valid verification method
  const isValidDirection = data.direction === '1' || data.direction === '4'; // Only check-in (1) or check-out (4)
  
  // ALL conditions must be met for a valid verified check-in/out
  if (isSuccessfulAccess && isRegisteredUser && hasValidVerification && isValidDirection) {
    // Add to processed set
    processedRecords.add(recordKey);
    
    // Clean up old records (keep only last 1000)
    if (processedRecords.size > 1000) {
      const oldKeys = Array.from(processedRecords).slice(0, 100);
      oldKeys.forEach(key => processedRecords.delete(key));
    }
    
    return true;
  }
  
  return false;
}

// Function to decode XO5 record for better understanding
function decodeXO5Record(data) {
  const decoded = {
    ...data,
    decoded: {
      accessResult: data.resultFlag === '1' ? 'SUCCESS' : 
                   data.resultFlag === '2' ? 'FAILED' : 
                   'UNKNOWN',
      personType: data.personType === '1' ? 'REGISTERED' : 
                 data.personType === '2' ? 'STRANGER' : 
                 'UNKNOWN',
      direction: data.direction === '1' ? 'CHECK-IN' : 
                data.direction === '4' ? 'CHECK-OUT' : 
                `UNKNOWN(${data.direction})`,
      verificationMethod: [],
      timestamp: new Date(parseInt(data.recordTime)).toISOString()
    }
  };
  
  // Determine verification method
  if (data.faceFlag === '1') decoded.decoded.verificationMethod.push('face');
  if (data.fingerFlag === '1') decoded.decoded.verificationMethod.push('fingerprint');
  if (data.cardFlag === '1') decoded.decoded.verificationMethod.push('card');
  if (data.pwdFlag === '1') decoded.decoded.verificationMethod.push('manual');
  
  return decoded;
}

// @desc    Handle XO5 device record data
// @route   POST /api/xo5/record
// @access  Public (device webhook)
exports.handleXO5Record = async (req, res) => {
  try {
    const deviceId = req.ip || req.connection.remoteAddress || 'unknown';
    const recordData = req.body || req.query || {};
    
    // Only log incoming records for debugging when needed (commented out to reduce noise)
    // attendanceLogger.info(`📥 XO5 Record received from ${deviceId}`, { recordData });
    
    // Validate XO5 record with strict filtering
    if (!isValidXO5Record(recordData)) {
      const skipReason = [];
      if (!recordData?.recordId) skipReason.push('No recordId');
      if (recordData?.resultFlag !== '1') skipReason.push(`Failed access (${recordData?.resultFlag})`);
      if (recordData?.personType !== '1') skipReason.push(`Not registered user (${recordData?.personType})`);
      if (!recordData?.personSn) skipReason.push('No person ID');
      if (recordData?.direction !== '1' && recordData?.direction !== '4') skipReason.push(`Invalid direction (${recordData?.direction})`);
      
      // Only log skipped records for debugging (commented out to reduce console noise)
      // attendanceLogger.info(`⏭️ XO5 Record skipped: ${skipReason.join(', ')}`, {
      //   recordId: recordData?.recordId,
      //   resultFlag: recordData?.resultFlag,
      //   personType: recordData?.personType,
      //   direction: recordData?.direction
      // });
      
      return res.json({ 
        status: 'received', 
        message: 'Data received but filtered (strict mode)',
        reason: skipReason.join(', '),
        deviceId: deviceId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Decode the record
    const decodedRecord = decodeXO5Record(recordData);
    
    // ✅ ONLY LOG VALID PROCESSED RECORDS
    attendanceLogger.info(`✅ Valid XO5 record processed`, {
      recordId: decodedRecord.recordId,
      personId: decodedRecord.personSn,
      direction: decodedRecord.decoded.direction,
      verificationMethod: decodedRecord.decoded.verificationMethod,
      timestamp: decodedRecord.decoded.timestamp
    });
    
    // Process the attendance record
    const result = await processXO5Attendance(decodedRecord, deviceId);
    
    if (result.success) {
      res.json({
        status: 'success',
        message: 'Attendance record processed successfully',
        attendanceId: result.attendanceId,
        deviceId: deviceId,
        personId: decodedRecord.personSn,
        recordId: decodedRecord.recordId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: result.message,
        deviceId: deviceId,
        personId: decodedRecord.personSn,
        recordId: decodedRecord.recordId,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    attendanceLogger.error(`❌ Error processing XO5 record: ${error.message}`, { error: error.stack });
    
    res.status(500).json({
      success: false,
      error: 'Failed to process XO5 record',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Process XO5 attendance data and create/update attendance records
async function processXO5Attendance(xo5Record, deviceId) {
  try {
    // Find employee by their unique person ID (stored in biometricData.xo5PersonSn)
    const employee = await Employee.findOne({ 
      'biometricData.xo5PersonSn': xo5Record.personSn 
    }).populate('facility').populate('shift');
    
    if (!employee) {
      // Only log when we have a new employee ID we haven't seen before
      attendanceLogger.warn(`⚠️ Employee not found for person ID: ${xo5Record.personSn}`);
      return {
        success: false,
        message: `Employee not found for person ID: ${xo5Record.personSn}`
      };
    }
    
    if (!employee.shift) {
      attendanceLogger.warn(`⚠️ No shift assigned to employee: ${employee.firstName} ${employee.lastName}`);
      return {
        success: false,
        message: `No shift assigned to employee: ${employee.firstName} ${employee.lastName}`
      };
    }
    
    // Parse the attendance time
    const attendanceTime = new Date(parseInt(xo5Record.recordTime));
    const attendanceDate = moment(attendanceTime).startOf('day').toDate();
    
    // Determine if this is check-in or check-out
    const isCheckIn = xo5Record.direction === '1';
    const isCheckOut = xo5Record.direction === '4';
    const attendanceType = isCheckIn ? 'check-in' : 'check-out';
    
    // Check if this specific attendance event already exists to avoid duplicates
    // Use multiple criteria to ensure we catch duplicates properly
    const existingAttendance = await Attendance.findOne({
      $or: [
        // Check by record ID (most specific)
        {
          employee: employee._id,
          date: attendanceDate,
          type: attendanceType,
          'xo5Data.recordId': xo5Record.recordId
        },
        // Check by employee + date + type + similar timestamp (within 5 minutes)
        {
          employee: employee._id,
          date: attendanceDate,
          type: attendanceType,
          timestamp: {
            $gte: new Date(attendanceTime.getTime() - 5 * 60 * 1000), // 5 minutes before
            $lte: new Date(attendanceTime.getTime() + 5 * 60 * 1000)  // 5 minutes after
          }
        }
      ]
    });
    
    if (existingAttendance) {
      attendanceLogger.info(`⏭️ Duplicate XO5 record skipped: ${attendanceType} for ${employee.firstName} ${employee.lastName} (Record ID: ${xo5Record.recordId})`);
      return {
        success: true,
        attendanceId: existingAttendance._id,
        message: `${attendanceType} already recorded`
      };
    }
    
    // Create new attendance record for this specific event
    const [startHour, startMinute] = employee.shift.startTime.split(':');
    const [endHour, endMinute] = employee.shift.endTime.split(':');
    
    const scheduledCheckIn = moment(attendanceDate)
      .hour(parseInt(startHour))
      .minute(parseInt(startMinute))
      .second(0)
      .toDate();
      
    const scheduledCheckOut = moment(attendanceDate)
      .hour(parseInt(endHour))
      .minute(parseInt(endMinute))
      .second(0)
      .toDate();
    
    const attendance = new Attendance({
      employee: employee._id,
      employeeId: employee.employeeId, // Required field
      facility: employee.facility._id,
      date: attendanceDate,
      type: attendanceType, // Required field
      timestamp: attendanceTime, // Required field
      shift: employee.shift._id,
      scheduledCheckIn: scheduledCheckIn, // Required field
      scheduledCheckOut: scheduledCheckOut, // Required field
      status: 'present',
      source: 'XO5_DEVICE',
      deviceIP: xo5Record.deviceKey,
      verified: true,
      xo5Data: {
        recordId: xo5Record.recordId,
        deviceKey: xo5Record.deviceKey,
        verifyStyle: xo5Record.verifyStyle,
        temperature: xo5Record.temperature,
        openDoorFlag: xo5Record.openDoorFlag,
        verificationMethod: xo5Record.decoded.verificationMethod,
        rawData: xo5Record
      }
    });
    
    // Add specific details based on check-in or check-out
    if (isCheckIn) {
      // Calculate scheduled time for late arrival check
      const [startHour, startMinute] = employee.shift.startTime.split(':');
      const scheduledCheckIn = moment(attendanceDate)
        .hour(parseInt(startHour))
        .minute(parseInt(startMinute))
        .second(0);
        
      const actualCheckIn = moment(attendanceTime);
      const graceMinutes = employee.shift.graceTime?.checkIn || 15;
      
      if (actualCheckIn.isAfter(scheduledCheckIn.clone().add(graceMinutes, 'minutes'))) {
        const lateMinutes = actualCheckIn.diff(scheduledCheckIn, 'minutes');
        
        // Check if employee has a valid excuse for late arrival
        const excuse = await LeaveRequest.hasValidExcuse(employee.employeeId, attendanceDate, 'late-arrival');
        
        if (excuse) {
          attendance.status = 'excused';
          attendance.lateArrival = 0; // Excused, so no late marking
          attendance.excuseReason = excuse.reason;
          attendance.excuseType = excuse.type;
          attendance.isExcused = true;
          
          console.log(`✅ Late arrival excused: ${employee.firstName} ${employee.lastName} - ${excuse.type}: ${excuse.reason}`);
          attendanceLogger.info(`Excused late arrival for ${employee.firstName} ${employee.lastName}: ${excuse.reason}`);
        } else {
          attendance.lateArrival = lateMinutes;
          attendance.status = 'late';
          
          console.log(`⏰ Late arrival: ${employee.firstName} ${employee.lastName} - ${attendance.lateArrival} minutes late`);
        }
      }
      
      attendanceLogger.info(`✅ Check-in: ${employee.firstName} ${employee.lastName} at ${moment(attendanceTime).format('HH:mm:ss')}`);
    } 
    else if (isCheckOut) {
      // For check-out, we could calculate work duration if we find the corresponding check-in
      const todayCheckIn = await Attendance.findOne({
        employee: employee._id,
        date: attendanceDate,
        type: 'check-in'
      }).sort({ timestamp: -1 }); // Get the latest check-in for today
      
      if (todayCheckIn) {
        const workMinutes = moment(attendanceTime).diff(moment(todayCheckIn.timestamp), 'minutes');
        attendance.workDuration = Math.max(0, workMinutes);
        
        // Calculate overtime/undertime
        const expectedMinutes = employee.shift.workingHours * 60;
        if (workMinutes > expectedMinutes + 30) { // 30 min grace for overtime
          attendance.overtimeMinutes = workMinutes - expectedMinutes;
        } else if (workMinutes < expectedMinutes - 30) { // 30 min grace for undertime
          attendance.undertimeMinutes = expectedMinutes - workMinutes;
        }
      }
      
      attendanceLogger.info(`✅ Check-out: ${employee.firstName} ${employee.lastName} at ${moment(attendanceTime).format('HH:mm:ss')}${attendance.workDuration ? ` (${(attendance.workDuration/60).toFixed(1)}h worked)` : ''}`);
    }
    
    // Save the attendance record with error handling for duplicates
    try {
      await attendance.save();
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error - record already exists
        attendanceLogger.info(`⏭️ Duplicate record detected during save: ${attendanceType} for ${employee.firstName} ${employee.lastName}`);
        
        // Find the existing record and return it
        const existingRecord = await Attendance.findOne({
          employee: employee._id,
          date: attendanceDate,
          type: attendanceType
        });
        
        return {
          success: true,
          attendanceId: existingRecord._id,
          message: `${attendanceType} already recorded`
        };
      } else {
        // Re-throw other errors
        throw error;
      }
    }
    
    return {
      success: true,
      attendanceId: attendance._id,
      message: `${attendanceType} recorded successfully`
    };
    
  } catch (error) {
    attendanceLogger.error(`❌ Error processing XO5 attendance: ${error.message}`, { error: error.stack });
    return {
      success: false,
      message: `Error processing attendance: ${error.message}`
    };
  }
}