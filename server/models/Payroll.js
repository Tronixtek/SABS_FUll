const mongoose = require('mongoose');

const PayrollSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    ref: 'Employee'
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility'
  },
  payPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    month: Number,
    year: Number
  },
  // Salary Components
  baseSalary: {
    type: Number,
    required: true,
    default: 0
  },
  // Work Hours
  workHours: {
    regularHours: {
      type: Number,
      default: 0
    },
    overtimeHours: {
      type: Number,
      default: 0
    },
    undertimeHours: {
      type: Number,
      default: 0
    },
    totalHours: {
      type: Number,
      default: 0
    }
  },
  // Attendance Summary
  attendance: {
    totalDays: {
      type: Number,
      default: 0
    },
    presentDays: {
      type: Number,
      default: 0
    },
    absentDays: {
      type: Number,
      default: 0
    },
    lateDays: {
      type: Number,
      default: 0
    },
    leaveDays: {
      type: Number,
      default: 0
    }
  },
  // Earnings
  earnings: {
    basicPay: {
      type: Number,
      default: 0
    },
    overtimePay: {
      type: Number,
      default: 0
    },
    allowances: {
      type: Number,
      default: 0
    },
    bonus: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  // Deductions
  deductions: {
    tax: {
      type: Number,
      default: 0
    },
    pension: {
      type: Number,
      default: 0
    },
    insurance: {
      type: Number,
      default: 0
    },
    loanDeduction: {
      type: Number,
      default: 0
    },
    absentDeduction: {
      type: Number,
      default: 0
    },
    undertimeDeduction: {
      type: Number,
      default: 0
    },
    other: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  // Rates
  rates: {
    overtimeRate: {
      type: Number,
      default: 1.5 // 1.5x base hourly rate
    },
    hourlyRate: {
      type: Number,
      default: 0
    },
    taxRate: {
      type: Number,
      default: 0 // percentage
    },
    pensionRate: {
      type: Number,
      default: 0 // percentage
    }
  },
  // Net Pay
  netPay: {
    type: Number,
    required: true,
    default: 0
  },
  // Status
  status: {
    type: String,
    enum: ['draft', 'approved', 'paid', 'cancelled'],
    default: 'draft'
  },
  // Processing Info
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: Date,
  paidAt: Date,
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'cheque', 'mobile_money'],
    default: 'bank_transfer'
  },
  paymentReference: String,
  notes: String
}, {
  timestamps: true
});

// Indexes
PayrollSchema.index({ employeeId: 1, 'payPeriod.startDate': 1, 'payPeriod.endDate': 1 });
PayrollSchema.index({ status: 1 });
PayrollSchema.index({ 'payPeriod.month': 1, 'payPeriod.year': 1 });
PayrollSchema.index({ facility: 1 });

// Calculate totals before saving
PayrollSchema.pre('save', function(next) {
  // Calculate total work hours
  this.workHours.totalHours = 
    this.workHours.regularHours + this.workHours.overtimeHours - this.workHours.undertimeHours;
  
  // Calculate total earnings
  this.earnings.total = 
    this.earnings.basicPay + 
    this.earnings.overtimePay + 
    this.earnings.allowances + 
    this.earnings.bonus;
  
  // Calculate total deductions
  this.deductions.total = 
    this.deductions.tax + 
    this.deductions.pension + 
    this.deductions.insurance + 
    this.deductions.loanDeduction + 
    this.deductions.absentDeduction + 
    this.deductions.undertimeDeduction + 
    this.deductions.other;
  
  // Calculate net pay
  this.netPay = this.earnings.total - this.deductions.total;
  
  next();
});

// Static method to generate payroll for an employee
PayrollSchema.statics.generateForEmployee = async function(employeeId, startDate, endDate, generatedBy, customRates = {}) {
  const Employee = mongoose.model('Employee');
  const Attendance = mongoose.model('Attendance');
  const PayrollSettings = mongoose.model('PayrollSettings');
  const SalaryGrade = mongoose.model('SalaryGrade');
  
  // Get payroll settings
  const settings = await PayrollSettings.getSettings();
  
  // Get employee details with salary grade
  const employee = await Employee.findOne({ employeeId })
    .populate('facility')
    .populate('shift')
    .populate('salaryGrade');
  
  if (!employee) {
    throw new Error('Employee not found');
  }
  
  // Determine salary: use manual salary if set, otherwise use salary grade
  let baseSalary = 0;
  if (employee.salary) {
    baseSalary = employee.salary;
  } else if (employee.salaryGrade) {
    baseSalary = employee.salaryGrade.baseSalary;
  }
  
  if (!baseSalary || baseSalary === 0) {
    throw new Error('Employee has no salary or salary grade assigned');
  }
  
  // Get attendance records for the period
  const attendanceRecords = await Attendance.find({
    employeeId,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  });
  
  // Calculate work hours
  const regularHours = attendanceRecords.reduce((sum, a) => sum + (a.workHours || 0), 0);
  const overtimeHours = attendanceRecords.reduce((sum, a) => sum + (a.overtime || 0), 0);
  const undertimeHours = attendanceRecords.reduce((sum, a) => sum + (a.undertime || 0), 0);
  
  // Calculate attendance summary
  const totalDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter(a => a.status === 'present').length;
  const absentDays = attendanceRecords.filter(a => a.status === 'absent').length;
  const lateDays = attendanceRecords.filter(a => a.lateArrival).length;
  const leaveDays = attendanceRecords.filter(a => a.status === 'on-leave').length;
  
  // Calculate rates (baseSalary already determined above)
  const workingDaysPerMonth = customRates.workingDaysPerMonth || settings.workingDaysPerMonth || 22;
  const dailyRate = baseSalary / workingDaysPerMonth;
  const hoursPerDay = customRates.hoursPerDay || settings.hoursPerDay || 8;
  const hourlyRate = dailyRate / hoursPerDay;
  const overtimeRate = customRates.overtimeRate || settings.overtimeRate || 1.5;
  
  // Calculate earnings
  const basicPay = baseSalary;
  const overtimePay = overtimeHours * hourlyRate * overtimeRate;
  
  // Calculate deductions
  const taxRate = customRates.taxRate !== undefined ? customRates.taxRate : (settings.taxRate || 0.10);
  const pensionRate = customRates.pensionRate !== undefined ? customRates.pensionRate : (settings.pensionRate || 0.08);
  
  const grossPay = basicPay + overtimePay;
  const tax = grossPay * taxRate;
  const pension = grossPay * pensionRate;
  const absentDeduction = absentDays * dailyRate;
  const undertimeDeduction = undertimeHours * hourlyRate;
  
  // Create payroll record
  const payroll = new this({
    employeeId: employee.employeeId,
    employee: employee._id,
    facility: employee.facility?._id,
    payPeriod: {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      month: new Date(startDate).getMonth() + 1,
      year: new Date(startDate).getFullYear()
    },
    baseSalary,
    workHours: {
      regularHours,
      overtimeHours,
      undertimeHours
    },
    attendance: {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      leaveDays
    },
    earnings: {
      basicPay,
      overtimePay,
      allowances: 0,
      bonus: 0
    },
    deductions: {
      tax,
      pension,
      insurance: 0,
      loanDeduction: 0,
      absentDeduction,
      undertimeDeduction,
      other: 0
    },
    rates: {
      hourlyRate,
      overtimeRate,
      taxRate,
      pensionRate
    },
    generatedBy,
    status: 'draft'
  });
  
  await payroll.save();
  return payroll;
};

module.exports = mongoose.model('Payroll', PayrollSchema);
