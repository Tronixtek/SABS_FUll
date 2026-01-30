/**
 * Migration Script: Initialize Atomic Counters for Existing Facilities
 * 
 * This script creates Counter documents for all existing facilities
 * to enable atomic ID generation and prevent race conditions
 * 
 * Run this ONCE before using public registration
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Facility = require('./server/models/Facility');
const { initializeFacilityCounter } = require('./server/utils/idGenerator');

async function migrateCounters() {
  try {
    console.log('\n🔄 ===== COUNTER MIGRATION STARTED =====\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected\n');

    // Get all facilities
    const facilities = await Facility.find();
    console.log(`📊 Found ${facilities.length} facilities\n`);

    // Initialize counter for each facility
    for (const facility of facilities) {
      console.log(`\n🏥 Processing: ${facility.name} (${facility.code})`);
      console.log(`   ID: ${facility._id}`);
      
      try {
        const counter = await initializeFacilityCounter(facility._id);
        console.log(`   ✅ Counter initialized:`);
        console.log(`      - Prefix: ${counter.facilityPrefix}`);
        console.log(`      - Last Employee Number: ${counter.lastEmployeeNumber}`);
        console.log(`      - Last Staff Number: ${counter.lastStaffNumber}`);
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
      }
    }

    console.log('\n\n✅ ===== MIGRATION COMPLETED =====');
    console.log('All facility counters have been initialized.');
    console.log('Public registration is now safe to use.\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateCounters();
