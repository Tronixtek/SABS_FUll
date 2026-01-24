const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('./server/models/Employee');

const checkImages = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check all employees
    const allEmployees = await Employee.find({});
    console.log(`\nTotal employees: ${allEmployees.length}`);
    
    // Check for profileImage
    const withProfileImage = await Employee.find({ profileImage: { $ne: null, $exists: true } });
    console.log(`\nEmployees with profileImage: ${withProfileImage.length}`);
    withProfileImage.forEach(e => {
      console.log(`  ${e.staffId} - ${e.firstName} ${e.lastName}: ${e.profileImage}`);
    });
    
    // Check for profilePhoto (old field name)
    const withProfilePhoto = await Employee.find({ profilePhoto: { $ne: null, $exists: true } });
    console.log(`\nEmployees with profilePhoto: ${withProfilePhoto.length}`);
    withProfilePhoto.forEach(e => {
      console.log(`  ${e.staffId} - ${e.firstName} ${e.lastName}: ${e.profilePhoto}`);
    });

    // Show sample employee
    const sample = allEmployees[0];
    console.log(`\nSample employee (${sample.staffId}):`);
    console.log(JSON.stringify({
      staffId: sample.staffId,
      firstName: sample.firstName,
      profileImage: sample.profileImage,
      profilePhoto: sample.profilePhoto,
      faceImage: sample.faceImage
    }, null, 2));

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkImages();
