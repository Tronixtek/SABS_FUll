const mongoose = require('mongoose');
const LeaveRequest = require('./server/models/LeaveRequest');
const Employee = require('./server/models/Employee');
require('dotenv').config();

const checkLeaveRequests = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const leaveRequests = await LeaveRequest.find({ status: 'pending' })
      .populate('employee', 'firstName lastName staffId');
    
    console.log(`\nFound ${leaveRequests.length} pending leave request(s):\n`);
    
    leaveRequests.forEach(req => {
      console.log(`ID: ${req._id}`);
      console.log(`Employee: ${req.employee?.firstName} ${req.employee?.lastName} (${req.employee?.staffId})`);
      console.log(`Type: ${req.type}`);
      console.log(`Reason: ${req.reason}`);
      console.log(`affectedDate: ${req.affectedDate}`);
      console.log(`startDate: ${req.startDate}`);
      console.log(`endDate: ${req.endDate}`);
      console.log(`date: ${req.date}`);
      console.log(`Status: ${req.status}`);
      console.log('---\n');
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkLeaveRequests();
