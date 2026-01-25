const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const checkAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const emails = [
      'karaye@gmail.com',
      'usmanwadaibrahim955@gmail.com',
      'Umarubajibrin@gmail.com',
      'zeesani35@gmail.com'
    ];

    for (const email of emails) {
      const user = await User.findOne({ email });
      
      if (user) {
        console.log(`📧 ${email}`);
        console.log(`   Name: ${user.firstName} ${user.lastName}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Password Hash: ${user.password.substring(0, 20)}...`);
        console.log(`   Permissions: ${user.permissions.length} permissions`);
        console.log('');
      } else {
        console.log(`❌ ${email} - NOT FOUND`);
        console.log('');
      }
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkAdmins();
