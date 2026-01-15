const express = require('express');
const router = express.Router();
const salaryGradeController = require('../controllers/salaryGradeController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and admin/super-admin role
router.use(protect);
router.use(authorize('admin', 'super-admin'));

// Statistics
router.get('/stats', salaryGradeController.getSalaryGradeStats);

// CRUD operations
router.route('/')
  .get(salaryGradeController.getSalaryGrades)
  .post(salaryGradeController.createSalaryGrade);

router.route('/:id')
  .get(salaryGradeController.getSalaryGrade)
  .put(salaryGradeController.updateSalaryGrade)
  .delete(salaryGradeController.deleteSalaryGrade);

module.exports = router;
