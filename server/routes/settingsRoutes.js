const express = require('express');
const router = express.Router();
const {
  getSettings,
  getSetting,
  updateSetting,
  deleteSetting,
  testEmail
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getSettings);
router.get('/:key', getSetting);
router.put('/:key', authorize('super-admin', 'admin'), updateSetting);
router.delete('/:key', authorize('super-admin', 'admin'), deleteSetting);
router.post('/test-email', authorize('super-admin', 'admin'), testEmail);

module.exports = router;
