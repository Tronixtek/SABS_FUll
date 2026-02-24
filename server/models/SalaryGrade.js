const mongoose = require('mongoose');

const salaryGradeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
    // e.g., "L1", "L2", "GRADE-A", "SENIOR", etc.
  },
  name: {
    type: String,
    required: true,
    trim: true
    // e.g., "Level 1", "Junior Staff", "Senior Manager"
  },
  baseSalary: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  minSalary: {
    type: Number,
    required: false,
    min: 0
    // Optional: minimum salary for this grade
  },
  maxSalary: {
    type: Number,
    required: false,
    min: 0
    // Optional: maximum salary for this grade
  },
  benefits: [{
    type: String
    // e.g., "Health Insurance", "Car Allowance", "Housing"
  }],
  taxRate: {
    type: Number,
    default: 10,
    min: 0,
    max: 100
    // Tax rate percentage for this salary grade
  },
  pensionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
    // Pension contribution rate percentage for this salary grade
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries
salaryGradeSchema.index({ code: 1 });
salaryGradeSchema.index({ isActive: 1 });

// Virtual for employee count
salaryGradeSchema.virtual('employeeCount', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'salaryGrade',
  count: true
});

module.exports = mongoose.model('SalaryGrade', salaryGradeSchema);
