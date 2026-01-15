const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  staffId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    // Format: KNLG followed by numbers (e.g., KNLG001, KNLG002)
    // This is the ID printed on physical ID cards
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  faceImageUploaded: {
    type: Boolean,
    default: false
  },
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  unit: {
    type: String,
    required: false,
    trim: true
  },
  designation: {
    type: String,
    required: true,
    trim: true
  },
  cadre: {
    type: String,
    required: true,
    trim: true
  },
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    required: true
  },
  deviceId: {
    type: String,
    required: false, // Facility's device ID (inherited from facility)
    trim: true,
    sparse: true // Allow multiple employees with same device ID (same facility)
  },
  joiningDate: {
    type: Date,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  nationality: {
    type: String,
    required: true,
    trim: true
  },
  nationalId: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  education: {
    type: String,
    enum: [
      'Primary School Leaving Certificate',
      'SSCE/WAEC/NECO',
      'OND',
      'NCE',
      'HND',
      'B.Sc/B.A/B.Eng',
      'M.Sc/M.A/MBA',
      'PhD/Doctorate',
      'Other'
    ],
    required: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: false
  },
  allergies: {
    type: String,
    required: false,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'terminated', 'deleted'],
    default: 'active'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletionReason: {
    type: String,
    enum: ['user_request', 'device_sync', 'admin_cleanup', 'force_delete'],
    required: false  // Allow undefined instead of null
  },
  profileImage: {
    type: String,
    default: null
  },
  biometricData: {
    fingerprintId: String,
    faceId: String,
    cardId: String,
    // XO5-specific fields
    xo5PersonSn: String, // XO5 personSn for mapping
    xo5PersonName: String, // Name as stored in XO5 device
    xo5DeviceKey: String, // Device key from XO5
    lastXO5Sync: Date
  },
  workingDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }],
  salaryGrade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryGrade',
    required: false
  },
  salary: {
    type: Number,
    required: false
    // Can be manually set to override salary grade, or left empty to use grade's base salary
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: false },
    country: { type: String, required: true }
  },
  metadata: {
    type: Map,
    of: String
  },
  // Employee Portal Authentication
  pin: {
    type: String,
    select: false // Hide by default for security (stores bcrypt hash, 60 chars)
  },
  pinAttempts: {
    type: Number,
    default: 0
  },
  pinLockedUntil: {
    type: Date,
    default: null
  },
  lastEmployeeLogin: {
    type: Date
  },
  employeeSelfServiceEnabled: {
    type: Boolean,
    default: false
  },
  pinMustChange: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
employeeSchema.index({ facility: 1, status: 1 });
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ staffId: 1 });
employeeSchema.index({ deviceId: 1 });
employeeSchema.index({ email: 1 });

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Hash PIN before saving
employeeSchema.pre('save', async function(next) {
  if (!this.isModified('pin')) {
    return next();
  }
  
  if (this.pin) {
    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(this.pin, salt);
  }
  next();
});

// Method to compare PIN
employeeSchema.methods.comparePin = async function(candidatePin) {
  if (!this.pin) return false;
  return await bcrypt.compare(candidatePin, this.pin);
};

// Method to get active employees only (exclude soft deleted)
employeeSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, status: 'active', isDeleted: false });
};

// Method to soft delete employee
employeeSchema.methods.softDelete = function(reason = 'user_request') {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.status = 'deleted';
  this.deletionReason = reason;
  return this.save();
};

// Add query middleware to exclude deleted employees by default
employeeSchema.pre(['find', 'findOne', 'findOneAndUpdate', 'countDocuments'], function() {
  // Only add the filter if isDeleted is not already specified
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: { $ne: true } });
  }
});

module.exports = mongoose.model('Employee', employeeSchema);
