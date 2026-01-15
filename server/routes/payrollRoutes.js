const express = require('express');
const router = express.Router();
const {
  generatePayroll,
  getAllPayrolls,
  getPayroll,
  updatePayroll,
  approvePayroll,
  markAsPaid,
  deletePayroll,
  getPayrollSummary
} = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/auth');

// Protected routes (Admin/Super Admin)
router.post('/generate', protect, authorize('admin', 'super-admin'), generatePayroll);
router.get('/summary', protect, authorize('admin', 'super-admin'), getPayrollSummary);
router.get('/', protect, authorize('admin', 'super-admin'), getAllPayrolls);
router.get('/:id', protect, getPayroll);
router.put('/:id', protect, authorize('admin', 'super-admin'), updatePayroll);
router.put('/:id/approve', protect, authorize('admin', 'super-admin'), approvePayroll);
router.put('/:id/pay', protect, authorize('admin', 'super-admin'), markAsPaid);
router.delete('/:id', protect, authorize('super-admin'), deletePayroll);

module.exports = router;
