const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

const Facility = require('./server/models/Facility');

async function updateFacilityDeviceConfig() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find PHC_HQ facility
    const facility = await Facility.findOne({ code: 'PHC_HQ' });
    
    if (!facility) {
      console.log('❌ PHC_HQ facility not found');
      process.exit(1);
    }

    console.log(`\n📋 Current facility: ${facility.name}`);
    console.log(`   Code: ${facility.code}`);
    console.log(`   Current config:`, facility.configuration);

    // Update facility configuration with device settings
    facility.configuration = {
      ...facility.configuration,
      deleteUserApiUrl: 'http://143.198.150.26:8081/api/employee/delete',
      deviceKey: '020e7096a03f178165', // Device ID from your enrollment
      secret: '123456' // Device secret
    };

    await facility.save();

    console.log(`\n✅ Facility configuration updated successfully`);
    console.log(`   Delete URL: ${facility.configuration.deleteUserApiUrl}`);
    console.log(`   Device Key: ${facility.configuration.deviceKey}`);
    console.log(`   Secret: ${facility.configuration.secret}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateFacilityDeviceConfig();
