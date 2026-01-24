const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const Facility = require('./models/Facility');
const Shift = require('./models/Shift');
const Attendance = require('./models/Attendance');
require('dotenv').config();

const seedEmployeesAndWeekAttendance = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB (Cloud)');

    // Get facilities and shifts
    const facilities = await Facility.find({ status: 'active' });
    const shifts = await Shift.find({});
    
    console.log(`📍 Found ${facilities.length} facilities`);
    console.log(`⏰ Found ${shifts.length} shifts`);

    if (facilities.length === 0 || shifts.length === 0) {
      console.log('❌ No facilities or shifts found. Please create them first.');
      await mongoose.connection.close();
      return;
    }

    // Sample employee data
    const employeeData = [
      { firstName: 'Aisha', lastName: 'Mohammed', email: 'aisha.mohammed@phcmb.gov.ng', gender: 'Female', department: 'PLANNING, MONITORING & EVALUATION (PM&E)', unit: 'HMIS', designation: 'HMIS Officer' },
      { firstName: 'Ibrahim', lastName: 'Sani', email: 'ibrahim.sani@phcmb.gov.ng', gender: 'Male', department: 'PLANNING, MONITORING & EVALUATION (PM&E)', unit: 'ICT', designation: 'ICT Manager' },
      { firstName: 'Fatima', lastName: 'Abdullahi', email: 'fatima.abdullahi@phcmb.gov.ng', gender: 'Female', department: 'FAMILY HEALTH', unit: 'MCH (Service Delivery, MAMII, NBC)', designation: 'MNCH Coordinator' },
      { firstName: 'Yusuf', lastName: 'Garba', email: 'yusuf.garba@phcmb.gov.ng', gender: 'Male', department: 'FAMILY HEALTH', unit: 'Nutrition', designation: 'State Nutrition Program Manager' },
      { firstName: 'Halima', lastName: 'Usman', email: 'halima.usman@phcmb.gov.ng', gender: 'Female', department: 'FINANCE & ACCOUNTS', unit: 'Accounts', designation: 'PHC Accountant' },
      { firstName: 'Musa', lastName: 'Bello', email: 'musa.bello@phcmb.gov.ng', gender: 'Male', department: 'FINANCE & ACCOUNTS', unit: 'Payroll', designation: 'Payroll Accountant' },
      { firstName: 'Hauwa', lastName: 'Adamu', email: 'hauwa.adamu@phcmb.gov.ng', gender: 'Female', department: 'ENVIRONMENTAL & PUBLIC HEALTH', unit: 'Community Engagement', designation: 'Community Engagement Focal Person' },
      { firstName: 'Kabir', lastName: 'Aliyu', email: 'kabir.aliyu@phcmb.gov.ng', gender: 'Male', department: 'ENVIRONMENTAL & PUBLIC HEALTH', unit: 'WASH', designation: 'WASH Focal Person' },
      { firstName: 'Zainab', lastName: 'Yusuf', email: 'zainab.yusuf@phcmb.gov.ng', gender: 'Female', department: 'DISEASE CONTROL & IMMUNIZATION', unit: 'Surveillance / Immunization', designation: 'State Immunization Officer (SIO)' },
      { firstName: 'Ahmad', lastName: 'Mahmud', email: 'ahmad.mahmud@phcmb.gov.ng', gender: 'Male', department: 'DISEASE CONTROL & IMMUNIZATION', unit: 'Cold Chain / SHCSS', designation: 'State Cold Chain Officer (SCCO)' },
      { firstName: 'Salamatu', lastName: 'Ibrahim', email: 'salamatu.ibrahim@phcmb.gov.ng', gender: 'Female', department: 'PHARMACEUTICAL SERVICES', unit: 'Logistics', designation: 'State Logistics Officer (SLO)' },
      { firstName: 'Umar', lastName: 'Nasir', email: 'umar.nasir@phcmb.gov.ng', gender: 'Male', department: 'MEDICAL SERVICES', unit: 'MSP', designation: 'MSP Coordinator' },
      { firstName: 'Maryam', lastName: 'Suleiman', email: 'maryam.suleiman@phcmb.gov.ng', gender: 'Female', department: 'MEDICAL SERVICES', unit: 'NCD', designation: 'NCD Focal Person' },
      { firstName: 'Hassan', lastName: 'Ahmad', email: 'hassan.ahmad@phcmb.gov.ng', gender: 'Male', department: 'MEDICAL SERVICES', unit: 'Laboratory', designation: 'Laboratory Focal Person' },
      { firstName: 'Amina', lastName: 'Abubakar', email: 'amina.abubakar@phcmb.gov.ng', gender: 'Female', department: 'PLANNING, MONITORING & EVALUATION (PM&E)', unit: 'Monitoring & Evaluation', designation: 'Monitoring & Evaluation Officer' }
    ];

    console.log('\n👥 Creating employees...');
    
    const createdEmployees = [];
    let employeeCounter = 1;

    for (const empData of employeeData) {
      // Check if employee already exists
      const existing = await Employee.findOne({ email: empData.email });
      if (existing) {
        console.log(`⏭️  ${empData.firstName} ${empData.lastName} already exists`);
        createdEmployees.push(existing);
        continue;
      }

      const facility = facilities[Math.floor(Math.random() * facilities.length)];
      const shift = shifts[Math.floor(Math.random() * shifts.length)];

      const employee = new Employee({
        employeeId: `EMP${String(employeeCounter).padStart(5, '0')}`,
        staffId: `KNLG${String(employeeCounter).padStart(3, '0')}`,
        firstName: empData.firstName,
        lastName: empData.lastName,
        email: empData.email,
        phone: `080${Math.floor(10000000 + Math.random() * 90000000)}`,
        gender: empData.gender,
        dateOfBirth: new Date(1985 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        hireDate: new Date(2020, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        department: empData.department,
        unit: empData.unit,
        designation: empData.designation,
        cadre: 'GL ' + (6 + Math.floor(Math.random() * 8)),
        facility: facility._id,
        shift: shift._id,
        status: 'active',
        isDeleted: false,
        employmentType: 'Full-time',
        nationality: 'Nigerian'
      });

      await employee.save();
      createdEmployees.push(employee);
      console.log(`✅ Created: ${employee.firstName} ${employee.lastName} - ${employee.designation}`);
      employeeCounter++;
    }

    console.log(`\n✅ Total employees: ${createdEmployees.length}`);

    // Create attendance for this week (Monday to today)
    console.log('\n📅 Creating attendance records for this week...');

    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate Monday of this week
    const monday = new Date(today);
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // If Sunday, go back 6 days
    monday.setDate(today.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);

    // Create attendance from Monday to today
    const daysToCreate = currentDay === 0 ? 0 : currentDay; // Don't create for Sunday
    
    for (let dayOffset = 0; dayOffset < daysToCreate; dayOffset++) {
      const attendanceDate = new Date(monday);
      attendanceDate.setDate(monday.getDate() + dayOffset);
      
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][attendanceDate.getDay()];
      console.log(`\n📆 Creating attendance for ${dayName}, ${attendanceDate.toDateString()}`);

      for (const employee of createdEmployees) {
        const shift = shifts.find(s => s._id.equals(employee.shift));
        if (!shift || !shift.startTime) continue;

        // Check if attendance already exists
        const nextDay = new Date(attendanceDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const existing = await Attendance.findOne({
          employee: employee._id,
          checkInTime: { $gte: attendanceDate, $lt: nextDay }
        });

        if (existing) {
          console.log(`  ⏭️  ${employee.firstName} ${employee.lastName} - already has attendance`);
          continue;
        }

        const [shiftHour, shiftMinute] = shift.startTime.split(':').map(Number);
        const [endHour, endMinute] = shift.endTime.split(':').map(Number);
        
        // 80% on time, 20% late
        const isLate = Math.random() < 0.2;
        
        let checkInTime = new Date(attendanceDate);
        let status = 'present';
        let lateMinutes = 0;
        
        if (isLate) {
          lateMinutes = Math.floor(Math.random() * 45) + 15; // 15-60 minutes late
          checkInTime.setHours(shiftHour, shiftMinute + lateMinutes, Math.floor(Math.random() * 60));
          status = 'late';
        } else {
          const earlyMinutes = Math.floor(Math.random() * 20);
          checkInTime.setHours(shiftHour, Math.max(0, shiftMinute - earlyMinutes), Math.floor(Math.random() * 60));
        }

        // 90% have checked out
        let checkOutTime = null;
        if (Math.random() < 0.9) {
          checkOutTime = new Date(attendanceDate);
          const extraMinutes = Math.floor(Math.random() * 30);
          checkOutTime.setHours(endHour, endMinute + extraMinutes, Math.floor(Math.random() * 60));
        }

        const scheduledCheckIn = new Date(attendanceDate);
        scheduledCheckIn.setHours(shiftHour, shiftMinute, 0);
        
        const scheduledCheckOut = new Date(attendanceDate);
        scheduledCheckOut.setHours(endHour, endMinute, 0);

        const attendance = new Attendance({
          employee: employee._id,
          facility: employee.facility,
          shift: employee.shift,
          checkInTime,
          checkOutTime,
          scheduledCheckIn,
          scheduledCheckOut,
          status,
          lateMinutes,
          hoursWorked: checkOutTime ? Math.round((checkOutTime - checkInTime) / (1000 * 60 * 60) * 10) / 10 : 0
        });

        await attendance.save();
        console.log(`  ✅ ${employee.firstName} ${employee.lastName} - ${status} (${lateMinutes}min late)`);
      }
    }

    console.log('\n🎉 Seeding completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Employees: ${createdEmployees.length}`);
    console.log(`   - Days with attendance: ${daysToCreate}`);
    console.log(`   - Total attendance records: ~${createdEmployees.length * daysToCreate}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedEmployeesAndWeekAttendance();
