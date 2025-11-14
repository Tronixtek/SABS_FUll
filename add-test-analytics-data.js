const mongoose = require('mongoose');
const Facility = require('./server/models/Facility');
const Employee = require('./server/models/Employee');
const Attendance = require('./server/models/Attendance');
const moment = require('moment');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/attendance_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function addTestData() {
  try {
    console.log('🚀 Adding test analytics data...');

    // Create a test facility
    let facility = await Facility.findOne({ code: 'MAIN-HQ' });
    if (!facility) {
      facility = await Facility.create({
        name: 'Main Headquarters',
        code: 'MAIN-HQ',
        address: '123 Business Ave',
        contactPerson: 'John Manager',
        contactEmail: 'manager@company.com',
        contactPhone: '+1-234-567-8900',
        status: 'active'
      });
      console.log('✅ Created test facility:', facility.name);
    } else {
      console.log('📋 Using existing facility:', facility.name);
    }

    // Create test employees
    const employeeData = [
      {
        employeeId: 'EMP001',
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@company.com',
        department: 'Engineering',
        position: 'Senior Developer',
        phoneNumber: '+1-234-567-0001',
        facility: facility._id
      },
      {
        employeeId: 'EMP002',
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bob.smith@company.com',
        department: 'Marketing',
        position: 'Marketing Manager',
        phoneNumber: '+1-234-567-0002',
        facility: facility._id
      },
      {
        employeeId: 'EMP003',
        firstName: 'Carol',
        lastName: 'Davis',
        email: 'carol.davis@company.com',
        department: 'Finance',
        position: 'Financial Analyst',
        phoneNumber: '+1-234-567-0003',
        facility: facility._id
      },
      {
        employeeId: 'EMP004',
        firstName: 'David',
        lastName: 'Wilson',
        email: 'david.wilson@company.com',
        department: 'Engineering',
        position: 'Junior Developer',
        phoneNumber: '+1-234-567-0004',
        facility: facility._id
      },
      {
        employeeId: 'EMP005',
        firstName: 'Eva',
        lastName: 'Brown',
        email: 'eva.brown@company.com',
        department: 'HR',
        position: 'HR Specialist',
        phoneNumber: '+1-234-567-0005',
        facility: facility._id
      }
    ];

    const employees = [];
    for (const empData of employeeData) {
      let employee = await Employee.findOne({ employeeId: empData.employeeId });
      if (!employee) {
        employee = await Employee.create({
          ...empData,
          status: 'active',
          hireDate: new Date('2024-01-01')
        });
        console.log(`✅ Created employee: ${employee.firstName} ${employee.lastName}`);
      } else {
        console.log(`📋 Using existing employee: ${employee.firstName} ${employee.lastName}`);
      }
      employees.push(employee);
    }

    // Create attendance records for the last 7 days
    console.log('📅 Creating attendance records for last 7 days...');
    
    const attendanceRecords = [];
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days').startOf('day').toDate();
      
      for (const employee of employees) {
        // Simulate different attendance patterns
        const randomFactor = Math.random();
        
        if (randomFactor > 0.15) { // 85% chance of attendance
          const checkInTime = moment(date)
            .add(8 + Math.random() * 2, 'hours') // Between 8:00 and 10:00 AM
            .toDate();
          
          const checkOutTime = moment(checkInTime)
            .add(8 + Math.random() * 2, 'hours') // Work 8-10 hours
            .toDate();
          
          const isLate = checkInTime.getHours() >= 9 || 
                        (checkInTime.getHours() === 8 && checkInTime.getMinutes() > 30);
          
          // Check-in record
          attendanceRecords.push({
            employee: employee._id,
            facility: facility._id,
            date: checkInTime,
            timestamp: checkInTime,
            type: 'check-in',
            status: isLate ? 'late' : 'present',
            deviceIP: '192.168.1.100',
            deviceType: 'face-device',
            isManual: false,
            createdAt: checkInTime
          });
          
          // Check-out record (90% chance of checking out)
          if (Math.random() > 0.1) {
            attendanceRecords.push({
              employee: employee._id,
              facility: facility._id,
              date: checkOutTime,
              timestamp: checkOutTime,
              type: 'check-out',
              status: 'present',
              deviceIP: '192.168.1.100',
              deviceType: 'face-device',
              isManual: false,
              createdAt: checkOutTime
            });
          }
        }
      }
    }

    // Clear existing attendance data for test dates
    const sevenDaysAgo = moment().subtract(6, 'days').startOf('day').toDate();
    const today = moment().endOf('day').toDate();
    
    await Attendance.deleteMany({
      date: { $gte: sevenDaysAgo, $lte: today },
      employee: { $in: employees.map(e => e._id) }
    });
    
    console.log('🗑️ Cleared existing test attendance records');

    // Insert new attendance records
    if (attendanceRecords.length > 0) {
      await Attendance.insertMany(attendanceRecords);
      console.log(`✅ Created ${attendanceRecords.length} attendance records`);
    }

    // Today's specific data to ensure we have current stats
    console.log('📊 Creating today\'s attendance data...');
    
    const today_start = moment().startOf('day').toDate();
    const today_end = moment().endOf('day').toDate();
    
    // Clear today's data first
    await Attendance.deleteMany({
      date: { $gte: today_start, $lte: today_end },
      employee: { $in: employees.map(e => e._id) }
    });
    
    // Add today's data
    const todayRecords = [];
    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      
      if (i < 4) { // First 4 employees are present
        const checkInTime = moment()
          .startOf('day')
          .add(8, 'hours')
          .add(i * 15, 'minutes') // Stagger arrivals
          .toDate();
        
        const isLate = i >= 2; // Last 2 are late
        
        todayRecords.push({
          employee: employee._id,
          facility: facility._id,
          date: checkInTime,
          timestamp: checkInTime,
          type: 'check-in',
          status: isLate ? 'late' : 'present',
          deviceIP: '192.168.1.100',
          deviceType: 'face-device',
          isManual: false,
          createdAt: checkInTime
        });
        
        // Add check-out for first 2 employees (they have completed their work)
        if (i < 2) {
          const checkOutTime = moment(checkInTime).add(8, 'hours').toDate();
          todayRecords.push({
            employee: employee._id,
            facility: facility._id,
            date: checkOutTime,
            timestamp: checkOutTime,
            type: 'check-out',
            status: 'present',
            deviceIP: '192.168.1.100',
            deviceType: 'face-device',
            isManual: false,
            createdAt: checkOutTime
          });
        }
      }
      // Employee at index 4 is absent (no records)
    }
    
    if (todayRecords.length > 0) {
      await Attendance.insertMany(todayRecords);
      console.log(`✅ Created ${todayRecords.length} today's attendance records`);
    }

    console.log('🎉 Test data creation completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Facility: ${facility.name}`);
    console.log(`   - Employees: ${employees.length}`);
    console.log(`   - Total attendance records: ${attendanceRecords.length + todayRecords.length}`);
    console.log(`   - Today's present: 4 (2 on-time, 2 late)`);
    console.log(`   - Today's absent: 1`);
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    mongoose.disconnect();
  }
}

addTestData();