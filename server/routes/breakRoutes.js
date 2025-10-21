const express = require('express');
const router = express.Router();
const breakController = require('../controllers/breakController');
const { protect } = require('../middleware/auth');

// Start a break
router.post('/start', protect, breakController.startBreak);

// End a break
router.post('/end', protect, breakController.endBreak);

// Get break status
router.get('/status/:employeeId', protect, breakController.getBreakStatus);

// Get break history
router.get('/history/:employeeId', protect, breakController.getBreakHistory);

module.exports = router;
