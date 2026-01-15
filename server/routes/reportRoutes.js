const express = require('express');
const router = express.Router();
const {
  getDailyReport,
  getMonthlyReport,
  getCustomReport,
  generatePDFReport,
  getPayrollReport,
  generatePayrollPDF
} = require('../controllers/reportController');
const { protect, checkPermission } = require('../middleware/auth');

router.use(protect);
router.use(checkPermission('view_reports'));

router.get('/daily', getDailyReport);
router.get('/monthly', getMonthlyReport);
router.get('/custom', getCustomReport);
router.get('/pdf', generatePDFReport);
router.get('/payroll', getPayrollReport);
router.get('/payroll-pdf', generatePayrollPDF);

module.exports = router;
