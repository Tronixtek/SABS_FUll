const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
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
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true
  },
  startTime: {
    type: String, // Format: "HH:mm" (24-hour format)
    required: true
  },
  endTime: {
    type: String, // Format: "HH:mm" (24-hour format)
    required: true
  },
  workingHours: {
    type: Number,
    required: true
  },
  graceTime: {
    checkIn: {
      type: Number, // minutes
      default: 15
    },
    checkOut: {
      type: Number, // minutes
      default: 15
    }
  },
  breakTime: {
    type: Number, // minutes - DEPRECATED: Use breaks array instead
    default: 60
  },
  breaks: [{
    name: {
      type: String,
      required: true,
      default: 'Lunch Break'
    },
    type: {
      type: String,
      enum: ['lunch', 'tea', 'prayer', 'rest', 'other'],
      default: 'lunch'
    },
    duration: {
      type: Number, // minutes - expected break duration
      required: true,
      default: 60
    },
    startWindow: {
      type: String, // Format: "HH:mm" - earliest time break can start
      required: true,
      default: "12:00"
    },
    endWindow: {
      type: String, // Format: "HH:mm" - latest time break can end
      required: true,
      default: "14:00"
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    isOptional: {
      type: Boolean,
      default: false
    },
    maxDuration: {
      type: Number, // minutes - alert if exceeded
      default: 90
    },
    allowMultiple: {
      type: Boolean, // Allow multiple breaks of same type
      default: false
    }
  }],
  breakTrackingEnabled: {
    type: Boolean,
    default: false, // Set to true to enable break tracking
    description: 'Enable employee break clock in/out tracking'
  },
  workingDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }],
  isOvernight: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#3498db'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  allowances: {
    overtimeRate: {
      type: Number,
      default: 1.5 // 1.5x regular rate
    },
    nightShiftAllowance: {
      type: Number,
      default: 0
    },
    weekendAllowance: {
      type: Number,
      default: 0
    }
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
shiftSchema.index({ facility: 1, status: 1 });
shiftSchema.index({ code: 1 });

// Method to check if a time is within shift hours
shiftSchema.methods.isWithinShiftTime = function(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const [startHours, startMinutes] = this.startTime.split(':').map(Number);
  const [endHours, endMinutes] = this.endTime.split(':').map(Number);
  
  const timeInMinutes = hours * 60 + minutes;
  const startInMinutes = startHours * 60 + startMinutes;
  let endInMinutes = endHours * 60 + endMinutes;
  
  // Handle overnight shifts
  if (this.isOvernight && endInMinutes < startInMinutes) {
    endInMinutes += 24 * 60;
  }
  
  return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
};

module.exports = mongoose.model('Shift', shiftSchema);
