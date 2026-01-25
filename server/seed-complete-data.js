const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');
const Facility = require('./models/Facility');
const Shift = require('./models/Shift');

// Sample employees data
const sampleEmployees = [
  {
    employeeId: 'EMP001',
    staffId: 'KNLG002',
    firstName: 'Amina',
    lastName: 'Yusuf',
    email: 'amina.yusuf@example.com',
    phone: '08012345678',
    department: 'PLANNING, MONITORING & EVALUATION (PM&E)',
    designation: 'HMIS Officer',
    cadre: 'Health Information Manager',
    gradeLevel: 8,
    gender: 'Female'
  },
  {
    employeeId: 'EMP002',
    staffId: 'KNLG003',
    firstName: 'Ibrahim',
    lastName: 'Musa',
    email: 'ibrahim.musa@example.com',
    phone: '08023456789',
    department: 'FAMILY HEALTH',
    designation: 'MNCH Coordinator',
    cadre: 'Nursing Officer',
    gradeLevel: 10,
    gender: 'Male'
  },
  {
    employeeId: 'EMP003',
    staffId: 'KNLG004',
    firstName: 'Fatima',
    lastName: 'Abdullahi',
    email: 'fatima.abdullahi@example.com',
    phone: '08034567890',
    department: 'FINANCE & ACCOUNTS',
    designation: 'Operations Accountant',
    cadre: 'Administrative Officer',
    gradeLevel: 7,
    gender: 'Female'
  },
  {
    employeeId: 'EMP004',
    staffId: 'KNLG005',
    firstName: 'Usman',
    lastName: 'Bello',
    email: 'usman.bello@example.com',
    phone: '08045678901',
    department: 'DISEASE CONTROL & IMMUNIZATION',
    designation: 'State Immunization Officer (SIO)',
    cadre: 'Community Health Officer',
    gradeLevel: 9,
    gender: 'Male'
  },
  {
    employeeId: 'EMP005',
    staffId: 'KNLG006',
    firstName: 'Aisha',
    lastName: 'Sani',
    email: 'aisha.sani@example.com',
    phone: '08056789012',
    department: 'PHARMACEUTICAL SERVICES',
    designation: 'State Logistics Officer (SLO)',
    cadre: 'Pharmacist',
    gradeLevel: 11,
    gender: 'Female'
  },
  {
    employeeId: 'EMP006',
    staffId: 'KNLG007',
    firstName: 'Yusuf',
    lastName: 'Ahmed',
    email: 'yusuf.ahmed@example.com',
    phone: '08067890123',
    department: 'MEDICAL SERVICES',
    designation: 'Medical Officer',
    cadre: 'Medical Officer',
    gradeLevel: 12,
    gender: 'Male'
  },
  {
    employeeId: 'EMP007',
    staffId: 'KNLG008',
    firstName: 'Zainab',
    lastName: 'Ibrahim',
    email: 'zainab.ibrahim@example.com',
    phone: '08078901234',
    department: 'ENVIRONMENTAL & PUBLIC HEALTH',
    designation: 'Social Mobilization Officer (SMO)',
    cadre: 'Environmental Health Officer',
    gradeLevel: 8,
    gender: 'Female'
  },
  {
    employeeId: 'EMP008',
    staffId: 'KNLG009',
    firstName: 'Muhammad',
    lastName: 'Garba',
    email: 'muhammad.garba@example.com',
    phone: '08089012345',
    department: 'ADMINISTRATION AND HUMAN RESOURCES',
    designation: 'HRH Coordinator',
    cadre: 'Administrative Officer',
    gradeLevel: 9,
    gender: 'Male'
  },
  {
    employeeId: 'EMP009',
    staffId: 'KNLG010',
    firstName: 'Hauwa',
    lastName: 'Umar',
    email: 'hauwa.umar@example.com',
    phone: '08090123456',
    department: 'FAMILY HEALTH',
    designation: 'State Nutrition Program Manager',
    cadre: 'Nutritionist',
    gradeLevel: 10,
    gender: 'Female'
  },
  {
    employeeId: 'EMP010',
    staffId: 'KNLG011',
    firstName: 'Abdullahi',
    lastName: 'Hassan',
    email: 'abdullahi.hassan@example.com',
    phone: '08001234567',
    department: 'MEDICAL SERVICES',
    designation: 'Laboratory Focal Person',
    cadre: 'Medical Laboratory Scientist',
    gradeLevel: 9,
    gender: 'Male'
  }
];

