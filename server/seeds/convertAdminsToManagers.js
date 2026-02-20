const mongoose = require('mongoose');
const User = require('../models/User');
const Facility = require('../models/Facility');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const convertAdminsToManagers = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-tracking';
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');

    // Specific users to convert to PHC_HQ facility managers
    const usersToConvert = [
      'karaye@gmail.com',
      'usmanwadaibrahim955@gmail.com',
      'Umarubajibrin@gmail.com',
      'zeesani35@gmail.com'
    ];

    // Find PHC_HQ facility
    const phcHQ = await Facility.findOne({ code: 'PHC_HQ' });
    
    if (!phcHQ) {
      console.error('❌ PHC_HQ facility not found!');
      console.log('Available facilities:');
      const facilities = await Facility.find({}, 'name code');
      facilities.forEach(f => console.log(`  - ${f.name} (${f.code})`));
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`✅ Found PHC_HQ facility: ${phcHQ.name} (ID: ${phcHQ._id})`);
    console.log('');

    // Find the specific users to convert
    const users = await User.find({
      email: { $in: usersToConvert }
    });

    if (users.length === 0) {
      console.log('ℹ️  No users found with the specified emails');
      await mongoose.connection.close();
      return;
    }

    console.log(`📋 Found ${users.length} user(s) to convert to PHC_HQ managers:`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.username}) - Current role: ${user.role}`);
    });
    console.log('');

    // Manager permissions (facility-level access)
    const managerPermissions = [
      'view_attendance',
      'edit_attendance',
      'manage_employees',
      'manage_shifts',
      'view_reports',
      'export_data',
      'enroll_users'
    ];

    // Update each user to manager
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const oldRole = user.role;
        
        user.role = 'manager';
        user.facilities = [phcHQ._id];
        user.permissions = managerPermissions;
        
        await user.save();
        
        console.log(`✅ Converted: ${user.email}`);
        console.log(`   - Role: ${oldRole} → manager`);
        console.log(`   - Facility: ${phcHQ.name}`);
        console.log(`   - Permissions: ${managerPermissions.length} assigned`);
        console.log('');
        
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to convert ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('═══════════════════════════════════════');
    console.log('📊 Conversion Summary:');
    console.log(`   ✅ Successfully converted: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   � Total targeted: ${usersToConvert.length}`);
    console.log('═══════════════════════════════════════');
    console.log('');

    // Show all managers for PHC_HQ
    const phcManagers = await User.find({
      role: 'manager',
      facilities: phcHQ._id
    });

    console.log(`👥 PHC_HQ Facility Managers (${phcManagers.length}):`);
    phcManagers.forEach(user => {
      console.log(`   - ${user.email} (${user.firstName} ${user.lastName})`);
    });

    await mongoose.connection.close();
    console.log('');
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error during conversion:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
convertAdminsToManagers();
