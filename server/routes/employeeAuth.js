const express = require('express');
const router = express.Router();
const { 
  employeeLogin, 
  changePin, 
  getMe,
  getMyAttendance,
  getMyShift
} = require('../controllers/employeeAuthController');
const { getMyPayroll } = require('../controllers/payrollController');
const { protectEmployee } = require('../middleware/employeeAuth');

// Public routes
router.post('/login', employeeLogin);

// Protected routes (require employee authentication)
router.put('/change-pin', protectEmployee, changePin);
router.get('/me', protectEmployee, getMe);
router.get('/my-attendance', protectEmployee, getMyAttendance);
router.get('/my-shift', protectEmployee, getMyShift);
router.get('/my-payroll', protectEmployee, getMyPayroll);

module.exports = router;
