const express = require('express');
const router = express.Router();
const {
  submitLeaveRequest,
  emergencyExit,
  getEmployeeLeaveRequests,
  getPendingRequests,
  processLeaveRequest,
  checkAttendanceExcuse,
  getLeaveStatistics
} = require('../controllers/leaveController');
const { protect, checkPermission } = require('../middleware/auth');
const { protectEmployee } = require('../middleware/employeeAuth');
const { protectBoth } = require('../middleware/combinedAuth');

// Routes that accept both staff and employee authentication
router.post('/', protectBoth, submitLeaveRequest); // Employee portal uses this
router.get('/my-requests', protectEmployee, getEmployeeLeaveRequests); // Employee gets their own requests

// Staff Routes (authenticated)
router.post('/submit', protect, checkPermission('submit_leave'), submitLeaveRequest);
router.get('/employee/:employeeId', protect, checkPermission('view_leave_requests'), getEmployeeLeaveRequests);
router.get('/check-excuse', protect, checkPermission('view_leave_requests'), checkAttendanceExcuse);

// Manager/HR Routes (authenticated)
router.get('/pending', protect, checkPermission('view_leave_requests'), getPendingRequests);
router.patch('/process/:requestId', protect, checkPermission('approve_leave'), processLeaveRequest);
router.get('/statistics', protect, checkPermission('view_leave_requests'), getLeaveStatistics);

// Emergency exit - will be updated later for employee portal
router.post('/emergency-exit', protect, checkPermission('submit_leave'), emergencyExit);

module.exports = router;