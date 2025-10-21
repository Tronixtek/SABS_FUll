const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Shift = require('../models/Shift');
const moment = require('moment-timezone');
const { attendanceLogger } = require('../utils/logger');

// Start a break manually
exports.startBreak = async (req, res) => {
  try {
    const { employeeId, breakType } = req.body;

    const employee = await Employee.findById(employeeId).populate('shift');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (!employee.shift) {
      return res.status(400).json({ message: 'Employee has no shift assigned' });
    }

    const shift = employee.shift;

    // Check if break tracking is enabled
    if (!shift.breakTrackingEnabled) {
      return res.status(400).json({ 
        message: 'Break tracking is not enabled for this shift' 
      });
    }

    const today = moment().startOf('day').toDate();
    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ 
        message: 'No active attendance found. Please check in first.' 
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ 
        message: 'Already checked out. Cannot start break.' 
      });
    }

    // Check if already on break
    const ongoingBreak = attendance.breaks?.find(b => b.status === 'ongoing');
    if (ongoingBreak) {
      return res.status(400).json({ 
        message: `Already on ${ongoingBreak.name} break since ${moment(ongoingBreak.startTime).format('HH:mm')}`,
        ongoingBreak 
      });
    }

    // Find matching break configuration
    const breakConfig = shift.breaks.find(b => b.type === breakType);
    if (!breakConfig) {
      return res.status(400).json({ 
        message: `Break type '${breakType}' not configured for this shift` 
      });
    }

    // Add new break
    const newBreak = {
      type: breakType,
      name: breakConfig.name,
      startTime: new Date(),
      status: 'ongoing',
      recordedBy: 'employee'
    };

    if (!attendance.breaks) {
      attendance.breaks = [];
    }
    attendance.breaks.push(newBreak);

    await attendance.save();

    attendanceLogger.info(`☕ Break started manually - Employee: ${employee.firstName} ${employee.lastName}, Type: ${breakType}`);

    res.json({ 
      success: true, 
      message: `${breakConfig.name} started`,
      break: newBreak,
      expectedDuration: breakConfig.duration,
      maxDuration: breakConfig.maxDuration
    });

  } catch (error) {
    attendanceLogger.error(`Error starting break: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// End a break manually
exports.endBreak = async (req, res) => {
  try {
    const { employeeId } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const today = moment().startOf('day').toDate();
    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    }).populate('shift');

    if (!attendance) {
      return res.status(404).json({ message: 'No attendance found for today' });
    }

    const ongoingBreak = attendance.breaks?.find(b => b.status === 'ongoing');
    if (!ongoingBreak) {
      return res.status(400).json({ message: 'No active break found' });
    }

    // End the break
    ongoingBreak.endTime = new Date();
    const duration = moment(ongoingBreak.endTime).diff(moment(ongoingBreak.startTime), 'minutes');
    ongoingBreak.duration = duration;

    // Check if exceeded
    const shift = await Shift.findById(attendance.shift);
    const breakConfig = shift.breaks?.find(b => b.type === ongoingBreak.type);
    
    if (breakConfig && duration > breakConfig.maxDuration) {
      ongoingBreak.status = 'exceeded';
    } else {
      ongoingBreak.status = 'completed';
    }

    // Recalculate total break time
    attendance.totalBreakTime = attendance.breaks
      .filter(b => b.status === 'completed' || b.status === 'exceeded')
      .reduce((total, b) => total + b.duration, 0);

    // Recalculate net work hours if checked out
    if (attendance.checkIn && attendance.checkOut) {
      const grossMinutes = moment(attendance.checkOut.time).diff(
        moment(attendance.checkIn.time),
        'minutes'
      );
      const netMinutes = grossMinutes - attendance.totalBreakTime;
      attendance.netWorkHours = Math.round((netMinutes / 60) * 100) / 100;
    }

    await attendance.save();

    attendanceLogger.info(`🏁 Break ended manually - Employee: ${employee.firstName} ${employee.lastName}, Duration: ${duration} mins`);

    res.json({ 
      success: true, 
      message: `${ongoingBreak.name} ended. Duration: ${duration} minutes`,
      break: ongoingBreak,
      totalBreakTime: attendance.totalBreakTime,
      netWorkHours: attendance.netWorkHours,
      exceeded: ongoingBreak.status === 'exceeded'
    });

  } catch (error) {
    attendanceLogger.error(`Error ending break: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// Get current break status
exports.getBreakStatus = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await Employee.findById(employeeId).populate('shift');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const today = moment().startOf('day').toDate();
    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    }).populate('shift');

    if (!attendance) {
      return res.json({ 
        onBreak: false, 
        message: 'No attendance record for today',
        availableBreaks: employee.shift?.breaks || []
      });
    }

    const ongoingBreak = attendance.breaks?.find(b => b.status === 'ongoing');

    // Calculate break duration if on break
    let currentDuration = 0;
    if (ongoingBreak) {
      currentDuration = moment().diff(moment(ongoingBreak.startTime), 'minutes');
    }

    res.json({
      onBreak: !!ongoingBreak,
      currentBreak: ongoingBreak ? {
        ...ongoingBreak.toObject(),
        currentDuration
      } : null,
      allBreaks: attendance.breaks || [],
      totalBreakTime: attendance.totalBreakTime || 0,
      breakCompliance: attendance.breakCompliance || 'none',
      availableBreaks: employee.shift?.breaks || [],
      breakTrackingEnabled: employee.shift?.breakTrackingEnabled || false
    });

  } catch (error) {
    attendanceLogger.error(`Error fetching break status: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// Get break history for an employee
exports.getBreakHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    const query = {
      employee: employeeId,
      'breaks.0': { $exists: true } // Has at least one break
    };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendanceRecords = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(30)
      .select('date breaks totalBreakTime breakCompliance status');

    const breakHistory = attendanceRecords.map(record => ({
      date: record.date,
      breaks: record.breaks,
      totalBreakTime: record.totalBreakTime,
      breakCompliance: record.breakCompliance,
      status: record.status
    }));

    res.json({
      success: true,
      history: breakHistory,
      totalRecords: breakHistory.length
    });

  } catch (error) {
    attendanceLogger.error(`Error fetching break history: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};
