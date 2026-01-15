// Quick MongoDB check for facility device configuration
const mongoose = require('mongoose');
require('dotenv').config();

async function checkFacilityDeviceConfig() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sabs';
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Facility = require('./server/models/Facility');
    const facilities = await Facility.find({});
    
    console.log(`Found ${facilities.length} facilities:\n`);
    
    facilities.forEach((facility, index) => {
      console.log(`${index + 1}. ${facility.name} (${facility.code})`);
      console.log(`   Device ID: ${facility.deviceId || '❌ NOT SET'}`);
      console.log(`   Gateway URL: ${facility.deviceConfig?.gatewayUrl || '❌ NOT SET'}`);
      console.log(`   Java Service URL: ${facility.deviceConfig?.javaServiceUrl || '❌ NOT SET'}`);
      console.log(`   Device Key: ${facility.deviceConfig?.deviceKey || '❌ NOT SET'}`);
      console.log('');
    });

    console.log('💡 To fix: Go to Facilities page → Click Edit → Configure Device Settings\n');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkFacilityDeviceConfig();
