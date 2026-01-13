const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config();

const Employee = require('./server/models/Employee');
const Facility = require('./server/models/Facility');
const Shift = require('./server/models/Shift');
const Attendance = require('./server/models/Attendance');

// Sample employee data
const employeeTemplates = [
  { firstName: 'John', lastName: 'Smith', department: 'IT', designation: 'Developer' },
  { firstName: 'Sarah', lastName: 'Johnson', department: 'HR', designation: 'HR Manager' },
  { firstName: 'Michael', lastName: 'Brown', department: 'Finance', designation: 'Accountant' },
  { firstName: 'Emily', lastName: 'Davis', department: 'Marketing', designation: 'Marketing Manager' },
  { firstName: 'David', lastName: 'Wilson', department: 'IT', designation: 'System Admin' },
  { firstName: 'Jennifer', lastName: 'Martinez', department: 'Sales', designation: 'Sales Rep' },
  { firstName: 'Robert', lastName: 'Garcia', department: 'Operations', designation: 'Operations Manager' },
  { firstName: 'Lisa', lastName: 'Anderson', department: 'Customer Service', designation: 'CS Rep' },
  { firstName: 'James', lastName: 'Taylor', department: 'IT', designation: 'Tech Lead' },
  { firstName: 'Mary', lastName: 'Thomas', department: 'Finance', designation: 'Financial Analyst' },
  { firstName: 'William', lastName: 'Moore', department: 'HR', designation: 'Recruiter' },
  { firstName: 'Patricia', lastName: 'Jackson', department: 'Marketing', designation: 'Content Creator' },
  { firstName: 'Richard', lastName: 'White', department: 'IT', designation: 'DevOps Engineer' },
  { firstName: 'Linda', lastName: 'Harris', department: 'Sales', designation: 'Account Manager' },
  { firstName: 'Charles', lastName: 'Martin', department: 'Operations', designation: 'Coordinator' },
  { firstName: 'Barbara', lastName: 'Thompson', department: 'Customer Service', designation: 'Support Lead' },
  { firstName: 'Joseph', lastName: 'Lee', department: 'IT', designation: 'QA Engineer' },
  { firstName: 'Susan', lastName: 'Walker', department: 'Finance', designation: 'Payroll Specialist' },
  { firstName: 'Thomas', lastName: 'Hall', department: 'Marketing', designation: 'SEO Specialist' },
  { firstName: 'Jessica', lastName: 'Allen', department: 'HR', designation: 'Training Manager' }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-tracking');
    console.log('✅ Connected to MongoDB\n');

    // Get existing facilities
    const facilities = await Facility.find({ status: 'active' }).limit(3);
    
    if (facilities.length === 0) {
      console.log('❌ No facilities found. Please create facilities first.');
      process.exit(1);
    }

    console.log(`🏢 Found ${facilities.length} facilities:`);
    facilities.forEach(f => console.log(`   - ${f.name} (${f.code})`));

    // Get or create shifts for each facility
    console.log('\n⏰ Setting up shifts...');
    const shiftsByFacility = {};
    
    for (const facility of facilities) {
      let shift = await Shift.findOne({ facility: facility._id, status: 'active' });
      
      if (!shift) {
        shift = await Shift.create({
          name: `${facility.code} - Morning Shift`,
          code: `${facility.code}-MS`,
          facility: facility._id,
          startTime: '09:00',
          endTime: '17:00',
          workingHours: 8,
          graceMinutesLate: 15,
          graceMinutesEarly: 15,
          breakTime: 60,
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          status: 'active'
        });
        console.log(`   ✓ Created shift for ${facility.name}`);
      } else {
        console.log(`   ✓ Using existing shift for ${facility.name}`);
      }
      
      shiftsByFacility[facility._id.toString()] = shift;
    }

    // Delete existing test employees (optional)
    console.log('\n🗑️  Checking for existing employees...');
    const existingCount = await Employee.countDocuments({ status: 'active' });
    console.log(`   Found ${existingCount} existing employees`);
    
    // Find the highest employee number to avoid conflicts
    const lastEmployee = await Employee.findOne({
      employeeId: { $regex: /^EMP\d+$/ }
    }).sort({ employeeId: -1 });
    
    let startingNumber = 1;
    if (lastEmployee) {
      const match = lastEmployee.employeeId.match(/^EMP(\d+)$/);
      if (match) {
        startingNumber = parseInt(match[1]) + 1;
        console.log(`   Starting employee IDs from EMP${String(startingNumber).padStart(4, '0')}`);
      }
    }
    
    // Create employees distributed across facilities
    console.log('\n👥 Creating employees...');
    const employeesPerFacility = Math.ceil(employeeTemplates.length / facilities.length);
    const createdEmployees = [];
    let employeeCounter = startingNumber;

    for (let i = 0; i < facilities.length; i++) {
      const facility = facilities[i];
      const shift = shiftsByFacility[facility._id.toString()];
      const startIdx = i * employeesPerFacility;
      const endIdx = Math.min(startIdx + employeesPerFacility, employeeTemplates.length);
      const facilityEmployees = employeeTemplates.slice(startIdx, endIdx);

      console.log(`\n   Creating ${facilityEmployees.length} employees for ${facility.name}:`);

      for (const template of facilityEmployees) {
        const employeeId = `EMP${String(employeeCounter).padStart(4, '0')}`;
        const deviceId = `DEV${String(employeeCounter).padStart(4, '0')}`;
        
        const employee = await Employee.create({
          employeeId,
          firstName: template.firstName,
          lastName: template.lastName,
          email: `${template.firstName.toLowerCase()}.${template.lastName.toLowerCase()}${employeeCounter}@company.com`,
          phone: `+234${Math.floor(Math.random() * 1000000000)}`,
          facility: facility._id,
          department: template.department,
          designation: template.designation,
          shift: shift._id,
          deviceId,
          joiningDate: moment().subtract(Math.floor(Math.random() * 365), 'days').toDate(),
          status: 'active'
        });

        createdEmployees.push(employee);
        console.log(`      ✓ ${employee.employeeId} - ${employee.firstName} ${employee.lastName}`);
        employeeCounter++;
      }
    }

    console.log(`\n✅ Created ${createdEmployees.length} employees across ${facilities.length} facilities`);

    // Create late arrival records for the past 30 days
    console.log('\n📊 Creating late arrival records...');
    const attendanceRecords = [];
    const today = moment().startOf('day');

    for (let daysAgo = 1; daysAgo <= 30; daysAgo++) {
      const date = today.clone().subtract(daysAgo, 'days');
      
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (date.day() === 0 || date.day() === 6) {
        continue;
      }

      // Randomly select 25-45% of employees to be late each day
      const numLate = Math.floor(createdEmployees.length * (0.25 + Math.random() * 0.2));
      const shuffled = [...createdEmployees].sort(() => Math.random() - 0.5);
      const lateToday = shuffled.slice(0, numLate);

      for (const employee of lateToday) {
        const shift = shiftsByFacility[employee.facility.toString()];
        if (!shift) continue;

        // Random late minutes: 70% are 5-30 min late, 30% are 31-90 min late
        const lateMinutes = Math.random() > 0.7 
          ? Math.floor(31 + Math.random() * 60) 
          : Math.floor(5 + Math.random() * 26);

        const [hours, minutes] = shift.startTime.split(':');
        const scheduledCheckIn = date.clone()
          .hour(parseInt(hours))
          .minute(parseInt(minutes))
          .second(0);

        const [endHours, endMinutes] = shift.endTime.split(':');
        const scheduledCheckOut = date.clone()
          .hour(parseInt(endHours))
          .minute(parseInt(endMinutes))
          .second(0);

        const actualCheckIn = scheduledCheckIn.clone().add(lateMinutes, 'minutes');

        attendanceRecords.push({
          employee: employee._id,
          employeeId: employee.employeeId,
          facility: employee.facility,
          shift: shift._id,
          date: date.toDate(),
          type: 'check-in',
          status: 'late',
          timestamp: actualCheckIn.toDate(),
          scheduledCheckIn: scheduledCheckIn.toDate(),
          scheduledCheckOut: scheduledCheckOut.toDate(),
          lateArrival: lateMinutes,
          deviceIP: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          xo5Data: {
            deviceKey: `device-${employee.facility.toString().slice(-6)}`,
            verificationMethod: ['face']
          }
        });
      }
    }

    console.log(`   Creating ${attendanceRecords.length} late arrival records...`);
    await Attendance.insertMany(attendanceRecords);
    console.log('   ✅ Late arrival records created');

    // Summary statistics
    console.log('\n📈 Summary Statistics:');
    console.log('═══════════════════════════════════════════════════════');

    const employeesByFacility = createdEmployees.reduce((acc, emp) => {
      const facId = emp.facility.toString();
      if (!acc[facId]) {
        const facility = facilities.find(f => f._id.toString() === facId);
        acc[facId] = {
          name: facility.name,
          code: facility.code,
          employees: []
        };
      }
      acc[facId].employees.push(emp);
      return acc;
    }, {});

    const recordsByFacility = attendanceRecords.reduce((acc, record) => {
      const facId = record.facility.toString();
      if (!acc[facId]) {
        acc[facId] = {
          totalLate: 0,
          employees: new Set()
        };
      }
      acc[facId].totalLate++;
      acc[facId].employees.add(record.employee.toString());
      return acc;
    }, {});

    for (const [facId, data] of Object.entries(employeesByFacility)) {
      const lateStats = recordsByFacility[facId] || { totalLate: 0, employees: new Set() };
      console.log(`\n🏢 ${data.name} (${data.code}):`);
      console.log(`   Employees: ${data.employees.length}`);
      console.log(`   Late Arrivals: ${lateStats.totalLate}`);
      console.log(`   Employees with late records: ${lateStats.employees.size}`);
      console.log(`   Avg late/employee: ${lateStats.employees.size > 0 ? (lateStats.totalLate / lateStats.employees.size).toFixed(1) : 0}`);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`\n🎉 Database seeded successfully!`);
    console.log(`\n📋 Next Steps:`);
    console.log(`   1. Refresh your dashboard to see late arrivals by facility`);
    console.log(`   2. Click on any facility card to view detailed late employee list`);
    console.log(`   3. Check the Employees page to see all created employees`);
    console.log(`   4. Visit the Attendance page to see late arrival records\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

seedDatabase();
