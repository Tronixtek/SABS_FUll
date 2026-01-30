const mongoose = require('mongoose');

/**
 * Counter Model for Atomic ID Generation
 * Prevents race conditions when generating sequential IDs
 */
const counterSchema = new mongoose.Schema({
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true,
    unique: true
  },
  facilityPrefix: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  lastEmployeeNumber: {
    type: Number,
    default: 0,
    min: 0
  },
  lastStaffNumber: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Index for faster lookups
counterSchema.index({ facility: 1 });
counterSchema.index({ facilityPrefix: 1 });

module.exports = mongoose.model('Counter', counterSchema);
