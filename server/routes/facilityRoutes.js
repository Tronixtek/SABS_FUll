const express = require('express');
const router = express.Router();
const {
  getFacilities,
  getFacility,
  createFacility,
  updateFacility,
  deleteFacility,
  syncFacility,
  getFacilityStats
} = require('../controllers/facilityController');
const { protect, checkPermission } = require('../middleware/auth');

router.use(protect);

router.get('/', getFacilities);
router.get('/:id', getFacility);
router.get('/:id/stats', getFacilityStats);
router.post('/', checkPermission('manage_facilities'), createFacility);
router.put('/:id', checkPermission('manage_facilities'), updateFacility);
router.delete('/:id', checkPermission('manage_facilities'), deleteFacility);
router.post('/:id/sync', checkPermission('manage_facilities'), syncFacility);

module.exports = router;
