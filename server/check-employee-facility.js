const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('./models/Employee');

const checkEmployee = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const employee = await Employee.findOne({ email: 'ijeyleekrane@gmail.com' })
      .populate('facility', 'facilityName facilityCode timezone')
      .populate('shift', 'shiftName startTime endTime');

    if (!employee) {
      console.log('❌ Employee not found');
      await mongoose.connection.close();
      return;
    }

    console.log('Employee:', employee.firstName, employee.lastName);
    console.log('Email:', employee.email);
    console.log('\nFacility field in DB:', employee.facility);
    console.log('Shift field in DB:', employee.shift);
    console.log('\nFull employee object:');
    console.log(JSON.stringify(employee, null, 2));

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkEmployee();
