require('dotenv').config();
const mongoose = require('mongoose');
const { seedLeavePolicies } = require('./seeds/leavePolicies');

const runSeed = async () => {
  try {
    console.log('🌱 Starting leave policies seeding...');
    console.log('📡 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB Connected');
    
    await seedLeavePolicies();
    
    console.log('\n✅ Seeding completed successfully!');
    console.log('📋 All leave policies have been initialized with default settings.');
    console.log('💡 All leaves are configured as PAID by default.');
    console.log('🔧 You can update individual policies via the API or admin interface.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding leave policies:', error);
    process.exit(1);
  }
};

runSeed();
