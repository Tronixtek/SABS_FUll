const express = require('express');
const router = express.Router();
const {
  getPayrollSettings,
  updatePayrollSettings
} = require('../controllers/payrollSettingsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin', 'super-admin'));

router.get('/', getPayrollSettings);
router.put('/', updatePayrollSettings);

module.exports = router;
