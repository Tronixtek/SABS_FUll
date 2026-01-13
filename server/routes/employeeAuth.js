const express = require('express');
const router = express.Router();
const { 
  employeeLogin, 
  changePin, 
  getMe 
} = require('../controllers/employeeAuthController');
const { protectEmployee } = require('../middleware/employeeAuth');

// Public routes
router.post('/login', employeeLogin);

// Protected routes (require employee authentication)
router.put('/change-pin', protectEmployee, changePin);
router.get('/me', protectEmployee, getMe);

module.exports = router;
