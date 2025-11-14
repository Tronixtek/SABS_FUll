const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['check-in', 'check-out', 'break-start', 'break-end'],
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  deviceIP: {
    type: String,
    default: '192.168.0.169'
  },
  verified: {
    type: Boolean,
    default: true
  },
  source: {
    type: String,
    enum: ['XO5_DEVICE', 'MANUAL', 'MOBILE_APP'],
    default: 'XO5_DEVICE'
  },
  deviceResponse: {
    type: String
  },
  workDuration: {
    type: Number, // Duration in minutes
    default: 0
  },
  checkIn: {
    time: Date,
    deviceId: String,
    method: {
      type: String,
      enum: ['fingerprint', 'face', 'card', 'manual'],
      default: 'fingerprint'
    },
    location: {
      latitude: Number,
      longitude: Number
    },
    recordedBy: String,
    // XO5-specific data
    xo5Data: {
      recordId: String,
      deviceKey: String,
      verifyStyle: String,
      temperature: String,
      openDoorFlag: String,
      rawData: mongoose.Schema.Types.Mixed
    }
  },
  checkOut: {
    time: Date,
    deviceId: String,
    method: {
      type: String,
      enum: ['fingerprint', 'face', 'card', 'manual'],
      default: 'fingerprint'
    },
    location: {
      latitude: Number,
      longitude: Number
    },
    recordedBy: String,
    // XO5-specific data
    xo5Data: {
      recordId: String,
      deviceKey: String,
      verifyStyle: String,
      temperature: String,
      openDoorFlag: String,
      rawData: mongoose.Schema.Types.Mixed
    }
  },
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    required: true
  },
  scheduledCheckIn: {
    type: Date,
    required: true
  },
  scheduledCheckOut: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'on-leave', 'holiday', 'excused'],
    default: 'present'
  },
  workHours: {
    type: Number,
    default: 0
  },
  overtime: {
    type: Number,
    default: 0
  },
  undertime: {
    type: Number,
    default: 0
  },
  lateArrival: {
    type: Number, // minutes
    default: 0
  },
  // Excuse/Leave Management fields
  isExcused: {
    type: Boolean,
    default: false
  },
  excuseReason: {
    type: String
  },
  excuseType: {
    type: String,
    enum: [
      'early-departure',
      'late-arrival', 
      'partial-day',
      'emergency-exit',
      'flexible-time',
      'medical-leave',
      'official-duty'
    ]
  },
  leaveRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveRequest'
  },
  earlyArrival: {
    type: Number, // minutes - arrived more than 30 minutes before shift start
    default: 0
  },
  earlyDeparture: {
    type: Number, // minutes
    default: 0
  },
  breaks: [{
    type: {
      type: String,
      enum: ['lunch', 'tea', 'prayer', 'rest', 'other'],
      default: 'lunch'
    },
    name: {
      type: String,
      default: 'Break'
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date
    },
    duration: {
      type: Number, // minutes
      default: 0
    },
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'exceeded'],
      default: 'ongoing'
    },
    recordedBy: {
      type: String,
      enum: ['employee', 'system', 'manual', 'device'],
      default: 'employee'
    },
    deviceId: String
  }],
  totalBreakTime: {
    type: Number, // Total minutes spent on all breaks
    default: 0
  },
  netWorkHours: {
    type: Number, // Work hours minus break time
    default: 0
  },
  breakCompliance: {
    type: String,
    enum: ['compliant', 'exceeded', 'insufficient', 'none'],
    default: 'none'
  },
  notes: {
    type: String,
    trim: true
  },
  isManualEntry: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deviceData: {
    raw: mongoose.Schema.Types.Mixed,
    synced: {
      type: Boolean,
      default: false
    },
    syncedAt: Date
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
attendanceSchema.index({ employee: 1, date: 1, type: 1 }, { unique: true }); // Allow multiple records per employee per date but unique per type
attendanceSchema.index({ facility: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ employee: 1, date: -1 });

// Calculate work hours before saving (only for manual entries or when not calculated)
attendanceSchema.pre('save', function(next) {
  // Skip if this is a device sync (already calculated in dataSyncService)
  if (this.deviceData?.synced) {
    return next();
  }
  
  // Calculate for manual entries or other sources
  if (this.checkIn && this.checkIn.time && this.checkOut && this.checkOut.time) {
    const checkInTime = new Date(this.checkIn.time);
    const checkOutTime = new Date(this.checkOut.time);
    
    // Calculate total work hours
    let totalMinutes = (checkOutTime - checkInTime) / (1000 * 60);
    
    // Subtract break time
    if (this.breaks && this.breaks.length > 0) {
      const totalBreakTime = this.breaks.reduce((acc, brk) => acc + (brk.duration || 0), 0);
      totalMinutes -= totalBreakTime;
    }
    
    this.workHours = parseFloat((totalMinutes / 60).toFixed(2));
    
    // Calculate scheduled work hours
    const scheduledMinutes = (new Date(this.scheduledCheckOut) - new Date(this.scheduledCheckIn)) / (1000 * 60);
    const scheduledHours = scheduledMinutes / 60;
    
    // Calculate overtime/undertime
    if (this.workHours > scheduledHours) {
      this.overtime = parseFloat((this.workHours - scheduledHours).toFixed(2));
      this.undertime = 0;
    } else if (this.workHours < scheduledHours) {
      this.undertime = parseFloat((scheduledHours - this.workHours).toFixed(2));
      this.overtime = 0;
    } else {
      this.overtime = 0;
      this.undertime = 0;
    }
    
    // Calculate late arrival
    const lateMinutes = (new Date(this.checkIn.time) - new Date(this.scheduledCheckIn)) / (1000 * 60);
    if (lateMinutes > 0) {
      this.lateArrival = Math.round(lateMinutes);
      if (lateMinutes > 15) { // More than 15 minutes late
        this.status = 'late';
      }
    } else {
      this.lateArrival = 0;
    }
    
    // Calculate early departure
    const earlyMinutes = (new Date(this.scheduledCheckOut) - new Date(this.checkOut.time)) / (1000 * 60);
    if (earlyMinutes > 0) {
      this.earlyDeparture = Math.round(earlyMinutes);
    } else {
      this.earlyDeparture = 0;
    }
  }
  
  next();
});

// Static method to get attendance summary
attendanceSchema.statics.getAttendanceSummary = async function(employeeId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        employee: mongoose.Types.ObjectId(employeeId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalWorkHours: { $sum: '$workHours' },
        totalOvertime: { $sum: '$overtime' },
        totalLateMinutes: { $sum: '$lateArrival' }
      }
    }
  ]);
};

module.exports = mongoose.model('Attendance', attendanceSchema);
