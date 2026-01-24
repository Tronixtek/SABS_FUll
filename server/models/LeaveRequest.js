const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true
  },
  
  // Leave/Excuse Details
  leaveType: {
    type: String,
    required: true,
    enum: [
      'annual',              // Annual leave (GL 1-3: 14 days, GL 4-6: 21 days, GL 7+: 30 days)
      'maternity',           // Maternity leave (12 weeks)
      'adoptive',            // Adoptive leave (16 weeks)
      'examination',         // Examination leave (Open)
      'takaba',              // Takaba leave (16 weeks)
      'sabbatical',          // Sabbatical leave (12 months)
      'study',               // Study leave (Open)
      'religious',           // Religious leave (Open)
      'casual',              // Casual leave (Open)
      'absence',             // Leave of absence (Open)
      'official-assignment'  // Official assignment - urgent, 24hr approval required
    ],
    index: true
  },
  
  // Timing Information
  requestDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  affectedDate: {
    type: Date,
    index: true
  },
  // For multi-day leave
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  // For time-based/partial day
  date: {
    type: Date
  },
  startTime: {
    type: String  // Time string like "09:00" or "14:30"
  },
  endTime: {
    type: String  // Time string like "17:00" or "18:00"
  },
  duration: {
    type: Number // Duration in minutes or days depending on leave type
  },
  
  // Request Details
  reason: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Auto-approval rules for urgent leaves
  requiresUrgentApproval: {
    type: Boolean,
    default: false  // True for official-assignment (must be approved within 24 hours)
  },
  
  // Approval Workflow
  status: {
    type: String,
    enum: [
      'pending',           // Awaiting approval
      'approved',          // Approved by supervisor
      'rejected',          // Rejected
      'cancelled',         // Cancelled by employee
      'expired'            // Request expired (24hr rule for official-assignment)
    ],
    default: 'pending',
    index: true
  },
  
  // Approval Details
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'  // References User (staff) not Employee
  },
  approvedAt: Date,
  rejectionReason: String,
  
  // Supporting Information
  attachments: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Manager/HR Notes
  managerNotes: String,
  hrNotes: String,
  
  // Leave Balance Tracking
  balanceDeduction: {
    type: Number,
    default: 0  // Days deducted from leave balance
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
leaveRequestSchema.index({ employee: 1, startDate: -1 });
leaveRequestSchema.index({ facility: 1, status: 1, startDate: -1 });
leaveRequestSchema.index({ leaveType: 1, status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1, status: 1 });

// Pre-save middleware to set flags and calculate duration
leaveRequestSchema.pre('save', function(next) {
  // Calculate duration in days if not set
  if (this.startDate && this.endDate && !this.duration) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end - start);
    this.duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
  }
  
  // Set urgent approval flag for official assignments
  if (this.leaveType === 'official-assignment') {
    this.requiresUrgentApproval = true;
  }
  
  // Calculate balance deduction for leave types with limits
  if (this.status === 'approved' && this.duration) {
    const leaveTypesWithLimits = ['annual', 'maternity', 'adoptive', 'takaba', 'sabbatical'];
    if (leaveTypesWithLimits.includes(this.leaveType)) {
      this.balanceDeduction = this.duration;
    }
  }
  
  next();
});

// Static method to check if employee has approved leave for a date
leaveRequestSchema.statics.hasApprovedLeave = async function(employeeId, date) {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  const query = {
    employee: employeeId,
    startDate: { $lte: checkDate },
    endDate: { $gte: checkDate },
    status: 'approved'
  };
  
  return await this.findOne(query);
};

// Static method to calculate leave balance for employee
leaveRequestSchema.statics.calculateLeaveBalance = async function(employeeId, leaveType, year = new Date().getFullYear()) {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  
  const approvedLeaves = await this.find({
    employee: employeeId,
    leaveType: leaveType,
    status: 'approved',
    startDate: { $gte: startOfYear, $lte: endOfYear }
  });
  
  const totalUsed = approvedLeaves.reduce((sum, leave) => sum + (leave.duration || 0), 0);
  return totalUsed;
};

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);