const mongoose = require('mongoose');

const leavePolicySchema = new mongoose.Schema({
  leaveType: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'annual',
      'maternity',
      'adoptive',
      'examination',
      'takaba',
      'sabbatical',
      'study',
      'religious',
      'casual',
      'absence',
      'official-assignment'
    ]
  },
  
  // Display Information
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Financial Policy
  isPaid: {
    type: Boolean,
    default: true,
    description: 'Whether this leave type is paid (full salary) or unpaid'
  },
  salaryPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 100,
    description: 'Percentage of salary paid during leave (100 = full pay, 50 = half pay, 0 = unpaid)'
  },
  
  // Balance Management
  hasBalanceLimit: {
    type: Boolean,
    default: false,
    description: 'Whether this leave type has a maximum days limit'
  },
  maxDaysPerYear: {
    type: Number,
    min: 0,
    description: 'Maximum days allowed per year (0 = unlimited)'
  },
  maxDaysLifetime: {
    type: Number,
    min: 0,
    description: 'Maximum days allowed in lifetime (for special leaves like maternity)'
  },
  balanceResetAnnually: {
    type: Boolean,
    default: true,
    description: 'Whether balance resets on January 1st each year'
  },
  
  // Approval Requirements
  requiresApproval: {
    type: Boolean,
    default: true,
    description: 'Whether this leave requires approval'
  },
  requiresManagerApproval: {
    type: Boolean,
    default: true
  },
  requiresHRApproval: {
    type: Boolean,
    default: false
  },
  requiresUrgentApproval: {
    type: Boolean,
    default: false,
    description: 'Whether this leave must be approved same day (e.g., official assignment)'
  },
  urgentApprovalDeadlineHours: {
    type: Number,
    default: 24,
    description: 'Hours within which urgent approval must be granted'
  },
  
  // Documentation Requirements
  requiresDocumentation: {
    type: Boolean,
    default: false,
    description: 'Whether supporting documents are required'
  },
  requiredDocuments: [{
    type: String,
    description: 'List of required document types (e.g., medical certificate, official letter)'
  }],
  
  // Notice Period
  minimumNoticeDays: {
    type: Number,
    default: 0,
    description: 'Minimum days notice required before leave starts'
  },
  allowRetroactive: {
    type: Boolean,
    default: false,
    description: 'Whether leave can be applied for past dates'
  },
  
  // Duration Constraints
  minDaysPerRequest: {
    type: Number,
    default: 1,
    description: 'Minimum days that can be requested at once'
  },
  maxDaysPerRequest: {
    type: Number,
    default: 0,
    description: 'Maximum days per single request (0 = no limit)'
  },
  
  // Active Status
  isActive: {
    type: Boolean,
    default: true,
    description: 'Whether this leave type is currently available for employees'
  },
  
  // Facility Override
  facilityOverrides: [{
    facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility'
    },
    isPaid: Boolean,
    salaryPercentage: Number,
    maxDaysPerYear: Number,
    requiresHRApproval: Boolean
  }],
  
  // Grade Level Specific Rules (for annual leave)
  gradeLevelRules: [{
    minGradeLevel: Number,
    maxGradeLevel: Number,
    maxDaysPerYear: Number,
    salaryPercentage: Number
  }],
  
  // Audit Trail
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: 'User who last updated this policy'
  },
  policyVersion: {
    type: Number,
    default: 1,
    description: 'Version number for tracking policy changes'
  },
  effectiveDate: {
    type: Date,
    default: Date.now,
    description: 'Date when this policy version becomes effective'
  },
  notes: {
    type: String,
    description: 'Admin notes about policy changes or special considerations'
  }
}, {
  timestamps: true
});

// Index for quick lookups
leavePolicySchema.index({ leaveType: 1, isActive: 1 });
leavePolicySchema.index({ effectiveDate: -1 });

// Static method to get active policy for a leave type
leavePolicySchema.statics.getActivePolicy = async function(leaveType, facilityId = null) {
  const policy = await this.findOne({ 
    leaveType: leaveType, 
    isActive: true 
  });
  
  if (!policy) {
    throw new Error(`No active policy found for leave type: ${leaveType}`);
  }
  
  // Check for facility-specific overrides
  if (facilityId && policy.facilityOverrides.length > 0) {
    const override = policy.facilityOverrides.find(
      o => o.facility.toString() === facilityId.toString()
    );
    
    if (override) {
      // Merge override with base policy
      return {
        ...policy.toObject(),
        isPaid: override.isPaid !== undefined ? override.isPaid : policy.isPaid,
        salaryPercentage: override.salaryPercentage !== undefined ? override.salaryPercentage : policy.salaryPercentage,
        maxDaysPerYear: override.maxDaysPerYear !== undefined ? override.maxDaysPerYear : policy.maxDaysPerYear,
        requiresHRApproval: override.requiresHRApproval !== undefined ? override.requiresHRApproval : policy.requiresHRApproval,
        _isFacilityOverride: true,
        _facilityId: facilityId
      };
    }
  }
  
  // Return as plain object to ensure all fields are included
  return policy.toObject();
};

// Static method to get policy for specific grade level
leavePolicySchema.statics.getPolicyForGradeLevel = async function(leaveType, gradeLevel, facilityId = null) {
  const policy = await this.getActivePolicy(leaveType, facilityId);
  
  if (!policy) return null;
  
  // policy is already a plain object from getActivePolicy
  // Check for grade level specific rules
  if (policy.gradeLevelRules && policy.gradeLevelRules.length > 0) {
    const gl = parseInt(gradeLevel);
    const rule = policy.gradeLevelRules.find(
      r => gl >= r.minGradeLevel && gl <= r.maxGradeLevel
    );
    
    if (rule) {
      return {
        ...policy,
        maxDaysPerYear: rule.maxDaysPerYear !== undefined ? rule.maxDaysPerYear : policy.maxDaysPerYear,
        salaryPercentage: rule.salaryPercentage !== undefined ? rule.salaryPercentage : policy.salaryPercentage,
        isPaid: rule.salaryPercentage !== undefined ? (rule.salaryPercentage > 0) : policy.isPaid,
        _isGradeLevelOverride: true,
        _gradeLevel: gradeLevel
      };
    }
  }
  
  return policy;
};

// Method to increment version before policy updates
leavePolicySchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.policyVersion += 1;
  }
  next();
});

module.exports = mongoose.model('LeavePolicy', leavePolicySchema);
