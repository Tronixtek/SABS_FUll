const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');
const Facility = require('../models/Facility');

// Submit Leave/Excuse Request
const submitLeaveRequest = async (req, res) => {
  try {
    // Handle both employee portal (uses employee ObjectId) and staff portal (uses employeeId string) formats
    const isEmployeePortal = !!req.employee; // Employee authenticated
    const isStaffPortal = !!req.user; // Staff authenticated
    
    console.log('[SUBMIT LEAVE] Request body:', req.body);
    console.log('[SUBMIT LEAVE] Auth type:', isEmployeePortal ? 'Employee' : 'Staff');
    
    let {
      employeeId,
      type,
      leaveType,
      affectedDate,
      date,
      startDate,
      endDate,
      startTime,
      endTime,
      reason,
      category,
      urgency = 'medium',
      isEmergency = false,
      submittedBy
    } = req.body;

    // Normalize field names (employee portal uses different naming)
    if (leaveType) type = leaveType;
    if (date && !affectedDate) affectedDate = date;
    
    let employee;
    
    if (isEmployeePortal) {
      // Employee portal - get employee from authenticated session
      employee = await Employee.findById(req.employee.id);
      employeeId = employee.employeeId;
      submittedBy = req.employee.id; // Employee submitted for themselves
      console.log('[SUBMIT LEAVE] Employee portal - found employee:', employee.employeeId);
    } else {
      // Staff portal - validate employee exists by employeeId
      employee = await Employee.findOne({ employeeId: employeeId });
      console.log('[SUBMIT LEAVE] Staff portal - found employee:', employee?.employeeId);
    }

    if (!employee) {
      console.log('[SUBMIT LEAVE] Employee not found');
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Determine if this is multi-day or time-based leave
    const isMultiDay = startDate && endDate;
    const isTimeBased = startTime && endTime && !isMultiDay;

    // Check if request is retroactive
    const now = new Date();
    let affectedDateTime;
    
    if (isMultiDay) {
      affectedDateTime = new Date(startDate);
    } else if (isTimeBased || affectedDate) {
      affectedDateTime = new Date(affectedDate || date);
    }
    
    const isRetroactive = affectedDateTime < now;

    // Create leave request data
    const leaveData = {
      employee: employee._id,
      employeeId: employee.employeeId,
      facility: employee.facility,
      type: type || leaveType,
      reason,
      category: category || 'personal',
      urgency: urgency || 'medium',
      isEmergency: isEmergency || urgency === 'emergency',
      isRetroactive,
      submittedBy: submittedBy || req.user?.id || req.employee?.id
    };

    // Add date fields based on leave type
    if (isMultiDay) {
      leaveData.startDate = new Date(startDate);
      leaveData.endDate = new Date(endDate);
      leaveData.affectedDate = new Date(startDate); // For compatibility
    } else if (isTimeBased) {
      leaveData.affectedDate = affectedDateTime;
      leaveData.date = affectedDateTime;
      leaveData.startTime = startTime;
      leaveData.endTime = endTime;
    } else {
      leaveData.affectedDate = affectedDateTime;
    }

    console.log('[SUBMIT LEAVE] Leave data to save:', JSON.stringify(leaveData, null, 2));

    // Create leave request
    const leaveRequest = new LeaveRequest(leaveData);

    // Calculate duration (will be done in pre-save middleware)
    await leaveRequest.save();
    console.log('[SUBMIT LEAVE] Successfully saved:', leaveRequest._id);

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
    let query = {};
    
    // Check if this is employee self-service (protectEmployee middleware) or staff viewing (protect middleware)
    if (req.employee) {
      // Employee viewing their own requests - use employee ObjectId
      query.employee = req.employee._id;
    } else if (req.params.employeeId) {
      // Staff viewing an employee's requests - support both employeeId string and ObjectId
      const employeeIdParam = req.params.employeeId;
      // Check if it's a MongoDB ObjectId or employeeId string
      if (employeeIdParam.match(/^[0-9a-fA-F]{24}$/)) {
        query.employee = employeeIdParam;
      } else {
        query.employeeId = employeeIdParam;
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }
    
    const { status, startDate, endDate, type } = req.query;
    
    if (status) query.status = status;
    if (type) query.type = type;
    
    if (startDate || endDate) {
      query.$or = [
        { affectedDate: {} },
        { startDate: {} },
        { date: {} }
      ];
      if (startDate) {
        query.$or[0].affectedDate.$gte = new Date(startDate);
        query.$or[1].startDate.$gte = new Date(startDate);
        query.$or[2].date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.$or[0].affectedDate.$lte = new Date(endDate);
        query.$or[1].endDate.$lte = new Date(endDate);
        query.$or[2].date.$lte = new Date(endDate);
      }
    }

    const leaveRequests = await LeaveRequest.find(query)
      .populate(['employee', 'facility', 'approvedBy'])
      .sort({ requestDate: -1 });

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

    console.log('[LEAVE PROCESS] Request:', { requestId, action, managerNotes, approvedBy, userId: req.user?.id });

    const leaveRequest = await LeaveRequest.findById(requestId);
    if (!leaveRequest) {
      console.log('[LEAVE PROCESS] Leave request not found:', requestId);
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (leaveRequest.status !== 'pending') {
      console.log('[LEAVE PROCESS] Request already processed:', leaveRequest.status);
      return res.status(400).json({
        success: false,
        message: 'Request has already been processed'
      });
    }

    // Update request status
    if (action === 'approve') {
      leaveRequest.status = 'approved';
      leaveRequest.approvedBy = approvedBy || req.user?.id; // Use provided ID or fallback to current user
      leaveRequest.approvedAt = new Date();
      console.log('[LEAVE PROCESS] Approving with user:', leaveRequest.approvedBy);
    } else if (action === 'reject') {
      leaveRequest.status = 'rejected';
      leaveRequest.rejectionReason = managerNotes;
      console.log('[LEAVE PROCESS] Rejecting with reason:', managerNotes);
    }

    if (managerNotes) {
      leaveRequest.managerNotes = managerNotes;
    }

    await leaveRequest.save({ validateModifiedOnly: true });
    console.log('[LEAVE PROCESS] Successfully saved:', leaveRequest._id);

    // Send notifications
    // await sendApprovalNotification(leaveRequest);

    res.json({
      success: true,
      message: `Leave request ${action}d successfully`,
      data: { leaveRequest }
    });

  } catch (error) {
    console.error('[LEAVE PROCESS] Error processing leave request:', error);
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

    // Get all requests for the Leave Management page
    const allRequests = await LeaveRequest.find(matchQuery)
      .populate(['employee', 'facility', 'approvedBy'])
      .sort({ requestDate: -1 });

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
        breakdown: typeBreakdown,
        allRequests: allRequests
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