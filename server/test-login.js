const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const testLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test login for Sani
    const username = 'sani';
    const password = 'Admin@123';

    console.log(`🔐 Testing login for username: "${username}"`);
    console.log(`🔑 Password: "${password}"\n`);

    // Find user (same way login controller does)
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    }).select('+password');

    if (!user) {
      console.log('❌ User not found!');
      await mongoose.connection.close();
      return;
    }

    console.log(`✅ User found!`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Status: ${user.status}`);
    console.log(`   Password hash: ${user.password.substring(0, 30)}...\n`);

    // Test password comparison
    console.log('🔐 Testing password comparison...');
    const isMatch = await user.comparePassword(password);
    
    if (isMatch) {
      console.log('✅ Password matches! Login should work.');
    } else {
      console.log('❌ Password does NOT match!');
      
      // Try bcrypt.compare directly
      console.log('\n🔐 Testing direct bcrypt.compare...');
      const directMatch = await bcrypt.compare(password, user.password);
      console.log(`   Direct bcrypt result: ${directMatch}`);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testLogin();
