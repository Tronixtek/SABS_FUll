const mongoose = require('mongoose');

const reportScheduleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  frequency: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly'],
    required: true
  },
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true
  },
  recipients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  additionalEmails: [{
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastRun: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
reportScheduleSchema.index({ facility: 1, frequency: 1 });
reportScheduleSchema.index({ isActive: 1 });

module.exports = mongoose.model('ReportSchedule', reportScheduleSchema);
