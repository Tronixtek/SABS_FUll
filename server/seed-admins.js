const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const admins = [
  {
    name: 'Sani',
    email: 'karaye@gmail.com',
    username: 'sani',
    password: 'Admin@123'
  },
  {
    name: 'Usman',
    email: 'usmanwadaibrahim955@gmail.com',
    username: 'usman',
    password: 'Admin@123'
  },
  {
    name: 'Umar',
    email: 'Umarubajibrin@gmail.com',
    username: 'umar',
    password: 'Admin@123'
  },
  {
    name: 'Zainab',
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
        console.log(`⏭️  ${admin.name} (${admin.email}) already exists`);
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(admin.password, salt);

      // Create admin user
      const user = new User({
        name: admin.name,
        email: admin.email,
        username: admin.username,
        password: hashedPassword,
        role: 'admin',
        permissions: [
          'view_dashboard',
          'manage_employees',
          'view_attendance',
          'mark_attendance',
          'approve_attendance',
          'view_reports',
          'manage_facilities',
          'manage_shifts',
          'manage_breaks',
          'view_analytics',
          'manage_settings',
          'approve_leave',
          'manage_payroll'
        ]
      });

      await user.save();
      console.log(`✅ Created admin: ${admin.name} (${admin.email})`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Password: ${admin.password}`);
    }

    console.log('\n✅ All admins created successfully!');
    console.log('\n📝 Login credentials:');
    admins.forEach(admin => {
      console.log(`\n${admin.name}:`);
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
