const path = require('path');
const fs = require('fs');

// Try to load .env from server directory if it exists
const envPath = path.join(__dirname, 'server', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema({
  name: String,
  code: String,
  timezone: String,
  location: {
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  }
}, { collection: 'facilities' });

const Facility = mongoose.model('Facility', facilitySchema);

async function fixTimezones() {
  try {
    // Use environment variable or default to localhost
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-tracking';
    
    console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');
    
    // Get the database name from the connection
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📊 Database: ${dbName}\n`);

    // Find all facilities
    const facilities = await Facility.find({});
    console.log(`Found ${facilities.length} facilities:\n`);

    // Show current timezones
    facilities.forEach(facility => {
      console.log(`📍 ${facility.name} (${facility.code})`);
      console.log(`   Current timezone: ${facility.timezone || 'NOT SET'}`);
    });

    console.log('\n🔄 Updating all facilities to Africa/Lagos (WAT)...\n');

    // Update all facilities to Africa/Lagos
    const result = await Facility.updateMany(
      {},
      { $set: { timezone: 'Africa/Lagos' } }
    );

    console.log(`✅ Updated ${result.modifiedCount} facilities\n`);

    // Verify the update
    const updatedFacilities = await Facility.find({});
    console.log('Verification:');
    updatedFacilities.forEach(facility => {
      console.log(`✓ ${facility.name}: ${facility.timezone}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixTimezones();
