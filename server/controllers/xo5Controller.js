const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Facility = require('../models/Facility');
const Shift = require('../models/Shift');
const MonthlyRoster = require('../models/MonthlyRoster');
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
  // Accept: 1=check-in, 2=break-out, 3=break-in, 4=check-out
  const isValidDirection = ['1', '2', '3', '4'].includes(data.direction);
  
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
                data.direction === '3' ? 'BREAK-IN (treated as CHECK-IN)' :
                data.direction === '2' ? 'BREAK-OUT (treated as CHECK-OUT)' :
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
    
    // Validate XO5 record with strict filtering
    if (!isValidXO5Record(recordData)) {
      const skipReason = [];
      if (!recordData?.recordId) skipReason.push('No recordId');
      if (recordData?.resultFlag !== '1') skipReason.push(`Failed access (${recordData?.resultFlag})`);
      if (recordData?.personType !== '1') skipReason.push(`Not registered user (${recordData?.personType})`);
      if (!recordData?.personSn) skipReason.push('No person ID');
      if (!['1', '2', '3', '4'].includes(recordData?.direction)) skipReason.push(`Invalid direction (${recordData?.direction})`);
      
      // Silently skip filtered records (no logging)
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
    
    // ✅ CLEAN, SIMPLE LOG - ONE LINE
    const timestamp = new Date(parseInt(decodedRecord.recordTime)).toLocaleTimeString('en-US', { hour12: false });
    console.log(`✅ ${timestamp} | ${decodedRecord.personSn || 'Unknown'} | ${decodedRecord.decoded.direction} | ${decodedRecord.decoded.verificationMethod.join(',')}`);
    
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
    
    // Parse the attendance time first to determine which shift to use
    const attendanceTime = new Date(parseInt(xo5Record.recordTime));
    const attendanceDate = moment(attendanceTime).startOf('day').toDate();
    
    // Get employee's shift for this specific date (uses roster if available)
    let employeeShift = await MonthlyRoster.getEmployeeShiftForDate(employee._id, attendanceDate);
    
    if (!employeeShift) {
      attendanceLogger.warn(`⚠️ No shift assigned to employee: ${employee.firstName} ${employee.lastName} for date: ${moment(attendanceDate).format('YYYY-MM-DD')}`);
      return {
        success: false,
        message: `No shift assigned to employee: ${employee.firstName} ${employee.lastName}`
      };
    }
    
    attendanceLogger.info(`✅ Using shift: ${employeeShift.name} for date: ${moment(attendanceDate).format('YYYY-MM-DD')}`);
    
    // Replace employee.shift references with employeeShift for this processing
    const shift = employeeShift;
    
    // Normalize direction: 1,3 = check-in | 2,4 = check-out
    // Direction codes: 1=check-in, 2=break-out, 3=break-in, 4=check-out
    let normalizedDirection;
    if (xo5Record.direction === '1' || xo5Record.direction === '3') {
      normalizedDirection = 'check-in'; // Check-in OR Break-in → both are check-in
    } else if (xo5Record.direction === '2' || xo5Record.direction === '4') {
      normalizedDirection = 'check-out'; // Break-out OR Check-out → both are check-out
    } else {
      normalizedDirection = 'unknown';
    }
    
    // SMART LOGIC: If trying to check-out but no check-in exists today, convert to check-in
    let attendanceType = normalizedDirection;
    if (normalizedDirection === 'check-out') {
      const todayCheckIn = await Attendance.findOne({
        employee: employee._id,
        date: attendanceDate,
        type: 'check-in'
      });
      
      if (!todayCheckIn) {
        console.log(`⚠️ No check-in found for ${employee.firstName} ${employee.lastName} today, converting check-out to check-in`);
        attendanceLogger.info(`Converting check-out to check-in for ${employee.employeeId} - no prior check-in found`);
        attendanceType = 'check-in'; // Force it to be check-in
      }
    }
    
    const isCheckIn = attendanceType === 'check-in';
    const isCheckOut = attendanceType === 'check-out';
    
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
    const [startHour, startMinute] = shift.startTime.split(':');
    const [endHour, endMinute] = shift.endTime.split(':');
    
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
    
    // Determine initial status based on check-in/check-out type
    let initialStatus = 'present';
    let lateArrivalMinutes = 0;
    let leaveRequestId = null;
    
    // For check-in, determine status BEFORE creating the record
    if (isCheckIn) {
      // Get the facility timezone (default to UTC if not set)
      const facilityTimezone = employee.facility?.timezone || 'UTC';
      
      // Calculate scheduled time for late arrival check IN THE FACILITY'S TIMEZONE
      const [startHour, startMinute] = shift.startTime.split(':');
      const scheduledCheckInTime = moment.tz(attendanceDate, facilityTimezone)
        .hour(parseInt(startHour))
        .minute(parseInt(startMinute))
        .second(0);
        
      const actualCheckIn = moment.tz(attendanceTime, facilityTimezone);
      const graceMinutes = shift.graceTime?.checkIn || 15;
      
      // DEBUG: Log all time calculations
      console.log('\n=== LATE DETECTION DEBUG ===');
      console.log('Facility Timezone:', facilityTimezone);
      console.log('Employee:', employee.firstName, employee.lastName);
      console.log('Shift Start Time:', shift.startTime);
      console.log('Scheduled Check-in:', scheduledCheckInTime.format('YYYY-MM-DD HH:mm:ss Z'));
      console.log('Actual Check-in:', actualCheckIn.format('YYYY-MM-DD HH:mm:ss Z'));
      console.log('Grace Minutes:', graceMinutes);
      console.log('Grace Period Ends:', scheduledCheckInTime.clone().add(graceMinutes, 'minutes').format('YYYY-MM-DD HH:mm:ss Z'));
      console.log('Is After Grace?:', actualCheckIn.isAfter(scheduledCheckInTime.clone().add(graceMinutes, 'minutes')));
      console.log('Minutes Difference:', actualCheckIn.diff(scheduledCheckInTime, 'minutes'));
      console.log('===========================\n');
      
      // Check if employee has approved leave for this date (check regardless of late/on-time)
      const leave = await LeaveRequest.hasApprovedLeave(employee._id, attendanceDate);
      
      if (leave) {
        // Employee has approved leave - mark as on-leave regardless of time
        initialStatus = 'on-leave';
        lateArrivalMinutes = 0;
        leaveRequestId = leave._id;
        
        console.log(`📅 Employee on approved leave: ${employee.firstName} ${employee.lastName} - ${leave.leaveType}`);
        attendanceLogger.info(`Employee on leave: ${employee.firstName} ${employee.lastName}: ${leave.leaveType}`);
      } else if (actualCheckIn.isAfter(scheduledCheckInTime.clone().add(graceMinutes, 'minutes'))) {
        // No leave - employee is late
        lateArrivalMinutes = actualCheckIn.diff(scheduledCheckInTime, 'minutes');
        initialStatus = 'late';
        
        console.log(`⏰ Late arrival: ${employee.firstName} ${employee.lastName} - ${lateArrivalMinutes} minutes late`);
      } else {
        // Employee is on time - this is the only time they get 'present' status
        initialStatus = 'present';
        console.log(`✅ On-time arrival: ${employee.firstName} ${employee.lastName}`);
      }
      
      attendanceLogger.info(`✅ Check-in: ${employee.firstName} ${employee.lastName} at ${moment(attendanceTime).format('HH:mm:ss')} - Status: ${initialStatus}`);
    }
    
    // Create attendance record with the correct status
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
      status: initialStatus, // Set correct status from the start
      lateArrival: lateArrivalMinutes,
      leaveRequest: leaveRequestId,
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
    
    // Add specific details for check-out
    if (isCheckOut) {
      // For check-out, we could calculate work duration if we find the corresponding check-in
      const todayCheckIn = await Attendance.findOne({
        employee: employee._id,
        date: attendanceDate,
        type: 'check-in'
      }).sort({ timestamp: -1 }); // Get the latest check-in for today
      
      if (todayCheckIn) {
        const workMinutes = moment(attendanceTime).diff(moment(todayCheckIn.timestamp), 'minutes');
        attendance.workDuration = Math.max(0, workMinutes);
        
        // Calculate overtime/undertime and detect half-day
        const expectedMinutes = shift.workingHours * 60;
        const halfDayThreshold = expectedMinutes / 2; // Half of expected hours
        
        // Check if employee has approved leave for today
        const approvedLeave = await LeaveRequest.findOne({
          employeeId: employee.employeeId,
          status: 'approved',
          startDate: { $lte: attendanceDate },
          endDate: { $gte: attendanceDate }
        });
        
        if (approvedLeave) {
          // Employee has approved leave but still checked in/out
          if (approvedLeave.leaveType === 'half-day') {
            attendance.status = 'half-day';
            // Preserve 'late' and 'on-leave' status from check-in
            if (todayCheckIn.status !== 'late' && todayCheckIn.status !== 'on-leave') {
              todayCheckIn.status = 'half-day';
              await todayCheckIn.save();
            }
          } else {
            attendance.status = 'on-leave';
            // If check-in was already on-leave, keep it. If it was late, employee was late but has leave (on-leave takes priority)
            if (todayCheckIn.status !== 'on-leave') {
              todayCheckIn.status = 'on-leave';
              await todayCheckIn.save();
            }
          }
        } else if (workMinutes >= halfDayThreshold && workMinutes < expectedMinutes - 30) {
          // Worked between 4-7.5 hours (for 8-hour shift) = half-day
          attendance.status = 'half-day';
          // Preserve 'late' and 'on-leave' status from check-in
          if (todayCheckIn.status !== 'late' && todayCheckIn.status !== 'on-leave') {
            todayCheckIn.status = 'half-day';
            await todayCheckIn.save();
          }
          attendance.undertimeMinutes = expectedMinutes - workMinutes;
        } else if (workMinutes < halfDayThreshold) {
          // Worked less than half day
          attendance.status = 'half-day';
          // Preserve 'late' and 'on-leave' status from check-in
          if (todayCheckIn.status !== 'late' && todayCheckIn.status !== 'on-leave') {
            todayCheckIn.status = 'half-day';
            await todayCheckIn.save();
          }
          attendance.undertimeMinutes = expectedMinutes - workMinutes;
        } else if (workMinutes > expectedMinutes + 30) {
          // Overtime (30 min grace)
          attendance.overtimeMinutes = workMinutes - expectedMinutes;
          // Don't modify check-in status - preserve 'late' or 'on-leave' if set
        } else if (workMinutes < expectedMinutes - 30) {
          // Undertime (30 min grace)
          attendance.undertimeMinutes = expectedMinutes - workMinutes;
          // Don't modify check-in status - preserve 'late' or 'on-leave' if set
        }
      } else {
        // No check-in found - employee is only checking out
        // This happens when: 1) Employee on official assignment/examination returns to check out
        //                    2) Employee forgot to check in but remembers to check out
        //                    3) Time-based leave where only checkout is required
        
        // Check if employee has approved leave for today
        const approvedLeave = await LeaveRequest.findOne({
          employeeId: employee.employeeId,
          status: 'approved',
          startDate: { $lte: attendanceDate },
          endDate: { $gte: attendanceDate }
        });
        
        if (approvedLeave) {
          // Employee has approved leave and is checking out (e.g., returning from official assignment)
          attendance.status = 'on-leave';
          attendance.leaveRequest = approvedLeave._id;
          console.log(`📅 Check-out with approved leave (no check-in): ${employee.firstName} ${employee.lastName} - ${approvedLeave.leaveType}`);
        } else {
          // No check-in and no leave - mark as incomplete/half-day
          attendance.status = 'half-day';
          console.log(`⚠️ Check-out without check-in: ${employee.firstName} ${employee.lastName}`);
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