const PayrollSettings = require('../models/PayrollSettings');

// @desc    Get payroll settings
// @route   GET /api/payroll-settings
// @access  Private (Admin/Super Admin)
exports.getPayrollSettings = async (req, res) => {
  try {
    const settings = await PayrollSettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get payroll settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update payroll settings
// @route   PUT /api/payroll-settings
// @access  Private (Admin/Super Admin)
exports.updatePayrollSettings = async (req, res) => {
  try {
    const {
      overtimeRate,
      taxRate,
      pensionRate,
      workingDaysPerMonth,
      hoursPerDay,
      insuranceRate,
      insuranceType,
      companyName,
      payrollCurrency
    } = req.body;

    let settings = await PayrollSettings.findOne();
    
    if (!settings) {
      settings = new PayrollSettings();
    }

    // Update fields if provided
    if (overtimeRate !== undefined) settings.overtimeRate = overtimeRate;
    if (taxRate !== undefined) settings.taxRate = taxRate;
    if (pensionRate !== undefined) settings.pensionRate = pensionRate;
    if (workingDaysPerMonth !== undefined) settings.workingDaysPerMonth = workingDaysPerMonth;
    if (hoursPerDay !== undefined) settings.hoursPerDay = hoursPerDay;
    if (insuranceRate !== undefined) settings.insuranceRate = insuranceRate;
    if (insuranceType !== undefined) settings.insuranceType = insuranceType;
    if (companyName !== undefined) settings.companyName = companyName;
    if (payrollCurrency !== undefined) settings.payrollCurrency = payrollCurrency;
    
    settings.updatedBy = req.user._id;

    await settings.save();

    res.json({
      success: true,
      message: 'Payroll settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update payroll settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
