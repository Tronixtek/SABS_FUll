const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const moment = require('moment-timezone');

// @desc    Generate payroll for all employees or specific employee
// @route   POST /api/payroll/generate
// @access  Private (Admin/Super Admin)
exports.generatePayroll = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, employeeIds } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    const generatedPayrolls = [];
    let employees;
    
    // Determine which employees to process
    if (employeeId) {
      employees = await Employee.find({ employeeId });
    } else if (employeeIds && employeeIds.length > 0) {
      employees = await Employee.find({ employeeId: { $in: employeeIds } });
    } else {
      // Generate for all active employees
      employees = await Employee.find({ status: { $ne: 'inactive' } });
    }
    
    if (employees.length === 0) {
      return res.status(404).json({ message: 'No employees found' });
    }
    
    // Check for existing payroll records in this period
    for (const employee of employees) {
      const existing = await Payroll.findOne({
        employeeId: employee.employeeId,
        'payPeriod.startDate': new Date(startDate),
        'payPeriod.endDate': new Date(endDate)
      });
      
      if (existing) {
        generatedPayrolls.push({
          employeeId: employee.employeeId,
          status: 'skipped',
          message: 'Payroll already exists for this period'
        });
        continue;
      }
      
      try {
        const payroll = await Payroll.generateForEmployee(
          employee.employeeId,
          startDate,
          endDate,
          req.user._id
        );
        
        generatedPayrolls.push({
          employeeId: employee.employeeId,
          status: 'success',
          payrollId: payroll._id,
          netPay: payroll.netPay
        });
      } catch (error) {
        generatedPayrolls.push({
          employeeId: employee.employeeId,
          status: 'error',
          message: error.message
        });
      }
    }
    
    res.status(201).json({
      message: 'Payroll generation completed',
      results: generatedPayrolls,
      totalProcessed: employees.length,
      successful: generatedPayrolls.filter(p => p.status === 'success').length,
      failed: generatedPayrolls.filter(p => p.status === 'error').length,
      skipped: generatedPayrolls.filter(p => p.status === 'skipped').length
    });
  } catch (error) {
    console.error('Generate payroll error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all payroll records
// @route   GET /api/payroll
// @access  Private (Admin/Super Admin)
exports.getAllPayrolls = async (req, res) => {
  try {
    const { 
      status, 
      month, 
      year, 
      employeeId, 
      facilityId, 
      startDate, 
      endDate,
      page = 1,
      limit = 50
    } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (month) query['payPeriod.month'] = parseInt(month);
    if (year) query['payPeriod.year'] = parseInt(year);
    if (employeeId) query.employeeId = employeeId;
    if (facilityId) query.facility = facilityId;
    
    if (startDate && endDate) {
      query['payPeriod.startDate'] = { $gte: new Date(startDate) };
      query['payPeriod.endDate'] = { $lte: new Date(endDate) };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const payrolls = await Payroll.find(query)
      .populate('employee', 'employeeId firstName lastName department designation')
      .populate('facility', 'name')
      .populate('generatedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ 'payPeriod.startDate': -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Payroll.countDocuments(query);
    
    res.json({
      payrolls,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get payrolls error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single payroll record
// @route   GET /api/payroll/:id
// @access  Private
exports.getPayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employee', 'employeeId firstName lastName department designation email phone')
      .populate('facility', 'name location')
      .populate('generatedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .populate('paidBy', 'firstName lastName');
    
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }
    
    res.json(payroll);
  } catch (error) {
    console.error('Get payroll error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payroll for employee (self-service)
// @route   GET /api/payroll/my-payroll
// @access  Private (Employee)
exports.getMyPayroll = async (req, res) => {
  try {
    const { month, year, startDate, endDate } = req.query;
    
    const query = { employeeId: req.employee.employeeId };
    
    if (month && year) {
      query['payPeriod.month'] = parseInt(month);
      query['payPeriod.year'] = parseInt(year);
    } else if (startDate && endDate) {
      query['payPeriod.startDate'] = { $gte: new Date(startDate) };
      query['payPeriod.endDate'] = { $lte: new Date(endDate) };
    }
    
    const payrolls = await Payroll.find(query)
      .populate('facility', 'name')
      .sort({ 'payPeriod.startDate': -1 });
    
    res.json({ payrolls });
  } catch (error) {
    console.error('Get my payroll error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update payroll record
// @route   PUT /api/payroll/:id
// @access  Private (Admin/Super Admin)
exports.updatePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }
    
    // Only allow updates if status is draft
    if (payroll.status !== 'draft') {
      return res.status(400).json({ 
        message: `Cannot update payroll with status: ${payroll.status}` 
      });
    }
    
    const {
      earnings,
      deductions,
      notes
    } = req.body;
    
    // Update earnings
    if (earnings) {
      if (earnings.allowances !== undefined) payroll.earnings.allowances = earnings.allowances;
      if (earnings.bonus !== undefined) payroll.earnings.bonus = earnings.bonus;
    }
    
    // Update deductions
    if (deductions) {
      if (deductions.insurance !== undefined) payroll.deductions.insurance = deductions.insurance;
      if (deductions.loanDeduction !== undefined) payroll.deductions.loanDeduction = deductions.loanDeduction;
      if (deductions.other !== undefined) payroll.deductions.other = deductions.other;
    }
    
    if (notes) payroll.notes = notes;
    
    await payroll.save();
    
    res.json({
      message: 'Payroll updated successfully',
      payroll
    });
  } catch (error) {
    console.error('Update payroll error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve payroll
// @route   PUT /api/payroll/:id/approve
// @access  Private (Admin/Super Admin)
exports.approvePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }
    
    if (payroll.status !== 'draft') {
      return res.status(400).json({ 
        message: `Payroll already ${payroll.status}` 
      });
    }
    
    payroll.status = 'approved';
    payroll.approvedBy = req.user._id;
    payroll.approvedAt = new Date();
    
    await payroll.save();
    
    res.json({
      message: 'Payroll approved successfully',
      payroll
    });
  } catch (error) {
    console.error('Approve payroll error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark payroll as paid
// @route   PUT /api/payroll/:id/pay
// @access  Private (Admin/Super Admin)
exports.markAsPaid = async (req, res) => {
  try {
    const { paymentMethod, paymentReference, notes } = req.body;
    
    const payroll = await Payroll.findById(req.params.id);
    
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }
    
    if (payroll.status !== 'approved') {
      return res.status(400).json({ 
        message: 'Payroll must be approved before marking as paid' 
      });
    }
    
    payroll.status = 'paid';
    payroll.paidBy = req.user._id;
    payroll.paidAt = new Date();
    if (paymentMethod) payroll.paymentMethod = paymentMethod;
    if (paymentReference) payroll.paymentReference = paymentReference;
    if (notes) payroll.notes = notes;
    
    await payroll.save();
    
    res.json({
      message: 'Payroll marked as paid successfully',
      payroll
    });
  } catch (error) {
    console.error('Mark as paid error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete payroll record
// @route   DELETE /api/payroll/:id
// @access  Private (Super Admin)
exports.deletePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }
    
    // Only allow deletion if status is draft
    if (payroll.status !== 'draft') {
      return res.status(400).json({ 
        message: 'Only draft payroll records can be deleted' 
      });
    }
    
    await payroll.deleteOne();
    
    res.json({ message: 'Payroll record deleted successfully' });
  } catch (error) {
    console.error('Delete payroll error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payroll summary/statistics
// @route   GET /api/payroll/summary
// @access  Private (Admin/Super Admin)
exports.getPayrollSummary = async (req, res) => {
  try {
    const { month, year, facilityId } = req.query;
    
    const query = {};
    if (month) query['payPeriod.month'] = parseInt(month);
    if (year) query['payPeriod.year'] = parseInt(year);
    if (facilityId) query.facility = facilityId;
    
    const summary = await Payroll.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalNetPay: { $sum: '$netPay' },
          totalEarnings: { $sum: '$earnings.total' },
          totalDeductions: { $sum: '$deductions.total' },
          totalOvertimePay: { $sum: '$earnings.overtimePay' },
          totalOvertimeHours: { $sum: '$workHours.overtimeHours' }
        }
      }
    ]);
    
    // Overall summary
    const overall = await Payroll.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          totalNetPay: { $sum: '$netPay' },
          totalEarnings: { $sum: '$earnings.total' },
          totalDeductions: { $sum: '$deductions.total' }
        }
      }
    ]);
    
    res.json({
      byStatus: summary,
      overall: overall[0] || {
        totalRecords: 0,
        totalNetPay: 0,
        totalEarnings: 0,
        totalDeductions: 0
      }
    });
  } catch (error) {
    console.error('Get payroll summary error:', error);
    res.status(500).json({ message: error.message });
  }
};
