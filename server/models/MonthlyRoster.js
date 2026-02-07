const mongoose = require('mongoose');

const monthlyRosterSchema = new mongoose.Schema({
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true
  },
  month: {
    type: String, // Format: "2026-02" (YYYY-MM)
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
    // e.g., "February 2026 Schedule"
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  effectiveFrom: {
    type: Date,
    required: true
    // First day of the month
  },
  effectiveTo: {
    type: Date,
    required: true
    // Last day of the month
  },
  assignments: [{
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
    notes: {
      type: String,
      trim: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  publishedAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  metadata: {
    totalEmployees: {
      type: Number,
      default: 0
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastModifiedAt: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
monthlyRosterSchema.index({ facility: 1, month: 1 }, { unique: true });
monthlyRosterSchema.index({ facility: 1, status: 1 });
monthlyRosterSchema.index({ effectiveFrom: 1, effectiveTo: 1 });
monthlyRosterSchema.index({ 'assignments.employee': 1 });

// Virtual for checking if roster is active
monthlyRosterSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'published' && 
         now >= this.effectiveFrom && 
         now <= this.effectiveTo;
});

// Method to get employee's shift from this roster
monthlyRosterSchema.methods.getEmployeeShift = function(employeeId) {
  const assignment = this.assignments.find(
    a => a.employee.toString() === employeeId.toString()
  );
  return assignment ? assignment.shift : null;
};

// Method to publish roster
monthlyRosterSchema.methods.publish = async function(userId) {
  this.status = 'published';
  this.publishedBy = userId;
  this.publishedAt = new Date();
  
  // Update all employees' current shift field
  const Employee = mongoose.model('Employee');
  for (const assignment of this.assignments) {
    await Employee.findByIdAndUpdate(
      assignment.employee,
      { shift: assignment.shift }
    );
  }
  
  await this.save();
  return this;
};

// Method to archive roster
monthlyRosterSchema.methods.archive = async function() {
  this.status = 'archived';
  await this.save();
  return this;
};

// Static method to get active roster for a facility on a specific date
monthlyRosterSchema.statics.getActiveRoster = async function(facilityId, date) {
  return await this.findOne({
    facility: facilityId,
    status: 'published',
    effectiveFrom: { $lte: date },
    effectiveTo: { $gte: date }
  }).populate('assignments.employee assignments.shift');
};

// Static method to get employee's shift for a specific date
monthlyRosterSchema.statics.getEmployeeShiftForDate = async function(employeeId, date) {
  const Employee = mongoose.model('Employee');
  const employee = await Employee.findById(employeeId).select('facility');
  
  if (!employee) return null;
  
  const roster = await this.findOne({
    facility: employee.facility,
    status: 'published',
    effectiveFrom: { $lte: date },
    effectiveTo: { $gte: date },
    'assignments.employee': employeeId
  }).populate('assignments.shift');
  
  if (!roster) {
    // Fallback to employee's current shift if no roster found
    const emp = await Employee.findById(employeeId).populate('shift');
    return emp?.shift || null;
  }
  
  const assignment = roster.assignments.find(
    a => a.employee.toString() === employeeId.toString()
  );
  
  return assignment?.shift || null;
};

// Pre-save middleware to update metadata
monthlyRosterSchema.pre('save', function(next) {
  if (this.isModified('assignments')) {
    this.metadata.totalEmployees = this.assignments.length;
    this.metadata.lastModifiedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('MonthlyRoster', monthlyRosterSchema);
