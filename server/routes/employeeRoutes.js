const express = require('express');
const router = express.Router();
const {
  getEmployees,
  getEmployee,
  createEmployee,
  registerEmployeeWithDevice,
  retryDeviceSync,
  bulkSyncEmployees,
  updateEmployee,
  deleteEmployee,
  forceDeleteEmployee,
  getEmployeeStats,
  generateNextEmployeeId
} = require('../controllers/employeeController');
const { protect, checkPermission } = require('../middleware/auth');

router.use(protect);

router.get('/', checkPermission('view_attendance'), getEmployees);
router.get('/generate-id/:facilityId', checkPermission('manage_employees'), generateNextEmployeeId);
router.get('/:id', checkPermission('view_attendance'), getEmployee);
router.get('/:id/stats', checkPermission('view_attendance'), getEmployeeStats);
router.post('/', checkPermission('manage_employees'), createEmployee);
router.post('/register', checkPermission('manage_employees'), registerEmployeeWithDevice);
router.post('/bulk-sync', checkPermission('manage_employees'), bulkSyncEmployees);
router.post('/:id/retry-device-sync', checkPermission('manage_employees'), retryDeviceSync);
router.put('/:id', checkPermission('manage_employees'), updateEmployee);
router.delete('/:id', checkPermission('manage_employees'), deleteEmployee);
router.delete('/:id/force', checkPermission('manage_employees'), forceDeleteEmployee);

module.exports = router;
