const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
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
  role: {
    type: String,
    enum: ['super-admin', 'admin', 'facility-manager', 'hr'],
    default: 'hr'
  },
  facilities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility'
  }],
  permissions: [{
    type: String,
    enum: [
      'view_attendance',
      'edit_attendance',
      'delete_attendance',
      'manage_employees',
      'manage_facilities',
      'edit_facilities',
      'manage_shifts',
      'view_reports',
      'export_data',
      'manage_users',
      'system_settings',
      'enroll_users',
      'manage_devices'
    ]
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  lastLogin: {
    type: Date
  },
  profileImage: {
    type: String
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to check permission
userSchema.methods.hasPermission = function(permission) {
  // Super-admin and admin have all permissions
  if (this.role === 'super-admin' || this.role === 'admin') return true;
  return this.permissions.includes(permission);
};

// Method to check if user can manage a specific facility
userSchema.methods.canAccessFacility = function(facilityId) {
  if (this.role === 'super-admin' || this.role === 'admin') return true;
  return this.facilities.some(f => f.toString() === facilityId.toString());
};

module.exports = mongoose.model('User', userSchema);
