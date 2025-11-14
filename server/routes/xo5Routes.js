const express = require('express');
const router = express.Router();
const { handleXO5Record } = require('../controllers/xo5Controller');

// @desc    Receive attendance data from XO5 device
// @route   POST /api/xo5/record
// @access  Public (device webhook)
router.post('/record', handleXO5Record);

// @desc    Health check for XO5 devices
// @route   GET /api/xo5/health
// @access  Public
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'XO5 webhook endpoint is active',
    timestamp: new Date().toISOString(),
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  });
});

module.exports = router;