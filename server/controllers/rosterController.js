const MonthlyRoster = require('../models/MonthlyRoster');
const ShiftAssignment = require('../models/ShiftAssignment');
const Employee = require('../models/Employee');
const Shift = require('../models/Shift');
const moment = require('moment');

/**
 * @desc    Get all rosters for a facility
 * @route   GET /api/rosters
 * @access  Private (Admin)
 */
exports.getRosters = async (req, res) => {
  try {
    const { facility, status, month } = req.query;
    
    const query = {};
    if (facility) query.facility = facility;
    if (status) query.status = status;
    if (month) query.month = month;
    
    const rosters = await MonthlyRoster.find(query)
      .populate('facility', 'name code')
      .populate('createdBy', 'firstName lastName')
      .populate('publishedBy', 'firstName lastName')
      .populate('assignments.employee', 'firstName lastName employeeId staffId')
      .populate('assignments.shift', 'name code startTime endTime')
      .sort({ effectiveFrom: -1 });
    
    res.json({
      success: true,
      count: rosters.length,
      data: rosters
    });
  } catch (error) {
    console.error('Error fetching rosters:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rosters',
      error: error.message
    });
  }
};

/**
 * @desc    Get single roster by ID
 * @route   GET /api/rosters/:id
 * @access  Private (Admin)
 */
exports.getRoster = async (req, res) => {
  try {
    const roster = await MonthlyRoster.findById(req.params.id)
      .populate('facility', 'name code')
      .populate('createdBy', 'firstName lastName')
      .populate('publishedBy', 'firstName lastName')
      .populate('assignments.employee', 'firstName lastName employeeId staffId department designation')
      .populate('assignments.shift', 'name code startTime endTime workingHours');
    
    if (!roster) {
      return res.status(404).json({
        success: false,
        message: 'Roster not found'
      });
    }
    
    res.json({
      success: true,
      data: roster
    });
  } catch (error) {
    console.error('Error fetching roster:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roster',
      error: error.message
    });
  }
};

/**
 * @desc    Get active roster for a facility
 * @route   GET /api/rosters/active/:facilityId
 * @access  Private
 */
exports.getActiveRoster = async (req, res) => {
  try {
    const roster = await MonthlyRoster.getActiveRoster(
      req.params.facilityId,
      new Date()
    );
    
    if (!roster) {
      return res.json({
        success: true,
        data: null,
        message: 'No active roster found for this facility'
      });
    }
    
    res.json({
      success: true,
      data: roster
    });
  } catch (error) {
    console.error('Error fetching active roster:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active roster',
      error: error.message
    });
  }
};

/**
 * @desc    Create new roster
 * @route   POST /api/rosters
 * @access  Private (Admin)
 */
exports.createRoster = async (req, res) => {
  try {
    const { facility, month, name, notes, copyFromPrevious } = req.body;
    
    // Validate month format (YYYY-MM)
    if (!moment(month, 'YYYY-MM', true).isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Use YYYY-MM'
      });
    }
    
    // Check if roster already exists for this facility and month
    const existingRoster = await MonthlyRoster.findOne({ facility, month });
    if (existingRoster) {
      return res.status(409).json({
        success: false,
        message: 'Roster already exists for this facility and month'
      });
    }
    
    // Calculate effective dates
    const effectiveFrom = moment(month, 'YYYY-MM').startOf('month').toDate();
    const effectiveTo = moment(month, 'YYYY-MM').endOf('month').toDate();
    
    const rosterData = {
      facility,
      month,
      name: name || `${moment(month).format('MMMM YYYY')} Schedule`,
      effectiveFrom,
      effectiveTo,
      notes,
      createdBy: req.user._id,
      assignments: []
    };
    
    // If copying from previous month
    if (copyFromPrevious) {
      const prevMonth = moment(month, 'YYYY-MM').subtract(1, 'month').format('YYYY-MM');
      const prevRoster = await MonthlyRoster.findOne({
        facility,
        month: prevMonth,
        status: 'published'
      });
      
      if (prevRoster) {
        rosterData.assignments = prevRoster.assignments.map(a => ({
          employee: a.employee,
          shift: a.shift,
          notes: a.notes
        }));
      }
    }
    
    const roster = await MonthlyRoster.create(rosterData);
    
    await roster.populate([
      { path: 'facility', select: 'name code' },
      { path: 'createdBy', select: 'firstName lastName' },
      { path: 'assignments.employee', select: 'firstName lastName employeeId' },
      { path: 'assignments.shift', select: 'name code startTime endTime' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Roster created successfully',
      data: roster
    });
  } catch (error) {
    console.error('Error creating roster:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create roster',
      error: error.message
    });
  }
};

/**
 * @desc    Update roster
 * @route   PUT /api/rosters/:id
 * @access  Private (Admin)
 */
