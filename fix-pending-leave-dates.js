const mongoose = require('mongoose');
const LeaveRequest = require('./server/models/LeaveRequest');
require('dotenv').config();

const fixPendingRequests = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find pending requests with missing affectedDate
    const requests = await LeaveRequest.find({ 
      status: 'pending',
      affectedDate: { $exists: false }
    });

    console.log(`Found ${requests.length} requests with missing affectedDate\n`);

    for (const req of requests) {
      // Set affectedDate based on available date fields
      if (req.startDate) {
        req.affectedDate = req.startDate;
      } else if (req.date) {
        req.affectedDate = req.date;
      } else {
        req.affectedDate = new Date(); // Fallback to today
      }

      await req.save({ validateModifiedOnly: true });
      console.log(`✅ Fixed request ${req._id} - set affectedDate to ${req.affectedDate}`);
    }

    console.log('\nDone!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixPendingRequests();
