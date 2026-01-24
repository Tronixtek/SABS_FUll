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
  staffIdPrefix: {
    type: String,
    trim: true,
    uppercase: true,
    // Staff ID prefix for employee card numbers (e.g., 'KNLG', 'KANO SG')
    // If not set, defaults to the facility code
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
    required: false,
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
      enum: ['success', 'failed', 'pending', 'in-progress', 'skipped'],
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
    // Integration type configuration
    integrationType: {
      type: String,
      enum: ['legacy', 'java-xo5'],
      default: 'legacy'
    },
    deviceKey: {
      type: String,
      trim: true,
      // XO5 device key for Java service integration
    },
    deviceSecret: {
      type: String,
      trim: true,
      // XO5 device secret for Java service integration
      default: '123456'
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
    },
    // Device-agnostic Integration Configuration
    smartDeviceConfig: {
      webhookUrl: {
        type: String,
        trim: true,
        // URL where smart device will send attendance data
        // Example: http://your-server.com:5000/api/device/record
      },
      deviceKey: {
        type: String,
        trim: true,
        // Unique identifier for the smart device
      },
      enableStrictFiltering: {
        type: Boolean,
        default: true,
        // Only process verified check-in/check-out events
      },
      allowedDirections: [{
        type: String,
        enum: ['1', '4'], // 1 = check-in, 4 = check-out
        default: ['1', '4']
      }],
      requiredFlags: {
        resultFlag: {
          type: String,
          default: '1' // Only successful access
        },
        personType: {
          type: String,
          default: '1' // Only registered users
        }
      }
    }
  },
  departments: [{
    type: String,
    trim: true
  }],
  designations: [{
    type: String,
    trim: true
  }],
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
