const mongoose = require('mongoose');
const LeaveRequest = require('./server/models/LeaveRequest');
const Employee = require('./server/models/Employee');
require('dotenv').config();

const fixLeaveRequest = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const request = await LeaveRequest.findById('69661b37b72f1d085217e491').populate('employee');
    
    if (!request) {
      console.log('Request not found');
      mongoose.connection.close();
      return;
    }

    console.log('Fixing leave request...');
    
    // Fill in missing required fields
    request.employeeId = request.employee.employeeId;
    request.facility = request.employee.facility;
    request.category = 'personal'; // Default category
    
    await request.save({ validateModifiedOnly: true });
    console.log('✅ Fixed missing fields');
    
    // Now try to approve
    request.status = 'approved';
    request.approvedBy = null; // Will be set by the controller
    request.approvedAt = new Date();
    
    await request.save({ validateModifiedOnly: true });
    console.log('✅ Approved successfully');

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    mongoose.connection.close();
    process.exit(1);
  }
};

fixLeaveRequest();
