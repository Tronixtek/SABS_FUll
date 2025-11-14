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

// Employee Routes
router.post('/submit', submitLeaveRequest);
router.post('/emergency-exit', emergencyExit);
router.get('/employee/:employeeId', getEmployeeLeaveRequests);
router.get('/check-excuse', checkAttendanceExcuse);

// Manager/HR Routes
router.get('/pending', getPendingRequests);
router.patch('/process/:requestId', processLeaveRequest);
router.get('/statistics', getLeaveStatistics);

module.exports = router;