const express = require('express');
const router = express.Router();
const {
  getAllPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  addFacilityOverride,
  getPolicyHistory,
  calculateEntitlement
} = require('../controllers/leavePolicyController');
const { protect, checkPermission } = require('../middleware/auth');

// Public/Employee routes
router.get('/', getAllPolicies); // Get all active leave policies
router.get('/calculate-entitlement', calculateEntitlement); // Calculate entitlement for employee
router.get('/:leaveType', getPolicy); // Get specific policy (with facility/grade level filters)

// Admin routes
router.post('/create', protect, checkPermission('manage_settings'), createPolicy);
router.put('/:leaveType', protect, checkPermission('manage_settings'), updatePolicy);
router.post('/:leaveType/facility-override', protect, checkPermission('manage_settings'), addFacilityOverride);
router.get('/:leaveType/history', protect, checkPermission('manage_settings'), getPolicyHistory);

module.exports = router;
