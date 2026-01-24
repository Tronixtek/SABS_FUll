const mongoose = require('mongoose');
require('dotenv').config();

const checkRawData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get raw data from database
    const db = mongoose.connection.db;
    const collection = db.collection('employees');
    
    const employees = await collection.find({}).limit(5).toArray();
    
    console.log('\n🔍 Checking all fields in database:\n');
    employees.forEach((emp, index) => {
      console.log(`\nEmployee ${index + 1}: ${emp.staffId} - ${emp.firstName} ${emp.lastName}`);
      console.log('All fields:', Object.keys(emp));
      
      // Check for any image-related fields
      const imageFields = Object.keys(emp).filter(key => 
        key.toLowerCase().includes('image') || key.toLowerCase().includes('photo')
      );
      
      if (imageFields.length > 0) {
        console.log('Image fields found:');
        imageFields.forEach(field => {
          console.log(`  ${field}: ${emp[field]}`);
        });
      } else {
        console.log('No image fields found');
      }
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkRawData();
