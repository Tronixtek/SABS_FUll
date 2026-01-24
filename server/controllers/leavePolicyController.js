const LeavePolicy = require('../models/LeavePolicy');

// Get all active leave policies
const getAllPolicies = async (req, res) => {
  try {
    const policies = await LeavePolicy.find({ isActive: true })
      .sort({ leaveType: 1 });

    res.json({
      success: true,
      data: { policies }
    });
  } catch (error) {
    console.error('Error fetching leave policies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave policies',
      error: error.message
    });
  }
};

// Get specific leave policy
const getPolicy = async (req, res) => {
  try {
    const { leaveType } = req.params;
    const { facilityId, gradeLevel } = req.query;

    let policy;
    
    if (gradeLevel) {
      policy = await LeavePolicy.getPolicyForGradeLevel(leaveType, gradeLevel, facilityId);
    } else {
      policy = await LeavePolicy.getActivePolicy(leaveType, facilityId);
    }

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found for this leave type'
      });
    }

    res.json({
      success: true,
      data: { policy }
    });
  } catch (error) {
    console.error('Error fetching leave policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave policy',
      error: error.message
    });
  }
};

// Create new leave policy (Admin only)
const createPolicy = async (req, res) => {
  try {
    const {
      leaveType,
      displayName,
      description,
      isPaid,
      salaryPercentage,
      hasBalanceLimit,
      maxDaysPerYear,
      minimumNoticeDays,
      maxDaysPerRequest,
      requiresDocumentation,
      requiredDocuments,
      requiresUrgentApproval,
      allowRetroactive
    } = req.body;

    // Check if policy already exists
    const existing = await LeavePolicy.findOne({ leaveType });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Policy for ${leaveType} already exists`
      });
    }

    // Create new policy
    const policy = new LeavePolicy({
      leaveType,
      displayName,
      description,
      isPaid: isPaid !== undefined ? isPaid : true,
      salaryPercentage: salaryPercentage !== undefined ? salaryPercentage : 100,
      hasBalanceLimit: hasBalanceLimit || false,
      maxDaysPerYear: maxDaysPerYear || 0,
      minimumNoticeDays: minimumNoticeDays || 0,
      maxDaysPerRequest: maxDaysPerRequest || 0,
      requiresDocumentation: requiresDocumentation || false,
      requiredDocuments: requiredDocuments || [],
      requiresUrgentApproval: requiresUrgentApproval || false,
      allowRetroactive: allowRetroactive || false,
      isActive: true,
      createdBy: req.user.id,
      lastUpdatedBy: req.user.id
    });

    await policy.save();

    res.status(201).json({
      success: true,
      message: `Leave policy for ${displayName} created successfully`,
      data: { policy }
    });
  } catch (error) {
    console.error('Error creating leave policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create leave policy',
      error: error.message
    });
  }
};

// Update leave policy (Admin only)
const updatePolicy = async (req, res) => {
  try {
    const { leaveType } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.leaveType;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.policyVersion;

    // Set who updated the policy
    updates.lastUpdatedBy = req.user.id;

    const policy = await LeavePolicy.findOneAndUpdate(
      { leaveType },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    res.json({
      success: true,
      message: `Leave policy for ${leaveType} updated successfully`,
      data: { policy }
    });
  } catch (error) {
    console.error('Error updating leave policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave policy',
      error: error.message
    });
  }
};

// Add facility-specific override (Admin only)
const addFacilityOverride = async (req, res) => {
  try {
    const { leaveType } = req.params;
    const { facilityId, isPaid, salaryPercentage, maxDaysPerYear, requiresHRApproval } = req.body;

    const policy = await LeavePolicy.findOne({ leaveType });
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    // Check if override already exists for this facility
    const existingIndex = policy.facilityOverrides.findIndex(
      o => o.facility.toString() === facilityId.toString()
    );

    const override = {
      facility: facilityId,
      isPaid,
      salaryPercentage,
      maxDaysPerYear,
      requiresHRApproval
    };

    if (existingIndex >= 0) {
      policy.facilityOverrides[existingIndex] = override;
    } else {
      policy.facilityOverrides.push(override);
    }

    policy.lastUpdatedBy = req.user.id;
    await policy.save();

    res.json({
      success: true,
      message: 'Facility override added successfully',
      data: { policy }
    });
  } catch (error) {
    console.error('Error adding facility override:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add facility override',
      error: error.message
    });
  }
};

// Get policy history/audit trail (Admin only)
const getPolicyHistory = async (req, res) => {
  try {
    const { leaveType } = req.params;

    // In a production system, you'd want to maintain a separate PolicyHistory collection
    // For now, we'll just return the current policy with version info
    const policy = await LeavePolicy.findOne({ leaveType })
      .populate('lastUpdatedBy', 'firstName lastName email');

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    res.json({
      success: true,
      data: {
        leaveType: policy.leaveType,
        currentVersion: policy.policyVersion,
        effectiveDate: policy.effectiveDate,
        lastUpdatedBy: policy.lastUpdatedBy,
        lastUpdatedAt: policy.updatedAt,
        notes: policy.notes
      }
    });
  } catch (error) {
    console.error('Error fetching policy history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch policy history',
      error: error.message
    });
  }
};

// Calculate leave entitlement for employee
const calculateEntitlement = async (req, res) => {
  try {
    const { leaveType, gradeLevel, facilityId } = req.query;

    const policy = await LeavePolicy.getPolicyForGradeLevel(
      leaveType,
      gradeLevel,
      facilityId
    );

    const entitlement = {
      leaveType: policy.leaveType,
      displayName: policy.displayName,
      isPaid: policy.isPaid,
      salaryPercentage: policy.salaryPercentage,
      hasBalanceLimit: policy.hasBalanceLimit,
      maxDaysPerYear: policy.maxDaysPerYear,
      requiresApproval: policy.requiresApproval,
      minimumNoticeDays: policy.minimumNoticeDays,
      requiresDocumentation: policy.requiresDocumentation,
      requiredDocuments: policy.requiredDocuments
    };

    res.json({
      success: true,
      data: { entitlement }
    });
  } catch (error) {
    console.error('Error calculating entitlement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate entitlement',
      error: error.message
    });
  }
};

module.exports = {
  getAllPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  addFacilityOverride,
  getPolicyHistory,
  calculateEntitlement
};
