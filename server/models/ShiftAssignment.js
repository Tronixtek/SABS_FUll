const mongoose = require('mongoose');

const shiftAssignmentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    required: true
  },
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true
  },
  effectiveFrom: {
    type: Date,
    required: true
  },
  effectiveTo: {
    type: Date,
    // null means current/ongoing assignment
    default: null
  },
  assignmentType: {
    type: String,
    enum: ['permanent', 'temporary', 'roster-based'],
    default: 'roster-based'
  },
  roster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MonthlyRoster'
    // Link to roster if this came from monthly roster
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  replacedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShiftAssignment'
    // Links to the assignment that replaced this one
  }
}, {
  timestamps: true
});

// Indexes
shiftAssignmentSchema.index({ employee: 1, effectiveFrom: -1 });
shiftAssignmentSchema.index({ employee: 1, isActive: 1 });
shiftAssignmentSchema.index({ facility: 1, effectiveFrom: 1, effectiveTo: 1 });
shiftAssignmentSchema.index({ shift: 1, effectiveFrom: 1 });

// Virtual to check if assignment is currently active
shiftAssignmentSchema.virtual('isCurrent').get(function() {
  const now = new Date();
  return this.isActive && 
         this.effectiveFrom <= now && 
         (!this.effectiveTo || this.effectiveTo >= now);
});

// Method to end this assignment
shiftAssignmentSchema.methods.endAssignment = async function(endDate, replacementId) {
  this.effectiveTo = endDate || new Date();
  this.isActive = false;
  if (replacementId) {
    this.replacedBy = replacementId;
  }
  await this.save();
  return this;
};

// Static method to get employee's active assignment
shiftAssignmentSchema.statics.getActiveAssignment = async function(employeeId) {
  const now = new Date();
  return await this.findOne({
    employee: employeeId,
    isActive: true,
    effectiveFrom: { $lte: now },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $gte: now } }
    ]
  }).populate('shift facility');
};

// Static method to get assignment history for an employee
shiftAssignmentSchema.statics.getEmployeeHistory = async function(employeeId, limit = 10) {
  return await this.find({
    employee: employeeId
  })
  .populate('shift facility assignedBy')
  .sort({ effectiveFrom: -1 })
  .limit(limit);
};

// Static method to get shift for a specific date
shiftAssignmentSchema.statics.getShiftForDate = async function(employeeId, date) {
  const assignment = await this.findOne({
    employee: employeeId,
    effectiveFrom: { $lte: date },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $gte: date } }
    ]
  }).populate('shift');
  
  return assignment?.shift || null;
};

// Static method to create assignment from roster
shiftAssignmentSchema.statics.createFromRoster = async function(roster, userId) {
  const assignments = [];
  
  for (const assignment of roster.assignments) {
    const record = await this.create({
      employee: assignment.employee,
      shift: assignment.shift,
      facility: roster.facility,
      effectiveFrom: roster.effectiveFrom,
      effectiveTo: roster.effectiveTo,
      assignmentType: 'roster-based',
      roster: roster._id,
      assignedBy: userId,
      reason: `Monthly roster: ${roster.name}`,
      notes: assignment.notes
    });
    assignments.push(record);
  }
  
  return assignments;
};

module.exports = mongoose.model('ShiftAssignment', shiftAssignmentSchema);
