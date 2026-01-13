const mongoose = require('mongoose');
const User = require('./server/models/User');
require('dotenv').config();

const resetHRPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const hrUser = await User.findOne({ username: 'hr_manager' });
    
    if (!hrUser) {
      console.log('❌ HR user not found');
      mongoose.connection.close();
      return;
    }

    // Set password to 'password123'
    hrUser.password = 'password123';
    await hrUser.save();

    console.log('✅ HR password reset successfully');
    console.log('\nLogin credentials:');
    console.log('Username: hr_manager');
    console.log('Password: password123');

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

resetHRPassword();
