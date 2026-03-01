const mongoose = require('mongoose');
const User = require('./server/models/User');
require('dotenv').config({ path: './server/.env' });

const revertManagersToAdmins = async () => {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    // Specific users to revert back to admin
    const usersToRevert = [
      'karaye@gmail.com',
      'usmanwadaibrahim955@gmail.com',
      'Umarubajibrin@gmail.com',
      'zeesani35@gmail.com'
    ];

    // Find the specific users
    const users = await User.find({
      email: { $in: usersToRevert }
    });

    if (users.length === 0) {
      console.log('ℹ️  No users found with the specified emails');
      await mongoose.connection.close();
      return;
    }

    console.log(`📋 Found ${users.length} user(s) to revert to admin:`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.username}) - Current role: ${user.role}`);
    });
    console.log('');

    // Admin permissions (full access)
    const adminPermissions = [
      'view_attendance',
      'edit_attendance',
      'manage_employees',
      'manage_shifts',
      'manage_facilities',
      'manage_users',
      'view_reports',
      'export_data',
      'system_settings',
      'enroll_users',
      'manage_leave',
      'approve_leave',
      'manage_payroll'
    ];

    // Update each user back to admin
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const oldRole = user.role;
        
        user.role = 'admin';
        user.facilities = []; // Admins have access to all facilities
        user.permissions = adminPermissions;
        
        await user.save();
        
        console.log(`✅ Reverted: ${user.email}`);
        console.log(`   - Role: ${oldRole} → admin`);
        console.log(`   - Facilities: Cleared (admin has access to all)`);
        console.log(`   - Permissions: ${adminPermissions.length} assigned`);
        console.log('');
        
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to revert ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('═══════════════════════════════════════');
    console.log('📊 Reversion Summary:');
    console.log(`   ✅ Successfully reverted: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log('═══════════════════════════════════════\n');

    // Verify the changes
    console.log('🔍 Verifying changes...\n');
    const updatedUsers = await User.find({
      email: { $in: usersToRevert }
    });

    updatedUsers.forEach(user => {
      console.log(`📧 ${user.email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Facilities: ${user.facilities.length === 0 ? 'All (admin)' : user.facilities.length}`);
      console.log(`   Permissions: ${user.permissions.length}`);
      console.log('');
    });

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

revertManagersToAdmins();
