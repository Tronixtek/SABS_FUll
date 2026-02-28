const express = require('express');
const router = express.Router();
const {
  getFacilities,
  getFacility,
  createFacility,
  updateFacility,
  deleteFacility,
  syncFacility,
  testFacilityConnection,
  getFacilityStats
} = require('../controllers/facilityController');
const { protect, checkPermission } = require('../middleware/auth');

router.use(protect);

router.get('/', getFacilities);
router.get('/:id', getFacility);
router.get('/:id/stats', getFacilityStats);
// Only admin and super-admin can create facilities
router.post('/', checkPermission('manage_facilities'), createFacility);
// Facility managers can edit their assigned facilities
router.put('/:id', updateFacility);
// Only admin and super-admin can delete facilities
router.delete('/:id', checkPermission('manage_facilities'), deleteFacility);
// Allow sync for facility managers
router.post('/:id/sync', syncFacility);
// Test device connection
router.post('/:id/test-connection', testFacilityConnection);

module.exports = router;
