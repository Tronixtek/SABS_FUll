const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');
const Facility = require('../models/Facility');

// Submit Leave/Excuse Request
const submitLeaveRequest = async (req, res) => {
  try {
    const {
      employeeId,
      type,
      affectedDate,
      startTime,
      endTime,
      reason,
      category,
      urgency = 'medium',
      isEmergency = false
    } = req.body;

    // Validate employee exists
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if request is retroactive
    const now = new Date();
    const affectedDateTime = new Date(affectedDate);
    const isRetroactive = affectedDateTime < now;

    // Create leave request
    const leaveRequest = new LeaveRequest({
      employee: employee._id,
      employeeId: employee.employeeId,
      facility: employee.facility,
      type,
      affectedDate: affectedDateTime,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      reason,
      category,
      urgency,
      isEmergency,
      isRetroactive
    });

    // Calculate duration (will be done in pre-save middleware)
    await leaveRequest.save();

    // Populate for response
    await leaveRequest.populate(['employee', 'facility']);

    // Send notifications (implement based on your notification system)
    // await sendNotifications(leaveRequest);

    res.status(201).json({
      success: true,
      message: `Leave request ${leaveRequest.status} successfully`,
      data: {
        leaveRequest,
        autoApproved: leaveRequest.status === 'auto-approved'
      }
    });

  } catch (error) {
    console.error('Error submitting leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit leave request',
      error: error.message
    });
  }
};

// Quick Emergency Exit (for when employee already left)
const emergencyExit = async (req, res) => {
  try {
    const { employeeId, reason, category = 'emergency', exitTime } = req.body;

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const now = new Date();
    const exitDateTime = exitTime ? new Date(exitTime) : now;

    // Create emergency exit request (auto-approved)
    const emergencyRequest = new LeaveRequest({
      employee: employee._id,
      employeeId: employee.employeeId,
      facility: employee.facility,
      type: 'emergency-exit',
      affectedDate: exitDateTime,
      startTime: exitDateTime,
      endTime: new Date(exitDateTime.getTime() + (4 * 60 * 60 * 1000)), // Assume 4 hours
      reason,
      category,
      urgency: 'emergency',
      isEmergency: true,
      isRetroactive: true
    });

    await emergencyRequest.save();

    res.status(201).json({
      success: true,
      message: 'Emergency exit recorded and auto-approved',
      data: { leaveRequest: emergencyRequest }
    });

  } catch (error) {
    console.error('Error recording emergency exit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record emergency exit',
      error: error.message
    });
  }
};

// Get Leave Requests for Employee
const getEmployeeLeaveRequests = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status, startDate, endDate, type } = req.query;

    // Build query
    const query = { employeeId };
    
    if (status) query.status = status;
    if (type) query.type = type;
    
    if (startDate || endDate) {
      query.affectedDate = {};
      if (startDate) query.affectedDate.$gte = new Date(startDate);
      if (endDate) query.affectedDate.$lte = new Date(endDate);
    }

    const leaveRequests = await LeaveRequest.find(query)
      .populate(['employee', 'facility', 'approvedBy'])
      .sort({ affectedDate: -1 });

    res.json({
      success: true,
      data: { leaveRequests }
    });

  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave requests',
      error: error.message
    });
  }
};

// Get Pending Leave Requests (for managers/HR)
const getPendingRequests = async (req, res) => {
  try {
    const { facilityId, urgency, type } = req.query;

    const query = { status: 'pending' };
    if (facilityId) query.facility = facilityId;
    if (urgency) query.urgency = urgency;
    if (type) query.type = type;

    const pendingRequests = await LeaveRequest.find(query)
      .populate(['employee', 'facility'])
      .sort({ urgency: 1, requestDate: 1 }); // High urgency first

    res.json({
      success: true,
      data: { 
        pendingRequests,
        count: pendingRequests.length
      }
    });

  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending requests',
      error: error.message
    });
  }
};

