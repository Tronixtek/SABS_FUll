const express = require('express');
const router = express.Router();
const { register, login, getMe, updatePassword, getUsers } = require('../controllers/authController');
const { protect, restrictInProduction } = require('../middleware/auth');

// Protect registration route in production
router.post('/register', restrictInProduction, register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, updatePassword);
router.get('/users', protect, getUsers);

module.exports = router;
