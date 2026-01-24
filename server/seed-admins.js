const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const admins = [
  {
    firstName: 'Sani',
    lastName: 'Karaye',
    email: 'karaye@gmail.com',
    username: 'sani',
    password: 'Admin@123'
  },
  {
    firstName: 'Usman',
    lastName: 'Wada',
    email: 'usmanwadaibrahim955@gmail.com',
    username: 'usman',
    password: 'Admin@123'
  },
  {
    firstName: 'Umar',
    lastName: 'Ubaji',
    email: 'Umarubajibrin@gmail.com',
    username: 'umar',
    password: 'Admin@123'
  },
  {
    firstName: 'Zainab',
    lastName: 'Sani',
    email: 'zeesani35@gmail.com',
    username: 'zainab',
    password: 'Admin@123'
  }
];

const seedAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    for (const admin of admins) {
      // Check if user already exists
      const existing = await User.findOne({ email: admin.email });
      
      if (existing) {
        console.log(`⏭️  ${admin.firstName} ${admin.lastName} (${admin.email}) already exists`);
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(admin.password, salt);

      // Create admin user
      const user = new User({
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        username: admin.username,
        password: hashedPassword,
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
      console.log(`✅ Created admin: ${admin.firstName} ${admin.lastName} (${admin.email})`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Password: ${admin.password}`);
    }

    console.log('\n✅ All admins created successfully!');
    console.log('\n📝 Login credentials:');
    admins.forEach(admin => {
      console.log(`\n${admin.firstName} ${admin.lastName}:`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Username: ${admin.username}`);
      console.log(`  Password: ${admin.password}`);
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error seeding admins:', error);
    process.exit(1);
  }
};

seedAdmins();
