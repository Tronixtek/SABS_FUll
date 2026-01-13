const mongoose = require('mongoose');
const LeaveRequest = require('./server/models/LeaveRequest');
const Employee = require('./server/models/Employee');
require('dotenv').config();

const testApproval = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const request = await LeaveRequest.findOne({ status: 'pending' });
    
    if (!request) {
      console.log('No pending requests found');
      mongoose.connection.close();
      return;
    }

    console.log('\nPending request details:');
    console.log('ID:', request._id);
    console.log('Employee:', request.employee);
    console.log('EmployeeId:', request.employeeId);
    console.log('Facility:', request.facility);
    console.log('Type:', request.type);
    console.log('Reason:', request.reason);
    console.log('Category:', request.category);
    console.log('Status:', request.status);
    console.log('AffectedDate:', request.affectedDate);
    console.log('StartDate:', request.startDate);
    console.log('EndDate:', request.endDate);

    // Try to approve it
    console.log('\nAttempting to approve...');
    request.status = 'approved';
    request.approvedBy = '677e29fc8a5b001ec0123456'; // Fake user ID for testing
    request.approvedAt = new Date();

    await request.save({ validateModifiedOnly: true });
    console.log('✅ Successfully approved!');

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

testApproval();