// Function to generate attendance records for the last 30 days
const generateAttendanceRecords = async (employee, facility, shift) => {
  const attendanceRecords = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Skip weekends (Saturday=6, Sunday=0)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    // Random attendance pattern
    const random = Math.random();
    let status, checkInTime, checkOutTime;
    
    if (random < 0.75) {
      // 75% present
      status = 'present';
      const baseCheckIn = new Date(date);
      const [hours, minutes] = shift.startTime.split(':');
      baseCheckIn.setHours(parseInt(hours), parseInt(minutes), 0);
      
      // Add some variation to check-in time (-5 to +15 minutes)
      const checkInVariation = Math.floor(Math.random() * 20) - 5;
      checkInTime = new Date(baseCheckIn.getTime() + checkInVariation * 60000);
      
      // Check if late (more than grace period)
      const graceMinutes = shift.graceTime?.checkIn || 15;
      const minutesLate = Math.floor((checkInTime - baseCheckIn) / 60000);
      if (minutesLate > graceMinutes) {
        status = 'late';
      }
      
      // Check-out time (add working hours + some variation)
      const [endHours, endMinutes] = shift.endTime.split(':');
      const baseCheckOut = new Date(date);
      baseCheckOut.setHours(parseInt(endHours), parseInt(endMinutes), 0);
      const checkOutVariation = Math.floor(Math.random() * 30) - 10;
      checkOutTime = new Date(baseCheckOut.getTime() + checkOutVariation * 60000);
      
    } else if (random < 0.85) {
      // 10% late arrivals
      status = 'late';
      const baseCheckIn = new Date(date);
      const [hours, minutes] = shift.startTime.split(':');
      baseCheckIn.setHours(parseInt(hours), parseInt(minutes), 0);
      
      // Late by 20-60 minutes
      const lateMinutes = 20 + Math.floor(Math.random() * 40);
      checkInTime = new Date(baseCheckIn.getTime() + lateMinutes * 60000);
      
      const [endHours, endMinutes] = shift.endTime.split(':');
      const baseCheckOut = new Date(date);
      baseCheckOut.setHours(parseInt(endHours), parseInt(endMinutes), 0);
      checkOutTime = new Date(baseCheckOut.getTime() + Math.floor(Math.random() * 20) * 60000);
      
    } else if (random < 0.90) {
      // 5% on leave
      status = 'on-leave';
      checkInTime = null;
      checkOutTime = null;
    } else {
      // 10% absent
      status = 'absent';
      checkInTime = null;
      checkOutTime = null;
    }
    
    const workingMinutes = checkInTime && checkOutTime 
      ? Math.floor((checkOutTime - checkInTime) / 60000) 
      : 0;
    
    attendanceRecords.push({
      employeeId: employee.employeeId,
      employee: employee._id,
      facility: facility._id,
      shift: shift._id,
      date: date,
      checkInTime,
      checkOutTime,
      status,
      workingMinutes,
      remarks: status === 'late' ? 'Late arrival' : status === 'absent' ? 'No show' : ''
    });
  }
  
  return attendanceRecords;
};

const seedCompleteData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get the first facility and shift
    const facility = await Facility.findOne();
    const shift = await Shift.findOne();
    
    if (!facility || !shift) {
      console.log('❌ No facility or shift found. Please create at least one facility and shift first.');
      await mongoose.connection.close();
      return;
    }
    
    console.log(`📍 Using Facility: ${facility.name}`);
    console.log(`⏰ Using Shift: ${shift.name}\n`);

    let employeesCreated = 0;
    let attendanceCreated = 0;

    for (const empData of sampleEmployees) {
      // Check if employee already exists
      const existing = await Employee.findOne({ employeeId: empData.employeeId });
      
      if (existing) {
        console.log(`⏭️  ${empData.firstName} ${empData.lastName} (${empData.employeeId}) already exists`);
        continue;
      }

      // Create employee
      const employee = await Employee.create({
        ...empData,
        facility: facility._id,
        shift: shift._id,
        status: 'active',
        employeeSelfServiceEnabled: true,
        pin: '1234' // Default PIN
      });

      employeesCreated++;
      console.log(`✅ Created employee: ${employee.firstName} ${employee.lastName} (${employee.employeeId})`);

      // Generate attendance records
      const attendanceRecords = await generateAttendanceRecords(employee, facility, shift);
      
      // Insert attendance records in bulk
      await Attendance.insertMany(attendanceRecords);
      attendanceCreated += attendanceRecords.length;
      console.log(`   📊 Generated ${attendanceRecords.length} attendance records`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Seed completed successfully!');
    console.log(`   👥 Employees created: ${employeesCreated}`);
    console.log(`   📊 Attendance records created: ${attendanceCreated}`);
    console.log('='.repeat(60));

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedCompleteData();
