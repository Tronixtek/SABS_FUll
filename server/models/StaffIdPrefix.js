const mongoose = require('mongoose');

const staffIdPrefixSchema = new mongoose.Schema({
  prefix: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    // Optional description (e.g., "Kano State", "Lagos Office")
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StaffIdPrefix', staffIdPrefixSchema);
