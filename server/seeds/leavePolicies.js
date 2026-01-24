const LeavePolicy = require('../models/LeavePolicy');

// Seed default leave policies
const seedLeavePolicies = async () => {
  try {
    console.log('Seeding leave policies...');

    const policies = [
      {
        leaveType: 'annual',
        displayName: 'Annual Leave',
        description: 'Yearly vacation leave based on grade level',
        isPaid: true,
        salaryPercentage: 100,
        hasBalanceLimit: true,
        maxDaysPerYear: 30, // Default for GL 7+
        balanceResetAnnually: true,
        requiresApproval: true,
        requiresManagerApproval: true,
        requiresHRApproval: false,
        minimumNoticeDays: 3,
        allowRetroactive: false,
        isActive: true,
        gradeLevelRules: [
          { minGradeLevel: 1, maxGradeLevel: 3, maxDaysPerYear: 14, salaryPercentage: 100 },
          { minGradeLevel: 4, maxGradeLevel: 6, maxDaysPerYear: 21, salaryPercentage: 100 },
          { minGradeLevel: 7, maxGradeLevel: 17, maxDaysPerYear: 30, salaryPercentage: 100 }
        ],
        notes: 'Annual leave entitlement varies by grade level'
      },
      {
        leaveType: 'maternity',
        displayName: 'Maternity Leave',
        description: 'Leave for pregnancy and childbirth',
        isPaid: true,
        salaryPercentage: 100,
        hasBalanceLimit: true,
        maxDaysPerYear: 84, // 12 weeks
        balanceResetAnnually: false,
        requiresApproval: true,
        requiresManagerApproval: true,
        requiresHRApproval: true,
        requiresDocumentation: true,
        requiredDocuments: ['Medical certificate', 'Expected delivery date confirmation'],
        minimumNoticeDays: 14,
        allowRetroactive: true,
        maxDaysPerRequest: 84,
        isActive: true,
        notes: '12 weeks (84 days) paid maternity leave'
      },
      {
        leaveType: 'adoptive',
        displayName: 'Adoptive Leave',
        description: 'Adoptive Leave',
        isPaid: true,
        salaryPercentage: 100,
        hasBalanceLimit: true,
        maxDaysPerYear: 112, // 16 weeks
        balanceResetAnnually: false,
        requiresApproval: true,
        requiresManagerApproval: true,
        requiresHRApproval: true,
        requiresDocumentation: true,
        requiredDocuments: ['Adoption papers', 'Court order'],
        minimumNoticeDays: 7,
        allowRetroactive: false,
        maxDaysPerRequest: 112,
        isActive: true,
        notes: '16 weeks (112 days) paid adoptive leave'
      },
      {
        leaveType: 'takaba',
        displayName: 'Takaba Leave',
        description: 'Takaba leave for eligible employees',
        isPaid: true,
        salaryPercentage: 100,
        hasBalanceLimit: true,
        maxDaysPerYear: 112, // 16 weeks
        balanceResetAnnually: false,
        requiresApproval: true,
        requiresManagerApproval: true,
        requiresHRApproval: true,
        minimumNoticeDays: 7,
        allowRetroactive: false,
        maxDaysPerRequest: 112,
        isActive: true,
        notes: '16 weeks (112 days) paid takaba leave'
      },
      {
        leaveType: 'sabbatical',
        displayName: 'Sabbatical Leave',
        description: 'Extended leave for rest, study, or personal development',
        isPaid: true, // DEFAULT: Paid - can be changed via policy updates
        salaryPercentage: 100, // DEFAULT: 100% - can be changed to 50% or 0% based on policy
        hasBalanceLimit: true,
        maxDaysPerYear: 365, // 12 months
        balanceResetAnnually: false,
        requiresApproval: true,
        requiresManagerApproval: true,
        requiresHRApproval: true,
        requiresDocumentation: true,
        requiredDocuments: ['Sabbatical proposal', 'Return plan'],
        minimumNoticeDays: 60,
        allowRetroactive: false,
        maxDaysPerRequest: 365,
        isActive: true,
        notes: 'POLICY CONFIGURABLE: Default is fully paid, can be changed to partial or unpaid based on budget/policy updates'
      },
      {
        leaveType: 'examination',
        displayName: 'Examination Leave',
        description: 'Leave for medical examinations, tests, and appointments',
        isPaid: true,
        salaryPercentage: 100,
        hasBalanceLimit: false,
        maxDaysPerYear: 0, // Unlimited
        balanceResetAnnually: true,
        requiresApproval: true,
        requiresManagerApproval: true,
        requiresHRApproval: false,
        requiresDocumentation: true,
        requiredDocuments: ['Medical appointment letter/card'],
        minimumNoticeDays: 1,
        allowRetroactive: true,
        isActive: true,
        notes: 'Open leave type - no balance limit'
      },
      {
        leaveType: 'study',
        displayName: 'Study Leave',
        description: 'Leave for educational purposes and training',
        isPaid: true,
        salaryPercentage: 100,
        hasBalanceLimit: false,
        maxDaysPerYear: 0, // Unlimited
        balanceResetAnnually: true,
        requiresApproval: true,
        requiresManagerApproval: true,
        requiresHRApproval: true,
        requiresDocumentation: true,
        requiredDocuments: ['Admission letter', 'Training schedule'],
        minimumNoticeDays: 14,
        allowRetroactive: false,
        isActive: true,
        notes: 'Open leave type - requires HR approval for extended study periods'
      },
      {
        leaveType: 'religious',
        displayName: 'Religious Leave',
        description: 'Leave for religious observances and pilgrimages',
        isPaid: true,
        salaryPercentage: 100,
        hasBalanceLimit: false,
        maxDaysPerYear: 0, // Unlimited
        balanceResetAnnually: true,
        requiresApproval: true,
        requiresManagerApproval: true,
        requiresHRApproval: false,
        minimumNoticeDays: 7,
        allowRetroactive: false,
        isActive: true,
        notes: 'Open leave type - for religious observances'
      },
      {
        leaveType: 'casual',
        displayName: 'Casual Leave',
        description: 'Leave for casual and short-term personal matters',
        isPaid: true,
        salaryPercentage: 100,
        hasBalanceLimit: false,
        maxDaysPerYear: 0, // Unlimited
        balanceResetAnnually: true,
        requiresApproval: true,
        requiresManagerApproval: true,
        requiresHRApproval: false,
        minimumNoticeDays: 1,
        allowRetroactive: true,
        maxDaysPerRequest: 5, // Max 5 days per casual leave request
        isActive: true,
        notes: 'Open leave type - for short-term personal matters, max 5 days per request'
      },
      {
        leaveType: 'absence',
        displayName: 'Leave of Absence',
        description: 'Leave for emergencies or unforeseen challenges',
        isPaid: true, // DEFAULT: Paid - can be changed via policy updates
        salaryPercentage: 100, // DEFAULT: 100% - can be changed based on circumstances
        hasBalanceLimit: false,
        maxDaysPerYear: 0, // Unlimited
        balanceResetAnnually: true,
        requiresApproval: true,
        requiresManagerApproval: true,
        requiresHRApproval: true,
        allowRetroactive: true,
        isActive: true,
        notes: 'POLICY CONFIGURABLE: Default is fully paid, can be changed to partial or unpaid based on emergency circumstances and policy updates'
      },
      {
        leaveType: 'official-assignment',
        displayName: 'Official Assignment',
        description: 'Leave for official duties preventing facility check-in/checkout',
        isPaid: true,
        salaryPercentage: 100,
        hasBalanceLimit: false,
        maxDaysPerYear: 0, // Unlimited
        balanceResetAnnually: true,
        requiresApproval: true,
        requiresManagerApproval: true,
        requiresHRApproval: false,
        requiresUrgentApproval: true,
        urgentApprovalDeadlineHours: 24, // Must be approved same day
        requiresDocumentation: true,
        requiredDocuments: ['Official assignment letter/memo'],
        allowRetroactive: true, // Can apply on the day
        isActive: true,
        notes: 'Must be approved within same day of application to be valid and prevent late/absent marking'
      }
    ];

    for (const policyData of policies) {
      const existing = await LeavePolicy.findOne({ leaveType: policyData.leaveType });
      
      if (existing) {
        console.log(`✓ Policy already exists for ${policyData.leaveType}, skipping...`);
      } else {
        await LeavePolicy.create(policyData);
        console.log(`✓ Created policy for ${policyData.leaveType}`);
      }
    }

    console.log('Leave policies seeding completed!');
  } catch (error) {
    console.error('Error seeding leave policies:', error);
    throw error;
  }
};

module.exports = { seedLeavePolicies };
