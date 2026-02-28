const Facility = require('../models/Facility');
const User = require('../models/User');
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

    const { assignedManagers, ...facilityData } = req.body;
    
    const facility = await Facility.create(facilityData);
    
    // Assign managers to this facility if provided
    if (assignedManagers && assignedManagers.length > 0) {
      const User = require('../models/User');
      
      // Update each selected manager to include this facility
      for (const managerId of assignedManagers) {
        const manager = await User.findById(managerId);
        if (manager && manager.role === 'facility-manager') {
          // Check if manager already has 2 facilities
          if (manager.facilities.length >= 2) {
            console.warn(`Manager ${manager.email} already has 2 facilities, skipping assignment`);
            continue;
          }
          
          if (!manager.facilities.includes(facility._id)) {
            manager.facilities.push(facility._id);
            await manager.save();
          }
        }
      }
    }
    
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
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
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

    // Extract assignedManagers from request
    const { assignedManagers, ...facilityData } = req.body;
    
    // Update the facility
    const facility = await Facility.findByIdAndUpdate(
      req.params.id,
      facilityData,
      {
        new: true,
        runValidators: true
      }
    );

    // Handle manager assignments if provided and user is admin
    if (assignedManagers && (req.user.role === 'super-admin' || req.user.role === 'admin')) {
      // Get currently assigned managers
      const currentManagers = await User.find({ facilities: facility._id });
      const currentManagerIds = currentManagers.map(m => m._id.toString());
      
      // Remove facility from managers that are no longer assigned
      const managersToRemove = currentManagerIds.filter(id => !assignedManagers.includes(id));
      await User.updateMany(
        { _id: { $in: managersToRemove } },
        { $pull: { facilities: facility._id } }
      );
      
      // Add facility to newly assigned managers
      const managersToAdd = assignedManagers.filter(id => !currentManagerIds.includes(id));
      
      for (const managerId of managersToAdd) {
        const manager = await User.findById(managerId);
        if (manager && manager.role === 'facility-manager') {
          // Check if manager already has 2 facilities
          if (manager.facilities && manager.facilities.length >= 2) {
            return res.status(400).json({
              success: false,
              message: `Manager ${manager.firstName} ${manager.lastName} already has 2 facilities assigned`
            });
          }
          
          // Add facility to manager's facilities array
          await User.findByIdAndUpdate(
            managerId,
            { $addToSet: { facilities: facility._id } }
          );
        }
      }
    }
    
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

// @desc    Test device connection for a facility
// @route   POST /api/facilities/:id/test-connection
// @access  Private
exports.testFacilityConnection = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('🔌 TEST FACILITY CONNECTION');
    console.log('========================================\n');

    const facility = await Facility.findById(req.params.id);
    
    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    console.log(`📍 Facility: ${facility.name} (${facility.code})`);
    console.log(`📡 Integration Type: ${facility.configuration?.integrationType}`);

    // Check if facility has smart device integration
    if (facility.configuration?.integrationType !== 'java-xo5') {
      return res.status(400).json({
        success: false,
        message: 'Facility does not have Smart Device integration enabled'
      });
    }

    // Use facility code as device key
    const deviceKey = facility.code?.toLowerCase();
    const deviceSecret = facility.configuration?.deviceSecret || '123456';

    if (!deviceKey) {
      return res.status(400).json({
        success: false,
        message: 'Facility code is missing'
      });
    }

    console.log(`🔑 Device Key: ${deviceKey}`);
    console.log(`🔐 Secret: ${deviceSecret.substring(0, 4)}***`);

    // Call Java service to test connection
    const javaServiceUrl = process.env.JAVA_SERVICE_URL || 'http://localhost:8081';
    const endpoint = `${javaServiceUrl}/api/device/test-connection`;

    console.log(`\n📞 Calling Java service: ${endpoint}`);

    const axios = require('axios');
    const response = await axios.post(endpoint, {
      deviceKey,
      secret: deviceSecret
    }, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`\n✅ Java service response received`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${response.data?.success}`);

    if (response.data?.success) {
      const result = response.data.data || {};
      
      console.log(`\n✅ Device Connection Test Result:`);
      console.log(`   Connected: ${result.connected}`);
      console.log(`   Gateway Host: ${result.gatewayHost}`);
      console.log(`   Gateway Port: ${result.gatewayPort}`);
      console.log(`   Status: ${result.status}`);

      return res.json({
        success: true,
        message: 'Device connected successfully',
        data: {
          facility: {
            id: facility._id,
            name: facility.name,
            code: facility.code
          },
          connection: {
            connected: result.connected,
            gatewayHost: result.gatewayHost,
            gatewayPort: result.gatewayPort,
            status: result.status,
            timestamp: result.timestamp
          }
        }
      });

    } else {
      console.error(`\n❌ Connection test failed: ${response.data?.message}`);
      
      return res.status(400).json({
        success: false,
        message: response.data?.message || 'Device connection test failed',
        data: response.data?.data
      });
    }

  } catch (error) {
    console.error(`\n❌ Connection test error:`, error.message);
    
    if (error.response?.status === 503) {
      return res.status(503).json({
        success: false,
        message: 'Java device service is unavailable'
      });
    } else if (error.response?.data?.message) {
      return res.status(400).json({
        success: false,
        message: error.response.data.message,
        data: error.response.data.data
      });
    } else if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Cannot connect to device service'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Connection test failed: ' + error.message
      });
    }
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
