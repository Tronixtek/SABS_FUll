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
  type: {
    type: String,
    required: true,
    enum: [
      // Full Leave Types
      'annual',              // Annual leave
      'sick',                // Sick leave
      'emergency',           // Emergency leave
      'maternity',           // Maternity leave
      'paternity',           // Paternity leave
      'bereavement',         // Bereavement leave
      'study',               // Study leave
      'unpaid',              // Unpaid leave
      // Partial Day/Excuse Types
      'early-departure',     // Need to leave early
      'late-arrival',        // Will arrive late
      'partial-day',         // Few hours off
      'emergency-exit',      // Already left due to emergency
      'flexible-time',       // Pre-approved flexible schedule
      'medical-leave',       // Medical appointment
      'official-duty'        // Official meeting/work
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
  category: {
    type: String,
    enum: [
      'medical',
      'family-emergency',
      'official-meeting',
      'personal',
      'traffic-delay',
      'public-transport',
      'technical-issue',
      'other'
    ],
    required: true
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },
  
  // Approval Workflow
  status: {
    type: String,
    enum: [
      'pending',           // Awaiting approval
      'approved',          // Approved by supervisor
      'auto-approved',     // Auto-approved (emergency/flexible)
      'rejected',          // Rejected
      'expired'            // Request expired
    ],
    default: 'pending',
    index: true
  },
  
  // Auto-approval rules
  isEmergency: {
    type: Boolean,
    default: false
  },
  isRetroactive: {
    type: Boolean,
    default: false  // Request made after the fact
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
  
  // Integration with Attendance
  attendanceImpact: {
    affectsAttendance: { type: Boolean, default: true },
    adjustmentType: {
      type: String,
      enum: ['excuse', 'deduction', 'neutral'],
      default: 'excuse'
    },
    adjustedWorkHours: Number // How many hours to adjust
  },
  
  // Notification Settings
  notifications: {
    employeeNotified: { type: Boolean, default: false },
    managerNotified: { type: Boolean, default: false },
    hrNotified: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
leaveRequestSchema.index({ employee: 1, affectedDate: -1 });
leaveRequestSchema.index({ facility: 1, status: 1, affectedDate: -1 });
leaveRequestSchema.index({ type: 1, status: 1 });
leaveRequestSchema.index({ affectedDate: 1, status: 1 });

// Virtual for calculating impact on attendance
leaveRequestSchema.virtual('attendanceAdjustment').get(function() {
  if (!this.attendanceImpact.affectsAttendance) return 0;
  
  const hours = this.duration / 60;
  switch (this.attendanceImpact.adjustmentType) {
    case 'excuse': return hours; // Full excuse - no deduction
    case 'deduction': return -hours; // Deduct from work hours
    case 'neutral': return 0; // No impact
    default: return 0;
  }
});

// Pre-save middleware to calculate duration and set auto-approval
leaveRequestSchema.pre('save', function(next) {
  // Calculate duration if not set
  if (this.startTime && this.endTime && !this.duration) {
    this.duration = Math.abs(new Date(this.endTime) - new Date(this.startTime)) / (1000 * 60);
  }
  
  // Auto-approve emergency requests
  if (this.isEmergency || this.urgency === 'emergency') {
    this.status = 'auto-approved';
    this.approvedAt = new Date();
  }
  
  // Auto-approve retrospective emergency exits
  if (this.type === 'emergency-exit' && this.isRetroactive) {
    this.status = 'auto-approved';
    this.approvedAt = new Date();
  }
  
  next();
});

// Static method to check if employee has valid excuse for time period
leaveRequestSchema.statics.hasValidExcuse = async function(employeeId, date, timeType = null) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const query = {
    employeeId: employeeId,
    affectedDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['approved', 'auto-approved'] }
  };
  
  // Filter by time type if specified
  if (timeType === 'late-arrival') {
    query.type = { $in: ['late-arrival', 'partial-day', 'flexible-time'] };
  } else if (timeType === 'early-departure') {
    query.type = { $in: ['early-departure', 'partial-day', 'emergency-exit', 'flexible-time'] };
  }
  
  return await this.findOne(query);
};

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);