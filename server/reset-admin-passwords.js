const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const resetPasswords = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const admins = [
      { email: 'karaye@gmail.com', password: 'Admin@123' },
      { email: 'usmanwadaibrahim955@gmail.com', password: 'Admin@123' },
      { email: 'Umarubajibrin@gmail.com', password: 'Admin@123' },
      { email: 'zeesani35@gmail.com', password: 'Admin@123' }
    ];

    for (const admin of admins) {
      const user = await User.findOne({ email: admin.email });
      
      if (!user) {
        console.log(`❌ ${admin.email} not found`);
        continue;
      }

      // Update password (this will trigger the pre-save hook to hash it)
      user.password = admin.password;
      await user.save();
      
      console.log(`✅ Reset password for ${user.firstName} ${user.lastName} (${admin.email})`);
    }

    console.log('\n✅ All passwords reset to: Admin@123');
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

resetPasswords();
