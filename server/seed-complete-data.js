const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');
const Facility = require('./models/Facility');
const Shift = require('./models/Shift');
const LeaveRequest = require('./models/LeaveRequest');

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
    gender: 'Female',
    dateOfBirth: '1990-05-15',
    joiningDate: '2015-03-01',
    nationality: 'Nigeria',
    nationalId: '12345678901',
    education: 'B.Sc/B.A/B.Eng',
    address: {
      street: '12 Hospital Road',
      city: 'Kano',
      state: 'Kano',
      country: 'Nigeria'
    }
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
    gender: 'Male',
    dateOfBirth: '1988-08-20',
    joiningDate: '2013-06-15',
    nationality: 'Nigeria',
    nationalId: '23456789012',
    education: 'M.Sc/M.A/MBA',
    address: {
      street: '45 Ahmadu Bello Way',
      city: 'Kano',
      state: 'Kano',
      country: 'Nigeria'
    }
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
    gender: 'Female',
    dateOfBirth: '1992-03-10',
    joiningDate: '2016-09-01',
    nationality: 'Nigeria',
    nationalId: '34567890123',
    education: 'HND',
    address: {
      street: '23 Murtala Mohammed Way',
      city: 'Kano',
      state: 'Kano',
      country: 'Nigeria'
    }
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
    gender: 'Male',
    dateOfBirth: '1989-11-25',
    joiningDate: '2014-01-10',
    nationality: 'Nigeria',
    nationalId: '45678901234',
    education: 'B.Sc/B.A/B.Eng',
    address: {
      street: '67 Zaria Road',
      city: 'Kano',
      state: 'Kano',
      country: 'Nigeria'
    }
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
    gender: 'Female',
    dateOfBirth: '1987-07-18',
    joiningDate: '2012-04-20',
    nationality: 'Nigeria',
    nationalId: '56789012345',
    education: 'B.Sc/B.A/B.Eng',
    address: {
      street: '89 Ibrahim Taiwo Road',
      city: 'Kano',
      state: 'Kano',
      country: 'Nigeria'
    }
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
    gender: 'Male',
    dateOfBirth: '1985-12-05',
    joiningDate: '2011-08-01',
    nationality: 'Nigeria',
    nationalId: '67890123456',
    education: 'B.Sc/B.A/B.Eng',
    address: {
      street: '34 BUK Road',
      city: 'Kano',
      state: 'Kano',
      country: 'Nigeria'
    }
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
    gender: 'Female',
    dateOfBirth: '1991-04-30',
    joiningDate: '2015-11-15',
    nationality: 'Nigeria',
    nationalId: '78901234567',
    education: 'B.Sc/B.A/B.Eng',
    address: {
      street: '56 Zoo Road',
      city: 'Kano',
      state: 'Kano',
      country: 'Nigeria'
    }
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
    gender: 'Male',
    dateOfBirth: '1990-09-12',
    joiningDate: '2014-07-01',
    nationality: 'Nigeria',
    nationalId: '89012345678',
    education: 'HND',
    address: {
      street: '78 France Road',
      city: 'Kano',
      state: 'Kano',
      country: 'Nigeria'
    }
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
    gender: 'Female',
    dateOfBirth: '1988-06-22',
    joiningDate: '2013-10-01',
    nationality: 'Nigeria',
    nationalId: '90123456789',
    education: 'M.Sc/M.A/MBA',
    address: {
      street: '90 Katsina Road',
      city: 'Kano',
      state: 'Kano',
      country: 'Nigeria'
    }
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
    gender: 'Male',
    dateOfBirth: '1989-02-14',
    joiningDate: '2014-05-20',
    nationality: 'Nigeria',
    nationalId: '01234567890',
    education: 'B.Sc/B.A/B.Eng',
    address: {
      street: '12 Hadejia Road',
      city: 'Kano',
      state: 'Kano',
      country: 'Nigeria'
    }
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
    
    // Calculate scheduled times
    const [startHours, startMinutes] = shift.startTime.split(':');
    const [endHours, endMinutes] = shift.endTime.split(':');
    
    const scheduledCheckIn = new Date(date);
    scheduledCheckIn.setHours(parseInt(startHours), parseInt(startMinutes), 0);
    
    const scheduledCheckOut = new Date(date);
    scheduledCheckOut.setHours(parseInt(endHours), parseInt(endMinutes), 0);
    
    // Random attendance pattern
    const random = Math.random();
    let status, checkInTime, checkOutTime;
    
    if (random < 0.75) {
      // 75% present
      status = 'present';
      
      // Add some variation to check-in time (-5 to +15 minutes)
      const checkInVariation = Math.floor(Math.random() * 20) - 5;
      checkInTime = new Date(scheduledCheckIn.getTime() + checkInVariation * 60000);
      
      // Check if late (more than grace period)
      const graceMinutes = shift.graceTime?.checkIn || 15;
      const minutesLate = Math.floor((checkInTime - scheduledCheckIn) / 60000);
      if (minutesLate > graceMinutes) {
        status = 'late';
      }
      
      // Check-out time (add working hours + some variation)
      const checkOutVariation = Math.floor(Math.random() * 30) - 10;
      checkOutTime = new Date(scheduledCheckOut.getTime() + checkOutVariation * 60000);
      
    } else if (random < 0.85) {
      // 10% late arrivals
      status = 'late';
      
      // Late by 20-60 minutes
      const lateMinutes = 20 + Math.floor(Math.random() * 40);
      checkInTime = new Date(scheduledCheckIn.getTime() + lateMinutes * 60000);
      
      checkOutTime = new Date(scheduledCheckOut.getTime() + Math.floor(Math.random() * 20) * 60000);
      
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
    
    // Create check-in record
    if (checkInTime) {
      attendanceRecords.push({
        employeeId: employee.employeeId,
        employee: employee._id,
        facility: facility._id,
        shift: shift._id,
        date: date,
        type: 'check-in',
        timestamp: checkInTime,
        scheduledCheckIn: scheduledCheckIn,
        scheduledCheckOut: scheduledCheckOut,
        status,
        workHours: workingMinutes / 60,
        lateArrival: status === 'late' ? Math.floor((checkInTime - scheduledCheckIn) / 60000) : 0,
        checkIn: {
          time: checkInTime,
          method: 'face'
        }
      });
    }
    
    // Create check-out record
    if (checkOutTime) {
      attendanceRecords.push({
        employeeId: employee.employeeId,
        employee: employee._id,
        facility: facility._id,
        shift: shift._id,
        date: date,
        type: 'check-out',
        timestamp: checkOutTime,
        scheduledCheckIn: scheduledCheckIn,
        scheduledCheckOut: scheduledCheckOut,
        status,
        workHours: workingMinutes / 60,
        checkOut: {
          time: checkOutTime,
          method: 'face'
        }
      });
    }
    
    // For absent or on-leave, create a single record
    if (status === 'absent' || status === 'on-leave') {
      attendanceRecords.push({
        employeeId: employee.employeeId,
        employee: employee._id,
        facility: facility._id,
        shift: shift._id,
        date: date,
        type: 'check-in',
        timestamp: scheduledCheckIn,
        scheduledCheckIn: scheduledCheckIn,
        scheduledCheckOut: scheduledCheckOut,
        status,
        workHours: 0
      });
    }
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
    let leaveRequestsCreated = 0;
    const createdEmployees = [];

    for (const empData of sampleEmployees) {
      // Check if employee already exists
      const existing = await Employee.findOne({ employeeId: empData.employeeId });
      
      if (existing) {
        console.log(`⏭️  ${empData.firstName} ${empData.lastName} (${empData.employeeId}) already exists`);
        createdEmployees.push(existing); // Add to list for leave requests
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
      createdEmployees.push(employee);
      console.log(`✅ Created employee: ${employee.firstName} ${employee.lastName} (${employee.employeeId})`);

      // Generate attendance records
      const attendanceRecords = await generateAttendanceRecords(employee, facility, shift);
      
      // Insert attendance records in bulk
      await Attendance.insertMany(attendanceRecords);
      attendanceCreated += attendanceRecords.length;
      console.log(`   📊 Generated ${attendanceRecords.length} attendance records`);
    }

    // Create some leave requests for demonstration
    console.log('\n📝 Creating leave requests...\n');
    
    const leaveTypes = [
      { type: 'annual', days: 5, name: 'Annual Leave' },
      { type: 'examination', days: 3, name: 'Examination Leave' },
      { type: 'official-assignment', days: 2, name: 'Official Assignment' },
      { type: 'casual', days: 1, name: 'Casual Leave' }
    ];

    for (let i = 0; i < Math.min(4, createdEmployees.length); i++) {
      const employee = createdEmployees[i];
      const leaveType = leaveTypes[i];
      
      // Create leave request for dates 10-15 days ago
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (10 + i * 2));
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + leaveType.days - 1);
      endDate.setHours(23, 59, 59, 999);

      const leaveRequest = await LeaveRequest.create({
        employee: employee._id,
        employeeId: employee.employeeId,
        facility: facility._id,
        leaveType: leaveType.type,
        startDate,
        endDate,
        requestDate: new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000), // Requested 7 days before
        reason: `${leaveType.name} - Seed data`,
        status: 'approved',
        approvedBy: 'System Admin',
        approvedDate: new Date(startDate.getTime() - 5 * 24 * 60 * 60 * 1000), // Approved 5 days before
        requiresUrgentApproval: leaveType.type === 'official-assignment'
      });

      leaveRequestsCreated++;
      
      // Create attendance records for leave days
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        // Skip weekends
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const [startHours, startMinutes] = shift.startTime.split(':');
          const scheduledCheckIn = new Date(currentDate);
          scheduledCheckIn.setHours(parseInt(startHours), parseInt(startMinutes), 0);
          
          const [endHours, endMinutes] = shift.endTime.split(':');
          const scheduledCheckOut = new Date(currentDate);
          scheduledCheckOut.setHours(parseInt(endHours), parseInt(endMinutes), 0);

          await Attendance.create({
            employeeId: employee.employeeId,
            employee: employee._id,
            facility: facility._id,
            shift: shift._id,
            date: new Date(currentDate),
            type: 'check-in',
            timestamp: scheduledCheckIn,
            scheduledCheckIn,
            scheduledCheckOut,
            status: 'on-leave',
            workHours: 0,
            leaveRequest: leaveRequest._id
          });
          
          attendanceCreated++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`✅ Created ${leaveType.name} for ${employee.firstName} ${employee.lastName} (${leaveType.days} days)`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Seed completed successfully!');
    console.log(`   👥 Employees created: ${employeesCreated}`);
    console.log(`   📊 Attendance records created: ${attendanceCreated}`);
    console.log(`   📝 Leave requests created: ${leaveRequestsCreated}`);
    console.log('='.repeat(60));

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedCompleteData();