// Approve/Reject Leave Request
const processLeaveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, managerNotes, approvedBy } = req.body; // action: 'approve' or 'reject'

    const leaveRequest = await LeaveRequest.findById(requestId);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request has already been processed'
      });
    }

    // Update request status
    if (action === 'approve') {
      leaveRequest.status = 'approved';
      leaveRequest.approvedBy = approvedBy;
      leaveRequest.approvedAt = new Date();
    } else if (action === 'reject') {
      leaveRequest.status = 'rejected';
      leaveRequest.rejectionReason = managerNotes;
    }

    if (managerNotes) {
      leaveRequest.managerNotes = managerNotes;
    }

    await leaveRequest.save();

    // Send notifications
    // await sendApprovalNotification(leaveRequest);

    res.json({
      success: true,
      message: `Leave request ${action}d successfully`,
      data: { leaveRequest }
    });

  } catch (error) {
    console.error('Error processing leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process leave request',
      error: error.message
    });
  }
};

// Check if employee has valid excuse for attendance discrepancy
const checkAttendanceExcuse = async (req, res) => {
  try {
    const { employeeId, date, timeType } = req.query; // timeType: 'late-arrival' or 'early-departure'

    const excuse = await LeaveRequest.hasValidExcuse(employeeId, date, timeType);

    res.json({
      success: true,
      data: {
        hasValidExcuse: !!excuse,
        excuse: excuse || null,
        impact: excuse ? excuse.attendanceAdjustment : 0
      }
    });

  } catch (error) {
    console.error('Error checking attendance excuse:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check attendance excuse',
      error: error.message
    });
  }
};

// Get Leave Statistics
const getLeaveStatistics = async (req, res) => {
  try {
    const { facilityId, startDate, endDate, employeeId } = req.query;

    const matchQuery = {};
    if (facilityId) matchQuery.facility = facilityId;
    if (employeeId) matchQuery.employeeId = employeeId;
    
    if (startDate || endDate) {
      matchQuery.affectedDate = {};
      if (startDate) matchQuery.affectedDate.$gte = new Date(startDate);
      if (endDate) matchQuery.affectedDate.$lte = new Date(endDate);
    }

    const stats = await LeaveRequest.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          approvedRequests: {
            $sum: { $cond: [{ $in: ['$status', ['approved', 'auto-approved']] }, 1, 0] }
          },
          pendingRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          rejectedRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          emergencyExits: {
            $sum: { $cond: [{ $eq: ['$type', 'emergency-exit'] }, 1, 0] }
          },
          lateArrivals: {
            $sum: { $cond: [{ $eq: ['$type', 'late-arrival'] }, 1, 0] }
          },
          earlyDepartures: {
            $sum: { $cond: [{ $eq: ['$type', 'early-departure'] }, 1, 0] }
          },
          totalExcusedHours: {
            $sum: { 
              $cond: [
                { $in: ['$status', ['approved', 'auto-approved']] },
                { $divide: ['$duration', 60] },
                0
              ]
            }
          }
        }
      }
    ]);

    // Get breakdown by type
    const typeBreakdown = await LeaveRequest.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          approvedCount: {
            $sum: { $cond: [{ $in: ['$status', ['approved', 'auto-approved']] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overall: stats[0] || {
          totalRequests: 0,
          approvedRequests: 0,
          pendingRequests: 0,
          rejectedRequests: 0,
          emergencyExits: 0,
          lateArrivals: 0,
          earlyDepartures: 0,
          totalExcusedHours: 0
        },
        breakdown: typeBreakdown
      }
    });

  } catch (error) {
    console.error('Error fetching leave statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave statistics',
      error: error.message
    });
  }
};

module.exports = {
  submitLeaveRequest,
  emergencyExit,
  getEmployeeLeaveRequests,
  getPendingRequests,
  processLeaveRequest,
  checkAttendanceExcuse,
  getLeaveStatistics
};