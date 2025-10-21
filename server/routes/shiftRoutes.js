const express = require('express');
const router = express.Router();
const {
  getShifts,
  getShift,
  createShift,
  updateShift,
  deleteShift
} = require('../controllers/shiftController');
const { protect, checkPermission } = require('../middleware/auth');

router.use(protect);

router.get('/', getShifts);
router.get('/:id', getShift);
router.post('/', checkPermission('manage_shifts'), createShift);
router.put('/:id', checkPermission('manage_shifts'), updateShift);
router.delete('/:id', checkPermission('manage_shifts'), deleteShift);

module.exports = router;
