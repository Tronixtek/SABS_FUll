const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('./server/models/Employee');

const fixStaffIds = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all employees without staffId
    const employees = await Employee.find({ 
      $or: [
        { staffId: { $exists: false } },
        { staffId: null },
        { staffId: '' }
      ]
    });

    console.log(`\n📋 Found ${employees.length} employees without Staff ID\n`);

    // Get the highest existing staffId number
    const allEmployees = await Employee.find({ staffId: { $exists: true, $ne: null } })
      .sort({ staffId: -1 })
      .limit(1);
    
    let nextNumber = 1;
    if (allEmployees.length > 0 && allEmployees[0].staffId) {
      const match = allEmployees[0].staffId.match(/KNLG(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    // Assign staff IDs
    for (let employee of employees) {
      const staffId = `KNLG${String(nextNumber).padStart(4, '0')}`;
      employee.staffId = staffId;
      await employee.save();
      
      console.log(`✅ Assigned ${staffId} to ${employee.fullName}`);
      nextNumber++;
    }

    console.log('\n✅ All staff IDs assigned successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing staff IDs:', error);
    process.exit(1);
  }
};

fixStaffIds();