exports.updateRoster = async (req, res) => {
  try {
    const roster = await MonthlyRoster.findById(req.params.id);
    
    if (!roster) {
      return res.status(404).json({
        success: false,
        message: 'Roster not found'
      });
    }
    
    // Can't update published rosters
    if (roster.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update published roster. Create a new one or unpublish first.'
      });
    }
    
    const { name, notes, assignments } = req.body;
    
    if (name) roster.name = name;
    if (notes !== undefined) roster.notes = notes;
    if (assignments) roster.assignments = assignments;
    
    roster.metadata.lastModifiedBy = req.user._id;
    roster.metadata.lastModifiedAt = new Date();
    
    await roster.save();
    
    await roster.populate([
      { path: 'facility', select: 'name code' },
      { path: 'createdBy', select: 'firstName lastName' },
      { path: 'assignments.employee', select: 'firstName lastName employeeId' },
      { path: 'assignments.shift', select: 'name code startTime endTime' }
    ]);
    
    res.json({
      success: true,
      message: 'Roster updated successfully',
      data: roster
    });
  } catch (error) {
    console.error('Error updating roster:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update roster',
      error: error.message
    });
  }
};

/**
 * @desc    Add employee to roster
 * @route   POST /api/rosters/:id/assign
 * @access  Private (Admin)
 */
exports.assignEmployeeToRoster = async (req, res) => {
  try {
    const roster = await MonthlyRoster.findById(req.params.id);
    
    if (!roster) {
      return res.status(404).json({
        success: false,
        message: 'Roster not found'
      });
    }
    
    // Allow editing published rosters (removed restriction)
    
    const { employeeId, shiftId, notes } = req.body;
    
    // Check if employee already assigned
    const existingIndex = roster.assignments.findIndex(
      a => a.employee.toString() === employeeId
    );
    
    if (existingIndex !== -1) {
      // Update existing assignment
      roster.assignments[existingIndex] = {
        employee: employeeId,
        shift: shiftId,
        notes,
        assignedAt: new Date()
      };
    } else {
      // Add new assignment
      roster.assignments.push({
        employee: employeeId,
        shift: shiftId,
        notes,
        assignedAt: new Date()
      });
    }
    
    roster.metadata.lastModifiedBy = req.user._id;
    await roster.save();
    
    // If roster is published, re-publish to update employee shift
    const wasPublished = roster.status === 'published';
    if (wasPublished) {
      await roster.publish(req.user._id);
    }
    
    await roster.populate('assignments.employee assignments.shift');
    
    res.json({
      success: true,
      message: wasPublished 
        ? 'Employee assigned to roster and shift updated successfully' 
        : 'Employee assigned to roster successfully',
      data: roster
    });
  } catch (error) {
    console.error('Error assigning employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign employee',
      error: error.message
    });
  }
};

/**
 * @desc    Bulk assign employees to roster
 * @route   POST /api/rosters/:id/bulk-assign
 * @access  Private (Admin)
 */
exports.bulkAssignEmployees = async (req, res) => {
  try {
    const roster = await MonthlyRoster.findById(req.params.id);
    
    if (!roster) {
      return res.status(404).json({
        success: false,
        message: 'Roster not found'
      });
    }
    
    // Allow editing published rosters (removed restriction)
    // Published rosters can be modified to add/remove employees
    
    const { assignments } = req.body; // Array of { employeeId, shiftId, notes }
    
    for (const assignment of assignments) {
      const existingIndex = roster.assignments.findIndex(
        a => a.employee.toString() === assignment.employeeId
      );
      
      if (existingIndex !== -1) {
        roster.assignments[existingIndex] = {
          employee: assignment.employeeId,
          shift: assignment.shiftId,
          notes: assignment.notes,
          assignedAt: new Date()
        };
      } else {
        roster.assignments.push({
          employee: assignment.employeeId,
          shift: assignment.shiftId,
          notes: assignment.notes,
          assignedAt: new Date()
        });
      }
    }
    
    roster.metadata.lastModifiedBy = req.user._id;
    await roster.save();
    
    // If roster is already published, automatically re-publish to update employee shifts
    const wasPublished = roster.status === 'published';
    if (wasPublished) {
      await roster.publish(req.user._id);
      // Update shift assignment records
      await ShiftAssignment.createFromRoster(roster, req.user._id);
    }
    
    await roster.populate([
      { path: 'facility', select: 'name code' },
      { path: 'assignments.employee', select: 'firstName lastName employeeId' },
      { path: 'assignments.shift', select: 'name code startTime endTime' }
    ]);
    
    res.json({
      success: true,
      message: wasPublished 
        ? `${assignments.length} employees assigned and shifts updated successfully` 
        : `${assignments.length} employees assigned successfully`,
      data: roster
    });
  } catch (error) {
    console.error('Error bulk assigning employees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk assign employees',
      error: error.message
    });
  }
};

/**
 * @desc    Remove employee from roster
 * @route   DELETE /api/rosters/:id/assign/:employeeId
 * @access  Private (Admin)
 */
