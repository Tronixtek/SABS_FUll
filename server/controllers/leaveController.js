const LeaveRequest = require('../models/LeaveRequest');
const LeavePolicy = require('../models/LeavePolicy');
const Employee = require('../models/Employee');
const Facility = require('../models/Facility');
const Attendance = require('../models/Attendance');
const Shift = require('../models/Shift');
const moment = require('moment-timezone');

// Helper function to create attendance records for approved leave
const createAttendanceRecordsForLeave = async (leaveRequest) => {
  try {
    console.log('[CREATE ATTENDANCE] Creating attendance records for leave:', leaveRequest._id);
    
    // Get employee details
    const employee = await Employee.findById(leaveRequest.employee).populate('shift facility');
    if (!employee) {
      console.error('[CREATE ATTENDANCE] Employee not found');
      return;
    }

    // Get facility timezone
    const timezone = employee.facility?.timezone || 'Africa/Lagos';
    
    // Determine the date range for the leave
    let startDate, endDate;
    
    if (leaveRequest.startDate && leaveRequest.endDate) {
      // Multi-day leave
      startDate = moment(leaveRequest.startDate).tz(timezone).startOf('day');
      endDate = moment(leaveRequest.endDate).tz(timezone).endOf('day');
    } else if (leaveRequest.date || leaveRequest.affectedDate) {
      // Single day leave
      const leaveDate = leaveRequest.date || leaveRequest.affectedDate;
      startDate = moment(leaveDate).tz(timezone).startOf('day');
      endDate = moment(leaveDate).tz(timezone).endOf('day');
    } else {
      console.error('[CREATE ATTENDANCE] No date information in leave request');
      return;
    }

    console.log(`[CREATE ATTENDANCE] Date range: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);

    // Loop through each day in the leave period
    let currentDate = startDate.clone();
    let recordsCreated = 0;
    
    while (currentDate.isSameOrBefore(endDate, 'day')) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const dayStart = currentDate.clone().startOf('day').toDate();
      const dayEnd = currentDate.clone().endOf('day').toDate();
      
      // Check if attendance record already exists for this date
      const existing = await Attendance.findOne({
        employeeId: employee.employeeId,
        date: { $gte: dayStart, $lte: dayEnd }
      });

      if (!existing) {
        // Create attendance record with 'on-leave' status
        const attendanceData = {
          employee: employee._id,
          employeeId: employee.employeeId,
          facility: employee.facility._id,
          date: currentDate.toDate(),
          type: 'check-in',
          timestamp: currentDate.toDate(),
          shift: employee.shift._id,
          scheduledCheckIn: currentDate.clone().set({
            hour: parseInt(employee.shift.startTime.split(':')[0]),
            minute: parseInt(employee.shift.startTime.split(':')[1])
          }).toDate(),
          scheduledCheckOut: currentDate.clone().set({
            hour: parseInt(employee.shift.endTime.split(':')[0]),
            minute: parseInt(employee.shift.endTime.split(':')[1])
          }).toDate(),
          status: 'on-leave',
          leaveRequest: leaveRequest._id,
          source: 'MANUAL',
          verified: true,
          workHours: 0,
          overtime: 0,
          undertime: 0,
          lateArrival: 0,
          earlyDeparture: 0
        };

        await Attendance.create(attendanceData);
        recordsCreated++;
        console.log(`[CREATE ATTENDANCE] Created record for ${dateStr}`);
      } else {
        // Update existing record to on-leave status
        existing.status = 'on-leave';
        existing.leaveRequest = leaveRequest._id;
        await existing.save();
        console.log(`[CREATE ATTENDANCE] Updated existing record for ${dateStr} to on-leave`);
      }

      currentDate.add(1, 'day');
    }

    console.log(`[CREATE ATTENDANCE] Created/updated ${recordsCreated} attendance records`);
  } catch (error) {
    console.error('[CREATE ATTENDANCE] Error creating attendance records:', error);
  }
};

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
      leaveType,
      startDate,
      endDate,
      reason,
      submittedBy
    } = req.body;

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

    // Validate required fields
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: leaveType, startDate, endDate, reason'
      });
    }

    // Get active policy for this leave type
    const policy = await LeavePolicy.getPolicyForGradeLevel(
      leaveType,
      employee.gradeLevel || 1,
      employee.facility
    );

    if (!policy || !policy.isActive) {
      return res.status(400).json({
        success: false,
        message: `Leave type ${leaveType} is not available or has been disabled`
      });
    }

    // Validate minimum notice period
    const now = new Date();
    const requestStartDate = new Date(startDate);
    const daysNotice = Math.ceil((requestStartDate - now) / (1000 * 60 * 60 * 24));
    
    if (!policy.allowRetroactive && daysNotice < policy.minimumNoticeDays) {
      return res.status(400).json({
        success: false,
        message: `This leave type requires ${policy.minimumNoticeDays} days notice. You provided ${daysNotice} days notice.`
      });
    }

    // Calculate requested duration
    const start = new Date(startDate);
    const end = new Date(endDate);
    const requestedDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Validate against max days per request
    if (policy.maxDaysPerRequest > 0 && requestedDays > policy.maxDaysPerRequest) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${policy.maxDaysPerRequest} days allowed per request for ${policy.displayName}`
      });
    }

    // Check balance if leave type has limits
    if (policy.hasBalanceLimit && policy.maxDaysPerYear > 0) {
      const currentYear = new Date().getFullYear();
      const usedDays = await LeaveRequest.calculateLeaveBalance(
        employee._id,
        leaveType,
        currentYear
      );
      
      const available = policy.maxDaysPerYear - usedDays;
      
      if (requestedDays > available) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance. You have ${available} days remaining for ${policy.displayName}`
        });
      }
    }

    // Create leave request data
    const leaveData = {
      employee: employee._id,
      employeeId: employee.employeeId,
      facility: employee.facility,
      leaveType: leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      requiresUrgentApproval: policy.requiresUrgentApproval,
      submittedBy: submittedBy || req.user?.id || req.employee?.id
    };
    
    // Handle file uploads if present
    if (req.files && req.files.length > 0) {
      leaveData.attachments = req.files.map(file => ({
        fileName: file.originalname,
        fileUrl: `/uploads/leave-documents/${file.filename}`,
        uploadedAt: new Date()
      }));
      console.log('[SUBMIT LEAVE] Uploaded files:', leaveData.attachments);
    }

    console.log('[SUBMIT LEAVE] Leave data to save:', JSON.stringify(leaveData, null, 2));

    // Create leave request
    const leaveRequest = new LeaveRequest(leaveData);

    // Calculate duration (will be done in pre-save middleware)
    await leaveRequest.save();
    console.log('[SUBMIT LEAVE] Successfully saved:', leaveRequest._id);

    // Populate for response
    await leaveRequest.populate(['employee', 'facility']);

    return res.status(201).json({
      success: true,
      message: `Leave request submitted successfully`,
      data: {
        leaveRequest,
        policyInfo: {
          isPaid: policy.isPaid,
          salaryPercentage: policy.salaryPercentage,
          requiresDocumentation: policy.requiresDocumentation,
          requiredDocuments: policy.requiredDocuments,
          requiresUrgentApproval: policy.requiresUrgentApproval
        }
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
      
      // Create attendance records for the leave period
      await createAttendanceRecordsForLeave(leaveRequest);
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

// Check if employee has approved leave for date (for attendance integration)
const checkLeaveForAttendance = async (req, res) => {
  try {
    const { employeeId, date } = req.query;

    const leave = await LeaveRequest.hasApprovedLeave(employeeId, date);

    res.json({
      success: true,
      data: {
        hasApprovedLeave: !!leave,
        leave: leave || null
      }
    });

  } catch (error) {
    console.error('Error checking leave for attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check leave for attendance',
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
      matchQuery.startDate = {};
      if (startDate) matchQuery.startDate.$gte = new Date(startDate);
      if (endDate) matchQuery.startDate.$lte = new Date(endDate);
    }

    const stats = await LeaveRequest.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          approvedRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          pendingRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          rejectedRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          cancelledRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalLeaveDays: {
            $sum: { 
              $cond: [
                { $eq: ['$status', 'approved'] },
                '$duration',
                0
              ]
            }
          }
        }
      }
    ]);

    // Get breakdown by leave type
    const typeBreakdown = await LeaveRequest.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$leaveType',
          count: { $sum: 1 },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          totalDays: {
            $sum: { 
              $cond: [
                { $eq: ['$status', 'approved'] },
                '$duration',
                0
              ]
            }
          }
        }
      }
    ]);

    // Get all requests for the Leave Management page
    const allRequests = await LeaveRequest.find(matchQuery)
      .populate(['employee', 'facility', 'approvedBy'])
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        overall: stats[0] || {
          totalRequests: 0,
          approvedRequests: 0,
          pendingRequests: 0,
          rejectedRequests: 0,
          cancelledRequests: 0,
          totalLeaveDays: 0
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
  getEmployeeLeaveRequests,
  getPendingRequests,
  processLeaveRequest,
  checkLeaveForAttendance,
  getLeaveStatistics
};