const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
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
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
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
  designation: {
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
    required: false
  },
  nationality: {
    type: String,
    required: false,
    trim: true
  },
  nationalId: {
    type: String,
    required: false,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'terminated'],
    default: 'active'
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
  salary: {
    type: Number,
    required: false
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
employeeSchema.index({ facility: 1, status: 1 });
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ deviceId: 1 });
employeeSchema.index({ email: 1 });

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to get active employees only
employeeSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, status: 'active' });
};

module.exports = mongoose.model('Employee', employeeSchema);
