const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sabs';

async function clearDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Load models
    const Employee = require('./server/models/Employee');
    const Attendance = require('./server/models/Attendance');
    const User = require('./server/models/User');
    const LeaveRequest = require('./server/models/LeaveRequest');
    const Payroll = require('./server/models/Payroll');
    const SalaryGrade = require('./server/models/SalaryGrade');
    const PayrollSettings = require('./server/models/PayrollSettings');

    console.log('🗑️  Starting database cleanup...\n');
    console.log('⚠️  WARNING: This will delete all data except Facilities and Shifts!');
    console.log('⚠️  You have 5 seconds to cancel (Ctrl+C)...\n');

    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete Employees
    console.log('🗑️  Deleting employees...');
    const employeeCount = await Employee.countDocuments();
    await Employee.deleteMany({});
    console.log(`   ✅ Deleted ${employeeCount} employees`);

    // Delete Attendance Records
    console.log('🗑️  Deleting attendance records...');
    const attendanceCount = await Attendance.countDocuments();
    await Attendance.deleteMany({});
    console.log(`   ✅ Deleted ${attendanceCount} attendance records`);

    // Delete Leave Requests
    console.log('🗑️  Deleting leave requests...');
    const leaveCount = await LeaveRequest.countDocuments();
    await LeaveRequest.deleteMany({});
    console.log(`   ✅ Deleted ${leaveCount} leave requests`);

    // Delete Payroll Records
    console.log('🗑️  Deleting payroll records...');
    const payrollCount = await Payroll.countDocuments();
    await Payroll.deleteMany({});
    console.log(`   ✅ Deleted ${payrollCount} payroll records`);

    // Delete Salary Grades
    console.log('🗑️  Deleting salary grades...');
    const salaryGradeCount = await SalaryGrade.countDocuments();
    await SalaryGrade.deleteMany({});
    console.log(`   ✅ Deleted ${salaryGradeCount} salary grades`);

    // Delete Payroll Settings
    console.log('🗑️  Deleting payroll settings...');
    const payrollSettingsCount = await PayrollSettings.countDocuments();
    await PayrollSettings.deleteMany({});
    console.log(`   ✅ Deleted ${payrollSettingsCount} payroll settings`);

    // Delete ALL users (we'll recreate clean admin accounts)
    console.log('🗑️  Deleting all users...');
    const userCount = await User.countDocuments();
    await User.deleteMany({});
    console.log(`   ✅ Deleted ${userCount} users`);

    // Create clean super-admin account
    console.log('👤 Creating clean super-admin account...');
    const superAdmin = new User({
      username: 'superadmin',
      email: 'francisvictor.st@gmail.com',
      password: 'SuperAdmin@2026!SABS',
      role: 'super-admin',
      firstName: 'Super',
      lastName: 'Admin',
      status: 'active'
    });
    await superAdmin.save();
    console.log(`   ✅ Super Admin created`);
    console.log(`      Username: superadmin`);
    console.log(`      Email: francisvictor.st@gmail.com`);
    console.log(`      Password: SuperAdmin@2026!SABS`);

    // Create clean admin account
    console.log('👤 Creating clean admin account...');
    const admin = new User({
      username: 'admin',
      email: 'jeyleekrane@gmail.com',
      password: 'Admin@2026!SABS',
      role: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      status: 'active'
    });
    await admin.save();
    console.log(`   ✅ Admin created`);
    console.log(`      Username: admin`);
    console.log(`      Email: jeyleekrane@gmail.com`);
    console.log(`      Password: Admin@2026!SABS`);

    console.log('\n📊 Final database state:');
    const Facility = require('./server/models/Facility');
    const Shift = require('./server/models/Shift');
    
    const facilityCount = await Facility.countDocuments();
    const shiftCount = await Shift.countDocuments();
    const adminCount = await User.countDocuments();
    
    console.log(`   ✅ Facilities: ${facilityCount}`);
    console.log(`   ✅ Shifts: ${shiftCount}`);
    console.log(`   ✅ Users: ${adminCount} (super-admin + admin)`);

    console.log('\n🔑 Login Credentials:');
    console.log('   Super Admin:');
    console.log('     Username: superadmin');
    console.log('     Email: francisvictor.st@gmail.com');
    console.log('     Password: SuperAdmin@2026!SABS\n');
    console.log('   Admin:');
    console.log('     Username: admin');
    console.log('     Email: jeyleekrane@gmail.com');
    console.log('     Password: Admin@2026!SABS\n');

    console.log('✅ Database cleanup completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the cleanup
clearDatabase();
