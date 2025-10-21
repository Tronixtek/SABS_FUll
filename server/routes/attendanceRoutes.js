const express = require('express');
const router = express.Router();
const {
  getAttendance,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceSummary,
  markAbsence
} = require('../controllers/attendanceController');
const { protect, checkPermission } = require('../middleware/auth');

router.use(protect);

router.get('/', checkPermission('view_attendance'), getAttendance);
router.get('/summary/:employeeId', checkPermission('view_attendance'), getAttendanceSummary);
router.get('/:id', checkPermission('view_attendance'), getAttendanceById);
router.post('/', checkPermission('edit_attendance'), createAttendance);
router.post('/absence', checkPermission('edit_attendance'), markAbsence);
router.put('/:id', checkPermission('edit_attendance'), updateAttendance);
router.delete('/:id', checkPermission('delete_attendance'), deleteAttendance);

module.exports = router;
