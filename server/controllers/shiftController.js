const Shift = require('../models/Shift');

// @desc    Get all shifts
// @route   GET /api/shifts
// @access  Private
exports.getShifts = async (req, res) => {
  try {
    const { facility, status } = req.query;
    
    const query = {};
    if (facility) query.facility = facility;
    if (status) query.status = status;
    
    const shifts = await Shift.find(query)
      .populate('facility', 'name code')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: shifts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single shift
// @route   GET /api/shifts/:id
// @access  Private
exports.getShift = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id).populate('facility');
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    res.json({
      success: true,
      data: shift
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create shift
// @route   POST /api/shifts
// @access  Private
exports.createShift = async (req, res) => {
  try {
    const shift = await Shift.create(req.body);
    await shift.populate('facility');
    
    res.status(201).json({
      success: true,
      data: shift,
      message: 'Shift created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Shift with this code already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update shift
// @route   PUT /api/shifts/:id
// @access  Private
exports.updateShift = async (req, res) => {
  try {
    const shift = await Shift.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('facility');
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    res.json({
      success: true,
      data: shift,
      message: 'Shift updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete shift
// @route   DELETE /api/shifts/:id
// @access  Private
exports.deleteShift = async (req, res) => {
  try {
    // Check if shift is assigned to any employee
    const Employee = require('../models/Employee');
    const employeeCount = await Employee.countDocuments({ shift: req.params.id });
    
    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete shift. It is assigned to ${employeeCount} employee(s)`
      });
    }
    
    const shift = await Shift.findByIdAndDelete(req.params.id);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Shift deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
