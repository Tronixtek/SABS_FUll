const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sabs';

async function checkDeviceConnection() {
  try {
    console.log('🔍 Device Connection Diagnostic Tool\n');
    console.log('=' .repeat(60));

    // Connect to MongoDB
    console.log('\n📊 Step 1: Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected');

    // Check Facilities with device configuration
    console.log('\n📊 Step 2: Checking facility device configurations...');
    const Facility = require('./server/models/Facility');
    const facilities = await Facility.find({}).select('name code deviceId deviceConfig');
    
    console.log(`\nFound ${facilities.length} facilities:`);
    facilities.forEach((facility, index) => {
      console.log(`\n${index + 1}. Facility: ${facility.name} (${facility.code})`);
      console.log(`   Device ID: ${facility.deviceId || 'NOT SET'}`);
      console.log(`   Java Service URL: ${facility.deviceConfig?.javaServiceUrl || 'NOT CONFIGURED'}`);
      console.log(`   Gateway URL: ${facility.deviceConfig?.gatewayUrl || 'NOT CONFIGURED'}`);
      console.log(`   Device Key: ${facility.deviceConfig?.deviceKey || 'NOT CONFIGURED'}`);
    });

    // Test Java Service Connection
    console.log('\n📊 Step 3: Testing Java Service Connection...');
    const javaServiceUrl = process.env.JAVA_SERVICE_URL || 'http://localhost:8080';
    
    console.log(`   Java Service URL: ${javaServiceUrl}`);
    
    try {
      // Test /api/persons endpoint
      console.log('\n   Testing GET /api/persons...');
      const personsResponse = await axios.get(`${javaServiceUrl}/api/persons`, {
        timeout: 5000
      });
      console.log(`   ✅ Java Service is responding`);
      console.log(`   Response code: ${personsResponse.data.code}`);
      console.log(`   Total persons: ${personsResponse.data.data?.total || 0}`);
    } catch (error) {
      console.error(`   ❌ Java Service connection failed!`);
      if (error.code === 'ECONNREFUSED') {
        console.error(`   Error: Connection refused - Is the Java service running on ${javaServiceUrl}?`);
      } else if (error.code === 'ETIMEDOUT') {
        console.error(`   Error: Connection timeout - Java service not responding`);
      } else {
        console.error(`   Error: ${error.message}`);
      }
    }

    // Test Device Gateway Connection
    console.log('\n📊 Step 4: Testing Device Gateway Connection...');
    
    for (const facility of facilities) {
      if (facility.deviceConfig?.gatewayUrl) {
        console.log(`\n   Testing gateway for ${facility.name}...`);
        console.log(`   Gateway URL: ${facility.deviceConfig.gatewayUrl}`);
        
        try {
          // Try to get device status
          const gatewayResponse = await axios.get(
            `${facility.deviceConfig.gatewayUrl}/api/device/status`,
            { timeout: 3000 }
          );
          console.log(`   ✅ Gateway is responding`);
        } catch (error) {
          console.error(`   ❌ Gateway connection failed!`);
          if (error.code === 'ECONNREFUSED') {
            console.error(`   Error: Connection refused - Is the device gateway running?`);
          } else if (error.code === 'ETIMEDOUT') {
            console.error(`   Error: Connection timeout - Gateway not responding`);
          } else if (error.response?.status === 404) {
            console.log(`   Note: Endpoint /api/device/status not found (this may be normal)`);
          } else {
            console.error(`   Error: ${error.message}`);
          }
        }
      }
    }

    // Check for recent enrollment errors
    console.log('\n📊 Step 5: Checking recent employees...');
    const Employee = require('./server/models/Employee');
    const recentEmployees = await Employee.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName employeeId deviceId facility createdAt');
    
    console.log(`\nLast 5 registered employees:`);
    for (const emp of recentEmployees) {
      console.log(`   ${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
      console.log(`   Device ID: ${emp.deviceId || 'NONE'}`);
      console.log(`   Registered: ${emp.createdAt}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Diagnostic complete!\n');
    
    console.log('💡 Common Issues and Solutions:\n');
    console.log('1. "Connection refused" → Java service not running');
    console.log('   Solution: Start Java service with: npm run start:java\n');
    
    console.log('2. "Device not connected to gateway" → Device offline or gateway issue');
    console.log('   Solution: Check device power, network, and gateway URL\n');
    
    console.log('3. "Gateway URL not configured" → Facility setup incomplete');
    console.log('   Solution: Configure device settings in Facility settings\n');

  } catch (error) {
    console.error('\n❌ Error running diagnostic:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed\n');
  }
}

checkDeviceConnection();
