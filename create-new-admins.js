const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./server/models/User');

const newAdmins = [
  {
    firstName: 'EngenderHealth',
    lastName: 'Support',
    email: 'support@engenderhealth.org',
    username: 'engenderhealth',
    password: 'engenders@123'
  },
  {
    firstName: 'Salisu',
    lastName: 'Ahmed Ibrahim',
    email: 'salisuahmedibrahim68@gmail.com',
    username: 'salisu',
    password: 'DGadminphc@123'
  }
];

const createNewAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('');

    for (const admin of newAdmins) {
      // Check if user already exists
      const existing = await User.findOne({ email: admin.email });
      
      if (existing) {
        console.log(`⏭️  ${admin.firstName} ${admin.lastName} (${admin.email}) already exists`);
        console.log(`   Current role: ${existing.role}`);
        
        // If exists but not admin, update to admin
        if (existing.role !== 'admin') {
          existing.role = 'admin';
          existing.permissions = [
            'view_attendance',
            'edit_attendance',
            'delete_attendance',
            'manage_employees',
            'manage_facilities',
            'edit_facilities',
            'manage_shifts',
            'view_reports',
            'export_data',
            'manage_users',
            'system_settings',
            'enroll_users',
            'manage_devices',
            'view_leave_requests',
            'submit_leave',
            'approve_leave',
            'manage_leave'
          ];
          await existing.save();
          console.log(`   ✅ Updated to admin role with full permissions`);
        }
        console.log('');
        continue;
      }

      // Create admin user (password will be hashed by the User model's pre-save hook)
      const user = new User({
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        username: admin.username,
        password: admin.password, // Model's pre-save hook will hash this
        role: 'admin',
        permissions: [
          'view_attendance',
          'edit_attendance',
          'delete_attendance',
          'manage_employees',
          'manage_facilities',
          'edit_facilities',
          'manage_shifts',
          'view_reports',
          'export_data',
          'manage_users',
          'system_settings',
          'enroll_users',
          'manage_devices',
          'view_leave_requests',
          'submit_leave',
          'approve_leave',
          'manage_leave'
        ]
      });

      await user.save();
      console.log(`✅ Created admin: ${admin.firstName} ${admin.lastName}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Password: ${admin.password}`);
      console.log('');
    }

    console.log('✅ All new admins created successfully!');
    console.log('');
    console.log('📝 Login Credentials Summary:');
    console.log('='.repeat(50));
    newAdmins.forEach(admin => {
      console.log('');
      console.log(`${admin.firstName} ${admin.lastName}:`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Username: ${admin.username}`);
      console.log(`  Password: ${admin.password}`);
    });
    console.log('');
    console.log('='.repeat(50));

    await mongoose.connection.close();
    console.log('');
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admins:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createNewAdmins();
