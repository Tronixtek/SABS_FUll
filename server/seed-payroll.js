const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('./models/Employee');
const Payroll = require('./models/Payroll');
const Attendance = require('./models/Attendance');
const Facility = require('./models/Facility');
const Shift = require('./models/Shift');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err);
  process.exit(1);
});

const seedPayrollData = async () => {
  try {
    console.log('🌱 Starting payroll data seeding...\n');

    // Get all employees
    const employees = await Employee.find({ status: { $ne: 'inactive' } })
      .populate('facility')
      .populate('shift');

    if (employees.length === 0) {
      console.log('❌ No employees found in database. Please add employees first.');
      process.exit(1);
    }

    console.log(`📊 Found ${employees.length} employees\n`);

    // Delete existing payroll records for January 2026
    const deleteResult = await Payroll.deleteMany({
      'payPeriod.month': 1,
      'payPeriod.year': 2026
    });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing payroll records for January 2026\n`);

    const payrollRecords = [];
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-01-31');

    for (const employee of employees) {
      // Generate random but realistic work data
      const workingDaysInMonth = 22; // Standard working days
      const presentDays = Math.floor(Math.random() * 3) + 20; // 20-22 days
      const absentDays = workingDaysInMonth - presentDays;
      const lateDays = Math.floor(Math.random() * 4); // 0-3 late days
      const leaveDays = Math.floor(Math.random() * 2); // 0-1 leave days
      
      // Work hours calculation
      const hoursPerDay = 8;
      const regularHours = presentDays * hoursPerDay;
      const overtimeHours = Math.floor(Math.random() * 20); // 0-20 hours OT
      const undertimeHours = Math.floor(Math.random() * 5); // 0-5 hours undertime
      
      // Salary and rates
      const baseSalary = employee.salary || (Math.floor(Math.random() * 200000) + 50000); // 50k-250k
      const dailyRate = baseSalary / workingDaysInMonth;
      const hourlyRate = dailyRate / hoursPerDay;
      const overtimeRate = 1.5;
      
      // Earnings
      const basicPay = baseSalary;
      const overtimePay = overtimeHours * hourlyRate * overtimeRate;
      const allowances = Math.floor(Math.random() * 20000); // 0-20k allowances
      const bonus = Math.random() > 0.7 ? Math.floor(Math.random() * 30000) : 0; // 30% chance of bonus
      
      // Deductions
      const taxRate = 0.10; // 10%
      const pensionRate = 0.08; // 8%
      const grossPay = basicPay + overtimePay + allowances + bonus;
      const tax = grossPay * taxRate;
      const pension = grossPay * pensionRate;
      const insurance = Math.floor(Math.random() * 5000); // 0-5k insurance
      const loanDeduction = Math.random() > 0.8 ? Math.floor(Math.random() * 15000) : 0; // 20% have loans
      const absentDeduction = absentDays * dailyRate;
      const undertimeDeduction = undertimeHours * hourlyRate;
      const otherDeductions = Math.floor(Math.random() * 3000);
      
      // Create payroll record
      const payroll = new Payroll({
        employeeId: employee.employeeId,
        employee: employee._id,
        facility: employee.facility?._id,
        payPeriod: {
          startDate,
          endDate,
          month: 1,
          year: 2026
        },
        baseSalary,
        workHours: {
          regularHours,
          overtimeHours,
          undertimeHours,
          totalHours: regularHours + overtimeHours - undertimeHours
        },
        attendance: {
          totalDays: workingDaysInMonth,
          presentDays,
          absentDays,
          lateDays,
          leaveDays
        },
        earnings: {
          basicPay,
          overtimePay,
          allowances,
          bonus,
          total: basicPay + overtimePay + allowances + bonus
        },
        deductions: {
          tax,
          pension,
          insurance,
          loanDeduction,
          absentDeduction,
          undertimeDeduction,
          other: otherDeductions,
          total: tax + pension + insurance + loanDeduction + absentDeduction + undertimeDeduction + otherDeductions
        },
        rates: {
          hourlyRate,
          overtimeRate,
          taxRate,
          pensionRate
        },
        status: ['draft', 'approved', 'paid'][Math.floor(Math.random() * 3)], // Random status
        generatedAt: new Date(),
        notes: Math.random() > 0.8 ? 'Auto-generated test data' : undefined
      });

      // Calculate net pay (will be done by pre-save hook)
      await payroll.save();
      payrollRecords.push(payroll);
      
      console.log(`✅ Created payroll for ${employee.firstName} ${employee.lastName} (${employee.employeeId})`);
      console.log(`   Hours: ${regularHours.toFixed(1)} regular + ${overtimeHours.toFixed(1)} OT`);
      console.log(`   Earnings: ₦${payroll.earnings.total.toLocaleString('en-NG')}`);
      console.log(`   Deductions: ₦${payroll.deductions.total.toLocaleString('en-NG')}`);
      console.log(`   Net Pay: ₦${payroll.netPay.toLocaleString('en-NG')}`);
      console.log(`   Status: ${payroll.status}`);
      console.log('');
    }

    // Calculate and display summary
    const totalEmployees = payrollRecords.length;
    const totalGrossEarnings = payrollRecords.reduce((sum, p) => sum + p.earnings.total, 0);
    const totalDeductions = payrollRecords.reduce((sum, p) => sum + p.deductions.total, 0);
    const totalNetPay = payrollRecords.reduce((sum, p) => sum + p.netPay, 0);
    const totalOvertimeHours = payrollRecords.reduce((sum, p) => sum + p.workHours.overtimeHours, 0);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 PAYROLL SUMMARY - JANUARY 2026');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Employees:      ${totalEmployees}`);
    console.log(`Total Gross Earnings: ₦${totalGrossEarnings.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
    console.log(`Total Deductions:     ₦${totalDeductions.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
    console.log(`Total Net Pay:        ₦${totalNetPay.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
    console.log(`Total Overtime Hours: ${totalOvertimeHours.toFixed(2)} hours`);
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n✅ Successfully seeded ${payrollRecords.length} payroll records!\n`);
    
    console.log('📝 Next Steps:');
    console.log('   1. Login to the admin portal');
    console.log('   2. Go to Reports page');
    console.log('   3. Select "Payroll Report"');
    console.log('   4. Choose Month: January, Year: 2026');
    console.log('   5. Click "Generate Report"');
    console.log('   6. Export to CSV or PDF to see the full report\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding payroll data:', error);
    process.exit(1);
  }
};

// Run the seeding
seedPayrollData();
