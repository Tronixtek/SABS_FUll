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

// Use the actual Attendance model from the project
const Attendance = require('./server/models/Attendance');

async function cleanupInvalidRecords() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sabs');
    console.log('✅ Connected to MongoDB\n');

    // Find records without employee or date
    console.log('🔍 Finding invalid attendance records...');
    
    // First, get all attendance records with populated employee
    const allRecords = await Attendance.find({}).populate('employee');
    
    // Filter for invalid records (employee deleted, missing employee, or no date)
    const invalidRecords = allRecords.filter(record => {
      return !record.employee || !record.date;
    });

    console.log(`\n📊 Found ${invalidRecords.length} invalid records (out of ${allRecords.length} total)\n`);

    if (invalidRecords.length === 0) {
      console.log('✅ No invalid records found. Database is clean!');
      process.exit(0);
    }

    // Show sample of invalid records
    console.log('Sample invalid records:');
    invalidRecords.slice(0, 5).forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record._id}`);
      console.log(`   Employee: ${record.employee ? 'EXISTS' : 'DELETED/MISSING'}`);
      console.log(`   Employee Ref: ${record.employee || 'NULL'}`);
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
        
        // Delete by IDs since we filtered in memory
        const idsToDelete = invalidRecords.map(r => r._id);
        const result = await Attendance.deleteMany({ _id: { $in: idsToDelete } });

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
