const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const {
  submitLeaveRequest,
  getEmployeeLeaveRequests,
  getPendingRequests,
  processLeaveRequest,
  checkLeaveForAttendance,
  getLeaveStatistics
} = require('../controllers/leaveController');
const { protect, checkPermission } = require('../middleware/auth');
const { protectEmployee } = require('../middleware/employeeAuth');
const { protectBoth } = require('../middleware/combinedAuth');

// Routes that accept both staff and employee authentication
router.post('/', protectBoth, upload.array('documents', 5), submitLeaveRequest); // Employee portal uses this
router.get('/my-requests', protectEmployee, getEmployeeLeaveRequests); // Employee gets their own requests

// Staff Routes (authenticated)
router.post('/submit', protect, checkPermission('submit_leave'), upload.array('documents', 5), submitLeaveRequest);
router.get('/employee/:employeeId', protect, checkPermission('view_leave_requests'), getEmployeeLeaveRequests);
router.get('/check-leave', protect, checkPermission('view_leave_requests'), checkLeaveForAttendance);

// Manager/HR Routes (authenticated)
router.get('/pending', protect, checkPermission('view_leave_requests'), getPendingRequests);
router.patch('/process/:requestId', protect, checkPermission('approve_leave'), processLeaveRequest);
router.get('/statistics', protect, checkPermission('view_leave_requests'), getLeaveStatistics);

module.exports = router;