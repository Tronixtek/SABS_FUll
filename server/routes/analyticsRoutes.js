const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  getEmployeePerformance,
  getOvertimeReport
} = require('../controllers/analyticsController');
const { protect, checkPermission } = require('../middleware/auth');

router.use(protect);
router.use(checkPermission('view_reports'));

router.get('/dashboard', getDashboardAnalytics);
router.get('/employee-performance', getEmployeePerformance);
router.get('/overtime', getOvertimeReport);

module.exports = router;
