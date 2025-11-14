// Quick Dashboard Test Data Creator
// Run this to add minimal data for Dashboard testing

const mongoose = require('mongoose');

// Simple data creation without complex imports
async function addQuickDashboardData() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/attendance_system');
    console.log('🔌 Connected to MongoDB');

    // Get collections directly
    const db = mongoose.connection.db;
    const facilitiesCollection = db.collection('facilities');
    const employeesCollection = db.collection('employees');
    const attendanceCollection = db.collection('attendance');

    // Create a facility
    const facility = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Main Office',
      code: 'MAIN',
      address: '123 Business St',
      contactPerson: 'Admin User',
      contactEmail: 'admin@company.com',
      contactPhone: '+1234567890',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await facilitiesCollection.deleteMany({});
    await facilitiesCollection.insertOne(facility);
    console.log('✅ Created facility');

    // Create employees
    const employees = [];
    for (let i = 1; i <= 5; i++) {
      employees.push({
        _id: new mongoose.Types.ObjectId(),
        employeeId: `EMP00${i}`,
        firstName: `Employee${i}`,
        lastName: 'Test',
        email: `emp${i}@company.com`,
        department: i <= 2 ? 'Engineering' : 'Operations',
        position: 'Staff',
        phoneNumber: `+123456789${i}`,
        facility: facility._id,
        status: 'active',
        hireDate: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await employeesCollection.deleteMany({});
    await employeesCollection.insertMany(employees);
    console.log('✅ Created 5 employees');

    // Create attendance for last 7 days
    await attendanceCollection.deleteMany({});

    const attendanceRecords = [];
    const today = new Date();
    
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      date.setHours(8, 30, 0, 0); // 8:30 AM

      for (let empIndex = 0; empIndex < employees.length; empIndex++) {
        const employee = employees[empIndex];
        
        // 80% attendance rate, varying patterns
        if (Math.random() > 0.2) {
          const checkInTime = new Date(date);
          checkInTime.setMinutes(checkInTime.getMinutes() + (empIndex * 10)); // Stagger times
          
          const isLate = empIndex >= 3; // Employees 4 & 5 are often late
          
          attendanceRecords.push({
            _id: new mongoose.Types.ObjectId(),
            employee: employee._id,
            facility: facility._id,
            date: checkInTime,
            timestamp: checkInTime,
            type: 'check-in',
            status: isLate ? 'late' : 'present',
            deviceIP: '192.168.1.100',
            deviceType: 'test',
            isManual: false,
            createdAt: checkInTime
          });

          // Add checkout (90% of the time)
          if (Math.random() > 0.1) {
            const checkOutTime = new Date(checkInTime);
            checkOutTime.setHours(checkOutTime.getHours() + 8);
            
            attendanceRecords.push({
              _id: new mongoose.Types.ObjectId(),
              employee: employee._id,
              facility: facility._id,
              date: checkOutTime,
              timestamp: checkOutTime,
              type: 'check-out',
              status: 'present',
              deviceIP: '192.168.1.100',
              deviceType: 'test',
              isManual: false,
              createdAt: checkOutTime
            });
          }
        }
      }
    }

    if (attendanceRecords.length > 0) {
      await attendanceCollection.insertMany(attendanceRecords);
      console.log(`✅ Created ${attendanceRecords.length} attendance records`);
    }

    console.log('🎉 Dashboard test data ready!');
    console.log('📊 Summary:');
    console.log(`   - Facilities: 1`);
    console.log(`   - Employees: ${employees.length}`);
    console.log(`   - Attendance records: ${attendanceRecords.length}`);
    console.log('');
    console.log('🔄 Refresh your Dashboard page to see the data!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  addQuickDashboardData();
}

module.exports = addQuickDashboardData;