/**
 * Reset all employees to pending sync status
 * Run: node reset-sync-status.js
 */

const mongoose = require('mongoose');
const Employee = require('./server/models/Employee');
require('dotenv').config();

async function resetAllSyncStatus() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    // Update all employees to pending sync
    const result = await Employee.updateMany(
      {}, // All employees
      {
        $set: {
          deviceSynced: false,
          deviceSyncStatus: 'pending',
          'biometricData.syncStatus': 'pending',
          'biometricData.syncError': null,
          'biometricData.lastSyncAttempt': null
        }
      }
    );

    console.log(`✅ Reset sync status for ${result.modifiedCount} employees`);
    console.log(`   - deviceSynced: false`);
    console.log(`   - deviceSyncStatus: 'pending'`);
    console.log(`   - biometricData.syncStatus: 'pending'`);
    console.log(`   - syncError: cleared`);
    console.log(`   - lastSyncAttempt: cleared`);
    console.log(`\n✅ All employees are now ready for fresh sync!\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetAllSyncStatus();
