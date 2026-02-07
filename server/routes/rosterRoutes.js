const express = require('express');
const router = express.Router();
const rosterController = require('../controllers/rosterController');
const { protect, checkPermission } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get all rosters (with filters)
router.get('/', rosterController.getRosters);

// Get active roster for a facility
router.get('/active/:facilityId', rosterController.getActiveRoster);

// Get employee's current shift assignment
router.get('/assignments/current/:employeeId', rosterController.getEmployeeCurrentAssignment);

// Get employee's assignment history
router.get('/assignments/employee/:employeeId', rosterController.getEmployeeAssignmentHistory);

// Get single roster
router.get('/:id', rosterController.getRoster);

// Admin-only routes - require manage_settings permission
// Create new roster
router.post('/', checkPermission('manage_settings'), rosterController.createRoster);

// Update roster
router.put('/:id', checkPermission('manage_settings'), rosterController.updateRoster);

// Assign employee to roster
router.post('/:id/assign', checkPermission('manage_settings'), rosterController.assignEmployeeToRoster);

// Bulk assign employees
router.post('/:id/bulk-assign', checkPermission('manage_settings'), rosterController.bulkAssignEmployees);

// Remove employee from roster
router.delete('/:id/assign/:employeeId', checkPermission('manage_settings'), rosterController.removeEmployeeFromRoster);

// Publish roster
router.post('/:id/publish', checkPermission('manage_settings'), rosterController.publishRoster);

// Unpublish roster
router.post('/:id/unpublish', checkPermission('manage_settings'), rosterController.unpublishRoster);

// Archive roster
router.post('/:id/archive', checkPermission('manage_settings'), rosterController.archiveRoster);

// Delete roster
router.delete('/:id', checkPermission('manage_settings'), rosterController.deleteRoster);

module.exports = router;
