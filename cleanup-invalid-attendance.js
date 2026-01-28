/**
 * Cleanup Script: Remove Invalid Attendance Records
 * 
 * This script removes attendance records that are missing:
 * - employee reference
 * - date information
 * 
 * These records cannot be used for analytics or reporting.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const attendanceSchema = new mongoose.Schema({}, { strict: false, collection: 'attendances' });
const Attendance = mongoose.model('Attendance', attendanceSchema);

async function cleanupInvalidRecords() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sabs');
    console.log('✅ Connected to MongoDB\n');

    // Find records without employee or date
    console.log('🔍 Finding invalid attendance records...');
    const invalidRecords = await Attendance.find({
      $or: [
        { employee: { $exists: false } },
        { employee: null },
        { date: { $exists: false } },
        { date: null }
      ]
    });

    console.log(`\n📊 Found ${invalidRecords.length} invalid records\n`);

    if (invalidRecords.length === 0) {
      console.log('✅ No invalid records found. Database is clean!');
      process.exit(0);
    }

    // Show sample of invalid records
    console.log('Sample invalid records:');
    invalidRecords.slice(0, 5).forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record._id}`);
      console.log(`   Employee: ${record.employee || 'MISSING'}`);
      console.log(`   Date: ${record.date || 'MISSING'}`);
      console.log(`   Facility: ${record.facility || 'N/A'}`);
      console.log('');
    });

    // Ask for confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question(`\n⚠️  Delete ${invalidRecords.length} invalid records? (yes/no): `, async (answer) => {
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        console.log('\n🗑️  Deleting invalid records...');
        
        const result = await Attendance.deleteMany({
          $or: [
            { employee: { $exists: false } },
            { employee: null },
            { date: { $exists: false } },
            { date: null }
          ]
        });

        console.log(`\n✅ Deleted ${result.deletedCount} invalid attendance records`);
        console.log('✅ Database cleanup complete!');
      } else {
        console.log('\n❌ Cleanup cancelled');
      }

      readline.close();
      await mongoose.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

cleanupInvalidRecords();
