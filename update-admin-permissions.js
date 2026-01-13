const mongoose = require('mongoose');
const User = require('./server/models/User');
require('dotenv').config();

const updateAdminPermissions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Update all admin users to have leave permissions
    const result = await User.updateMany(
      { role: 'admin' },
      {
        $addToSet: {
          permissions: {
            $each: ['view_leave_requests', 'submit_leave', 'approve_leave']
          }
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} admin user(s) with leave permissions`);

    // Show updated admin users
    const admins = await User.find({ role: 'admin' }).select('username email permissions');
    console.log('\nAdmin users:');
    admins.forEach(admin => {
      console.log(`- ${admin.username} (${admin.email})`);
      console.log(`  Permissions: ${admin.permissions.join(', ')}\n`);
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

updateAdminPermissions();
