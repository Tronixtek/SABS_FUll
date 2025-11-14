const mongoose = require('mongoose');

const syncFailureSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['employee_sync', 'employee_remove', 'attendance_sync'],
        index: true
    },
    employeeId: {
        type: String,
        required: true,
        index: true
    },
    fullName: {
        type: String
    },
    error: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    source: {
        type: String,
        default: 'XO5_DEVICE'
    },
    resolved: {
        type: Boolean,
        default: false
    },
    resolvedAt: {
        type: Date
    },
    resolvedBy: {
        type: String
    },
    retryCount: {
        type: Number,
        default: 0
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index for efficient queries
syncFailureSchema.index({ type: 1, resolved: 1, timestamp: -1 });
syncFailureSchema.index({ employeeId: 1, timestamp: -1 });

// Static method to find unresolved failures
syncFailureSchema.statics.findUnresolved = function(type = null) {
    const query = { resolved: false };
    if (type) query.type = type;
    return this.find(query).sort({ timestamp: -1 });
};

// Static method to get failure statistics
syncFailureSchema.statics.getStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: {
                    type: '$type',
                    resolved: '$resolved'
                },
                count: { $sum: 1 },
                latestFailure: { $max: '$timestamp' }
            }
        }
    ]);
    
    return stats;
};

// Method to mark as resolved
syncFailureSchema.methods.markResolved = function(resolvedBy = 'system') {
    this.resolved = true;
    this.resolvedAt = new Date();
    this.resolvedBy = resolvedBy;
    return this.save();
};

module.exports = mongoose.model('SyncFailure', syncFailureSchema);