const mongoose = require('mongoose');

const PayrollSettingsSchema = new mongoose.Schema({
  // Rate Settings
  overtimeRate: {
    type: Number,
    default: 1.5,
    min: 1,
    max: 3
  },
  taxRate: {
    type: Number,
    default: 0.10, // 10%
    min: 0,
    max: 1
  },
  pensionRate: {
    type: Number,
    default: 0.08, // 8%
    min: 0,
    max: 1
  },
  
  // Working Schedule
  workingDaysPerMonth: {
    type: Number,
    default: 22,
    min: 20,
    max: 31
  },
  hoursPerDay: {
    type: Number,
    default: 8,
    min: 6,
    max: 12
  },
  
  // Insurance & Benefits
  insuranceRate: {
    type: Number,
    default: 0, // percentage or fixed amount
    min: 0
  },
  insuranceType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'fixed'
  },
  
  // Company Settings
  companyName: {
    type: String,
    default: 'SABS Attendance System'
  },
  payrollCurrency: {
    type: String,
    default: 'NGN'
  },
  
  // Updated Info
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
PayrollSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('PayrollSettings', PayrollSettingsSchema);