exports.removeEmployeeFromRoster = async (req, res) => {
  try {
    const roster = await MonthlyRoster.findById(req.params.id);
    
    if (!roster) {
      return res.status(404).json({
        success: false,
        message: 'Roster not found'
      });
    }
    
    // Allow editing published rosters (removed restriction)
    
    roster.assignments = roster.assignments.filter(
      a => a.employee.toString() !== req.params.employeeId
    );
    
    roster.metadata.lastModifiedBy = req.user._id;
    await roster.save();
    
    // If roster is published, re-publish to ensure shifts are updated
    const wasPublished = roster.status === 'published';
    if (wasPublished) {
      await roster.publish(req.user._id);
    }
    
    res.json({
      success: true,
      message: wasPublished 
        ? 'Employee removed from roster and shifts updated' 
        : 'Employee removed from roster',
      data: roster
    });
  } catch (error) {
    console.error('Error removing employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove employee',
      error: error.message
    });
  }
};

/**
 * @desc    Publish roster
 * @route   POST /api/rosters/:id/publish
 * @access  Private (Admin)
 */
exports.publishRoster = async (req, res) => {
  try {
    const roster = await MonthlyRoster.findById(req.params.id);
    
    if (!roster) {
      return res.status(404).json({
        success: false,
        message: 'Roster not found'
      });
    }
    
    if (roster.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Roster is already published'
      });
    }
    
    if (roster.assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish empty roster. Add employees first.'
      });
    }
    
    // Publish roster and update employee shifts
    await roster.publish(req.user._id);
    
    // Create shift assignment records for audit trail
    await ShiftAssignment.createFromRoster(roster, req.user._id);
    
    await roster.populate([
      { path: 'facility', select: 'name code' },
      { path: 'assignments.employee', select: 'firstName lastName employeeId' },
      { path: 'assignments.shift', select: 'name code startTime endTime' }
    ]);
    
    res.json({
      success: true,
      message: 'Roster published successfully. Employee shifts have been updated.',
      data: roster
    });
  } catch (error) {
    console.error('Error publishing roster:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish roster',
      error: error.message
    });
  }
};

/**
 * @desc    Unpublish roster (revert to draft)
 * @route   POST /api/rosters/:id/unpublish
 * @access  Private (Admin)
 */
exports.unpublishRoster = async (req, res) => {
  try {
    const roster = await MonthlyRoster.findById(req.params.id);
    
    if (!roster) {
      return res.status(404).json({
        success: false,
        message: 'Roster not found'
      });
    }
    
    if (roster.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Roster is not published'
      });
    }
    
    // Check if roster period has already started
    if (new Date() >= roster.effectiveFrom) {
      return res.status(400).json({
        success: false,
        message: 'Cannot unpublish roster after it has taken effect'
      });
    }
    
    roster.status = 'draft';
    roster.publishedBy = null;
    roster.publishedAt = null;
    await roster.save();
    
    res.json({
      success: true,
      message: 'Roster unpublished. Changed to draft status.',
      data: roster
    });
  } catch (error) {
    console.error('Error unpublishing roster:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unpublish roster',
      error: error.message
    });
  }
};

/**
 * @desc    Archive roster
 * @route   POST /api/rosters/:id/archive
 * @access  Private (Admin)
 */
exports.archiveRoster = async (req, res) => {
  try {
    const roster = await MonthlyRoster.findById(req.params.id);
    
    if (!roster) {
      return res.status(404).json({
        success: false,
        message: 'Roster not found'
      });
    }
    
    await roster.archive();
    
    res.json({
      success: true,
      message: 'Roster archived successfully',
      data: roster
    });
  } catch (error) {
    console.error('Error archiving roster:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive roster',
      error: error.message
    });
  }
};

/**
 * @desc    Delete roster
 * @route   DELETE /api/rosters/:id
 * @access  Private (Admin)
 */
exports.deleteRoster = async (req, res) => {
  try {
    const roster = await MonthlyRoster.findById(req.params.id);
    
    if (!roster) {
      return res.status(404).json({
        success: false,
        message: 'Roster not found'
      });
    }
    
    // Can only delete draft rosters
    if (roster.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete draft rosters. Archive published rosters instead.'
      });
    }
    
    await roster.deleteOne();
    
    res.json({
      success: true,
      message: 'Roster deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting roster:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete roster',
      error: error.message
    });
  }
};

/**
 * @desc    Get employee's shift assignment history
 * @route   GET /api/rosters/assignments/employee/:employeeId
 * @access  Private
 */
exports.getEmployeeAssignmentHistory = async (req, res) => {
  try {
    const history = await ShiftAssignment.getEmployeeHistory(
      req.params.employeeId,
      20
    );
    
    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error('Error fetching assignment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignment history',
      error: error.message
    });
  }
};

/**
 * @desc    Get employee's current shift assignment
 * @route   GET /api/rosters/assignments/current/:employeeId
 * @access  Private
 */
exports.getEmployeeCurrentAssignment = async (req, res) => {
  try {
    const assignment = await ShiftAssignment.getActiveAssignment(
      req.params.employeeId
    );
    
    if (!assignment) {
      // Fallback to employee's shift field
      const employee = await Employee.findById(req.params.employeeId)
        .populate('shift facility');
      
      return res.json({
        success: true,
        data: employee?.shift ? {
          shift: employee.shift,
          facility: employee.facility,
          source: 'employee-record'
        } : null
      });
    }
    
    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Error fetching current assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current assignment',
      error: error.message
    });
  }
};

module.exports = exports;
