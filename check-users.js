const mongoose = require('mongoose');
const User = require('./server/models/User');
require('dotenv').config();

const checkUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({}).select('username email role permissions');
    console.log(`\nTotal users: ${users.length}\n`);
    
    users.forEach(user => {
      console.log(`${user.role.toUpperCase()}: ${user.username} (${user.email})`);
      console.log(`Permissions: ${user.permissions.join(', ')}\n`);
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkUsers();
