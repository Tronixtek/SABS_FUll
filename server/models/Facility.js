const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  // Support both 'location' and 'address' for frontend compatibility
  location: {
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  // Support both 'contactInfo' and 'contactPerson' for frontend compatibility
  contactInfo: {
    phone: String,
    email: String,
    manager: String
  },
  contactPerson: {
    name: String,
    email: String,
    phone: String
  },
  deviceApiUrl: {
    type: String,
    required: true,
    trim: true
  },
  deviceApiKey: {
    type: String,
    trim: true
  },
  timezone: {
    type: String,
    default: 'America/New_York'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  deviceInfo: {
    deviceId: String,
    deviceModel: String,
    lastSyncTime: Date,
    syncStatus: {
      type: String,
      enum: ['success', 'failed', 'pending', 'in-progress'],
      default: 'pending'
    },
    lastSyncError: String
  },
  configuration: {
    autoSync: {
      type: Boolean,
      default: true
    },
    syncInterval: {
      type: Number,
      default: 5 // minutes
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    userApiUrl: {
      type: String,
      trim: true,
      // URL to fetch/sync registered users FROM device to central database
      // Example: POST https://device.com/api/users/list
    },
    addUserApiUrl: {
      type: String,
      trim: true,
      // URL to add/register new users TO device
      // Example: POST https://device.com/api/users/add
    },
    deleteUserApiUrl: {
      type: String,
      trim: true,
      // URL to delete users FROM device
      // Example: DELETE https://device.com/api/person/{person_uuid}
      // Use {person_uuid} as placeholder for the employee device ID
    }
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes
facilitySchema.index({ code: 1 });
facilitySchema.index({ status: 1 });

// Method to update sync status
facilitySchema.methods.updateSyncStatus = function(status, error = null) {
  this.deviceInfo.syncStatus = status;
  this.deviceInfo.lastSyncTime = new Date();
  if (error) {
    this.deviceInfo.lastSyncError = error;
  }
  return this.save();
};

module.exports = mongoose.model('Facility', facilitySchema);
