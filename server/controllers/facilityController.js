const Facility = require('../models/Facility');
const DataSyncService = require('../services/dataSyncService');

// @desc    Get all facilities
// @route   GET /api/facilities
// @access  Private
exports.getFacilities = async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = {};
    if (status) query.status = status;
    
    // Super-admin and admin can see all facilities
    // Facility-manager and HR can only see their assigned facilities
    if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
      if (req.user.facilities.length > 0) {
        query._id = { $in: req.user.facilities };
      } else {
        // If no facilities assigned, return empty array
        return res.json({
          success: true,
          data: []
        });
      }
    }
    
    const facilities = await Facility.find(query).sort({ name: 1 });
    
    res.json({
      success: true,
      data: facilities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single facility
// @route   GET /api/facilities/:id
// @access  Private
exports.getFacility = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    
    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    // Check if user has access to this facility
    if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
      if (!req.user.canAccessFacility(facility._id)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this facility'
        });
      }
    }
    
    res.json({
      success: true,
      data: facility
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create facility
// @route   POST /api/facilities
// @access  Private (admin/super-admin only)
exports.createFacility = async (req, res) => {
  try {
    // Extra security check - only admin and super-admin can create facilities
    if (req.user.role !== 'admin' && req.user.role !== 'super-admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can create new facilities. Facility Managers can only edit their assigned facilities.'
      });
    }

    const facility = await Facility.create(req.body);
    
    res.status(201).json({
      success: true,
      data: facility,
      message: 'Facility created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Facility with this code already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update facility
// @route   PUT /api/facilities/:id
// @access  Private
exports.updateFacility = async (req, res) => {
  try {
    // Check if facility exists first
    const existingFacility = await Facility.findById(req.params.id);
    
    if (!existingFacility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    // Check access permissions
    // Facility managers can only edit their assigned facilities
    if (req.user.role === 'facility-manager') {
      if (!req.user.canAccessFacility(existingFacility._id)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit this facility. You can only edit your assigned facilities.'
        });
      }
    }
    
    const facility = await Facility.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    res.json({
      success: true,
      data: facility,
      message: 'Facility updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete facility
// @route   DELETE /api/facilities/:id
// @access  Private
exports.deleteFacility = async (req, res) => {
  try {
    const facility = await Facility.findByIdAndDelete(req.params.id);
    
    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Facility deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Trigger manual sync for a facility
// @route   POST /api/facilities/:id/sync
// @access  Private
exports.syncFacility = async (req, res) => {
  try {
    const dataSyncService = new DataSyncService();
    await dataSyncService.manualSync(req.params.id);
    
    res.json({
      success: true,
      message: 'Facility sync completed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get facility statistics
// @route   GET /api/facilities/:id/stats
// @access  Private
exports.getFacilityStats = async (req, res) => {
  try {
    const Employee = require('../models/Employee');
    const Attendance = require('../models/Attendance');
    const moment = require('moment');
    
    const startOfMonth = moment().startOf('month').toDate();
    const endOfMonth = moment().endOf('month').toDate();
    
    const totalEmployees = await Employee.countDocuments({
      facility: req.params.id,
      status: 'active'
    });
    
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          facility: req.params.id,
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const stats = {
      totalEmployees,
      attendance: attendanceStats,
      month: moment().format('MMMM YYYY')
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
