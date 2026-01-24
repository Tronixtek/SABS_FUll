require('dotenv').config();
const mongoose = require('mongoose');
const { seedLeavePolicies } = require('./seeds/leavePolicies');

// Connect to cloud MongoDB
const connectDB = async () => {
  try {
    console.log('Connecting to cloud MongoDB...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Missing');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to cloud MongoDB');
    
    // Seed leave policies
    await seedLeavePolicies();
    
    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

connectDB();
