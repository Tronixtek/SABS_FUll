const mongoose = require('mongoose');
const LeavePolicy = require('./models/LeavePolicy');
require('dotenv').config();

const fixAnnualLeavePolicy = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find Annual Leave policy
    const annualPolicy = await LeavePolicy.findOne({ leaveType: 'annual' });
    
    if (!annualPolicy) {
      console.log('❌ Annual Leave policy not found');
      return;
    }

    console.log('\n📋 Current Annual Leave Policy:');
    console.log('isPaid:', annualPolicy.isPaid);
    console.log('salaryPercentage:', annualPolicy.salaryPercentage);
    console.log('displayName:', annualPolicy.displayName);
    console.log('isActive:', annualPolicy.isActive);

    // Update to be paid 100%
    annualPolicy.isPaid = true;
    annualPolicy.salaryPercentage = 100;
    annualPolicy.isActive = true;

    await annualPolicy.save();

    console.log('\n✅ Annual Leave policy updated:');
    console.log('isPaid:', annualPolicy.isPaid);
    console.log('salaryPercentage:', annualPolicy.salaryPercentage);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixAnnualLeavePolicy();
