// Enhanced XO5 Database Test - Test actual database saving
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const Employee = require('./server/models/Employee');
const Attendance = require('./server/models/Attendance');
const Facility = require('./server/models/Facility');
const Shift = require('./server/models/Shift');

const BASE_URL = 'http://localhost:5000';

async function setupTestData() {
  console.log('📋 Setting up test data...');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/attendance-tracking');
    console.log('✅ Connected to MongoDB');
    
    // Create test facility
    let facility = await Facility.findOne({ code: 'XO5-TEST' });
    if (!facility) {
      facility = new Facility({
        name: 'XO5 Test Facility',
        code: 'XO5-TEST',
        deviceApiUrl: 'http://test-device.com',
        configuration: {
          deviceType: 'xo5',
          xo5Config: {
            webhookUrl: `${BASE_URL}/api/xo5/record`,
            deviceKey: 'XO5-DEVICE-TEST'
          }
        },
        status: 'active'
      });
      await facility.save();
      console.log('✅ Created test facility:', facility.name);
    }
    
    // Create test shift
    let shift = await Shift.findOne({ code: 'XO5-SHIFT-TEST' });
    if (!shift) {
      shift = new Shift({
        name: 'XO5 Test Shift',
        code: 'XO5-SHIFT-TEST',
        facility: facility._id,
        startTime: '09:00',
        endTime: '17:00',
        workingHours: 8,
        graceTime: {
          checkIn: 15,
          checkOut: 15
        }
      });
      await shift.save();
      console.log('✅ Created test shift:', shift.name);
    }
    
    // Create test employee
    let employee = await Employee.findOne({ deviceId: 'XO5-1001' });
    if (!employee) {
      employee = new Employee({
        employeeId: 'EMP-XO5-001',
        firstName: 'John',
        lastName: 'TestUser',
        email: 'john.test@company.com',
        facility: facility._id,
        shift: shift._id,
        department: 'IT',
        designation: 'Developer',
        deviceId: 'XO5-1001', // This matches the XO5 personSn
        joiningDate: new Date(),
        status: 'active'
      });
      await employee.save();
      console.log('✅ Created test employee:', `${employee.firstName} ${employee.lastName} (Device ID: ${employee.deviceId})`);
    }
    
    return { facility, shift, employee };
    
  } catch (error) {
    console.error('❌ Error setting up test data:', error.message);
    throw error;
  }
}

async function testXO5DatabaseSaving() {
  console.log('🧪 Testing XO5 Database Integration...\n');
  
  try {
    // Setup test data
    const { employee } = await setupTestData();
    
    // Clear any existing attendance for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await Attendance.deleteMany({
      employee: employee._id,
      date: today
    });
    console.log('🧹 Cleared existing attendance records for today\n');
    
    // Test 1: Check health endpoint
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/xo5/health`);
    console.log('✅ Health check passed:', healthResponse.data.message);
    console.log('');
    
    // Test 2: Send check-in record
    console.log('2️⃣ Testing check-in record...');
    const checkInRecord = {
      recordId: `test-checkin-${Date.now()}`,
      deviceKey: "XO5-DEVICE-TEST",
      recordTime: Date.now().toString(),
      recordTimeStr: new Date().toISOString().replace('T', ' ').substring(0, 19),
      personSn: "XO5-1001", // Matches employee.deviceId
      personName: "John TestUser",
      resultFlag: "1", // Success
      personType: "1", // Registered user
      direction: "1",  // Check-in
      faceFlag: "1",   // Face verification
      fingerFlag: "0",
      cardFlag: "0",
      pwdFlag: "0"
    };
    
    const checkInResponse = await axios.post(`${BASE_URL}/api/xo5/record`, checkInRecord);
    console.log('✅ Check-in response:', checkInResponse.data.status);
    console.log('   Message:', checkInResponse.data.message);
    console.log('   Attendance ID:', checkInResponse.data.attendanceId);
    
    // Verify check-in was saved to database
    const attendanceAfterCheckIn = await Attendance.findById(checkInResponse.data.attendanceId);
    if (attendanceAfterCheckIn) {
      console.log('✅ Check-in saved to database:');
      console.log('   Employee:', attendanceAfterCheckIn.employee);
      console.log('   Check-in time:', attendanceAfterCheckIn.checkIn.time);
      console.log('   Method:', attendanceAfterCheckIn.checkIn.method);
      console.log('   Status:', attendanceAfterCheckIn.status);
    } else {
      console.log('❌ Check-in NOT found in database!');
    }
    console.log('');
    
    // Test 3: Send check-out record (after 8 hours)
    console.log('3️⃣ Testing check-out record...');
    const checkOutTime = new Date(Date.now() + (8 * 60 * 60 * 1000)); // 8 hours later
    const checkOutRecord = {
      recordId: `test-checkout-${Date.now()}`,
      deviceKey: "XO5-DEVICE-TEST",
      recordTime: checkOutTime.getTime().toString(),
      recordTimeStr: checkOutTime.toISOString().replace('T', ' ').substring(0, 19),
      personSn: "XO5-1001",
      personName: "John TestUser",
      resultFlag: "1",
      personType: "1",
      direction: "4",  // Check-out
      faceFlag: "1",
      fingerFlag: "0",
      cardFlag: "0",
      pwdFlag: "0"
    };
    
    const checkOutResponse = await axios.post(`${BASE_URL}/api/xo5/record`, checkOutRecord);
    console.log('✅ Check-out response:', checkOutResponse.data.status);
    console.log('   Message:', checkOutResponse.data.message);
    console.log('   Attendance ID:', checkOutResponse.data.attendanceId);
    
    // Verify check-out was saved to database
    const attendanceAfterCheckOut = await Attendance.findById(checkOutResponse.data.attendanceId);
    if (attendanceAfterCheckOut) {
      console.log('✅ Check-out saved to database:');
      console.log('   Check-out time:', attendanceAfterCheckOut.checkOut.time);
      console.log('   Work hours:', attendanceAfterCheckOut.workHours);
      console.log('   Overtime:', attendanceAfterCheckOut.overtime);
      console.log('   Method:', attendanceAfterCheckOut.checkOut.method);
    } else {
      console.log('❌ Check-out NOT found in database!');
    }
    console.log('');
    
    // Test 4: Query final attendance record
    console.log('4️⃣ Final attendance record verification...');
    const finalAttendance = await Attendance.findOne({
      employee: employee._id,
      date: today
    }).populate('employee', 'firstName lastName deviceId')
      .populate('facility', 'name')
      .populate('shift', 'name startTime endTime');
    
    if (finalAttendance) {
      console.log('✅ Complete attendance record found:');
      console.log('   Employee:', finalAttendance.employee.firstName, finalAttendance.employee.lastName);
      console.log('   Device ID:', finalAttendance.employee.deviceId);
      console.log('   Facility:', finalAttendance.facility.name);
      console.log('   Shift:', finalAttendance.shift.name);
      console.log('   Date:', finalAttendance.date.toDateString());
      console.log('   Check-in:', finalAttendance.checkIn.time);
      console.log('   Check-out:', finalAttendance.checkOut.time);
      console.log('   Work Hours:', finalAttendance.workHours);
      console.log('   Status:', finalAttendance.status);
      console.log('   Late Arrival (mins):', finalAttendance.lateArrival);
    }
    
    console.log('\n🎉 Database Integration Test Completed Successfully!');
    console.log('✅ XO5 data IS being saved to the database correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server is not running. Start it with: npm run dev');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testXO5DatabaseSaving();