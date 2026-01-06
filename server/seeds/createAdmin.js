const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-tracking';
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'Sabsadmin@gmail.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Username:', existingAdmin.username);
      console.log('🎭 Role:', existingAdmin.role);
      
      // Update password if needed
      const updatePassword = process.argv.includes('--update-password');
      if (updatePassword) {
        existingAdmin.password = '123456';
        await existingAdmin.save();
        console.log('✅ Password updated successfully!');
      }
      
      await mongoose.connection.close();
      return;
    }

    // Admin permissions (same as super-admin)
    const adminPermissions = [
      'view_attendance',
      'edit_attendance',
      'delete_attendance',
      'manage_employees',
      'manage_facilities',
      'manage_shifts',
      'view_reports',
      'export_data',
      'manage_users',
      'system_settings',
      'enroll_users',
      'manage_devices'
    ];

    // Create new admin user
    const adminUser = await User.create({
      username: 'sabsadmin',
      email: 'Sabsadmin@gmail.com',
      password: '123456',
      firstName: 'SABS',
      lastName: 'Admin',
      role: 'admin',
      facilities: [], // Admin can access all facilities
      permissions: adminPermissions,
      status: 'active'
    });

    console.log('✅ Admin user created successfully!');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email:    Sabsadmin@gmail.com');
    console.log('👤 Username: sabsadmin');
    console.log('🔑 Password: 123456');
    console.log('🎭 Role:     admin');
    console.log('═══════════════════════════════════════');
    console.log('⚠️  Please change the password after first login!');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed
createAdminUser();
