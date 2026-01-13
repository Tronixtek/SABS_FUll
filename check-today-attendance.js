const mongoose = require('mongoose');
const Attendance = require('./server/models/Attendance');
const Employee = require('./server/models/Employee');
require('dotenv').config();

const checkAttendance = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const records = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('employee', 'firstName lastName employeeId').sort({ timestamp: 1 });

    console.log(`Found ${records.length} attendance records for today:\n`);
    
    records.forEach((record, index) => {
      console.log(`${index + 1}. ${record.employee?.firstName} ${record.employee?.lastName} (${record.employee?.employeeId})`);
      console.log(`   Type: ${record.type}`);
      console.log(`   Timestamp: ${record.timestamp}`);
      console.log(`   CheckIn.time: ${record.checkIn?.time}`);
      console.log(`   CheckOut.time: ${record.checkOut?.time}`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Late Arrival: ${record.lateArrival}m`);
      console.log('');
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkAttendance();
