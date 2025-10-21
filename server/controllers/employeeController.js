const Employee = require('../models/Employee');
const axios = require('axios');

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private
exports.getEmployees = async (req, res) => {
  try {
    const { facility, status, search, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    // Filter by facility
    if (facility) {
      query.facility = facility;
    } else if (req.user.role !== 'super-admin' && req.user.facilities.length > 0) {
      query.facility = { $in: req.user.facilities };
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Search
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const employees = await Employee.find(query)
      .populate('facility', 'name code')
      .populate('shift', 'name code startTime endTime')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await Employee.countDocuments(query);
    
    res.json({
      success: true,
      data: employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private
exports.getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('facility')
      .populate('shift');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create employee
// @route   POST /api/employees
// @access  Private
exports.createEmployee = async (req, res) => {
  try {
    const employee = await Employee.create(req.body);
    
    await employee.populate('facility shift');
    
    res.status(201).json({
      success: true,
      data: employee,
      message: 'Employee created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Employee with this ID or email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('facility shift');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    res.json({
      success: true,
      data: employee,
      message: 'Employee updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete employee (device-first approach)
// @route   DELETE /api/employees/:id
// @access  Private
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the employee with facility information
    const employee = await Employee.findById(id).populate('facility');
    
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    const facility = employee.facility;
    
    // ✅ STEP 1: DELETE FROM DEVICE FIRST
    if (facility?.configuration?.deleteUserApiUrl && employee.deviceId) {
      try {
        console.log(`\n🗑️ ===== DEVICE DELETE STARTED =====`);
        console.log(`   Employee: ${employee.firstName} ${employee.lastName}`);
        console.log(`   Device ID (personUUID): ${employee.deviceId}`);
        console.log(`   Facility: ${facility.name}`);
        
        // Use configured delete URL template
        let deviceDeleteUrl = facility.configuration.deleteUserApiUrl;
        
        // Replace placeholders with actual device ID
        deviceDeleteUrl = deviceDeleteUrl.replace('{person_uuid}', employee.deviceId);
        deviceDeleteUrl = deviceDeleteUrl.replace('{personUUID}', employee.deviceId);
        deviceDeleteUrl = deviceDeleteUrl.replace('{uuid}', employee.deviceId);
        deviceDeleteUrl = deviceDeleteUrl.replace('{id}', employee.deviceId);
        
        console.log(`   Delete URL: ${deviceDeleteUrl}`);
        
        const headers = {
          'Content-Type': 'application/json',
        };
        
        if (facility.deviceApiKey) {
          headers['Authorization'] = `Bearer ${facility.deviceApiKey}`;
          console.log(`   Using API Key: ${facility.deviceApiKey.substring(0, 10)}...`);
        }

        console.log(`   Sending DELETE request to device...`);

        // Send DELETE request to device
        const deviceResponse = await axios.delete(deviceDeleteUrl, {
          headers: headers,
          timeout: 15000, // 15 seconds timeout
          validateStatus: (status) => {
            // Accept 2xx and 404 (already deleted)
            return (status >= 200 && status < 300) || status === 404;
          }
        });

        console.log(`   Device response status: ${deviceResponse.status}`);
        console.log(`   Device response data: ${JSON.stringify(deviceResponse.data)}`);

        // Check if device deletion was successful
        if (deviceResponse.status === 404) {
          console.log(`ℹ️ Person not found on device (may have been deleted already)`);
        } else if (deviceResponse.status === 200 || deviceResponse.status === 204) {
          console.log(`✅ Employee deleted from device successfully`);
        } else if (deviceResponse.data?.result === 'success' || deviceResponse.data?.code === 0) {
          console.log(`✅ Employee deleted from device successfully`);
        } else {
          console.warn(`⚠️ Device returned status ${deviceResponse.status}, proceeding with caution`);
        }

      } catch (deviceError) {
        console.error(`❌ Device deletion failed: ${deviceError.message}`);
        
        // Handle different types of device errors
        if (deviceError.code === 'ECONNABORTED' || deviceError.code === 'ETIMEDOUT') {
          console.error(`   Error: Device request timed out`);
          return res.status(503).json({ 
            success: false,
            message: 'Device request timed out. Device may be offline.',
            error: 'DEVICE_TIMEOUT',
            employeeId: id,
            requiresConfirmation: true,
          });
        }
        
        if (deviceError.code === 'ECONNREFUSED' || deviceError.code === 'ENOTFOUND') {
          console.error(`   Error: Cannot connect to device`);
          return res.status(503).json({ 
            success: false,
            message: 'Cannot connect to device. Device is unreachable.',
            error: 'DEVICE_UNREACHABLE',
            employeeId: id,
            requiresConfirmation: true,
          });
        }

        if (deviceError.response) {
          console.error(`   Device responded with error: ${deviceError.response.status}`);
          console.error(`   Error data: ${JSON.stringify(deviceError.response.data)}`);
          
          // If device says person not found (404), proceed with DB deletion
          if (deviceError.response.status === 404) {
            console.log(`   ℹ️ Person not found on device, proceeding with DB deletion`);
          } else {
            return res.status(500).json({ 
              success: false,
              message: `Device error: ${deviceError.response.data?.message || deviceError.response.statusText || 'Unknown error'}`,
              error: 'DEVICE_ERROR',
              statusCode: deviceError.response.status,
              requiresConfirmation: true,
            });
          }
        } else {
          // Network error or other issue
          return res.status(500).json({ 
            success: false,
            message: `Failed to communicate with device: ${deviceError.message}`,
            error: 'DEVICE_ERROR',
            requiresConfirmation: true,
          });
        }
      }
    } else {
      if (!facility?.configuration?.deleteUserApiUrl) {
        console.log(`ℹ️ No delete API URL configured for facility ${facility?.name || 'Unknown'}`);
      }
      if (!employee.deviceId) {
        console.log(`ℹ️ No device ID found for employee ${employee.firstName} ${employee.lastName}`);
      }
    }

    // ✅ STEP 2: DELETE FROM DATABASE
    console.log(`\n🗑️ Deleting employee from database...`);
    
    // Count related attendance records
    const Attendance = require('../models/Attendance');
    const attendanceCount = await Attendance.countDocuments({ employee: id });
    console.log(`   Found ${attendanceCount} attendance records (will be preserved)`);
    
    // Delete the employee
    await Employee.findByIdAndDelete(id);
    
    console.log(`✅ Employee deleted from database successfully`);
    console.log(`✅ ===== DELETE COMPLETED =====\n`);

    res.json({ 
      success: true,
      message: 'Employee deleted successfully',
      deletedFrom: facility?.configuration?.deleteUserApiUrl && employee.deviceId ? 'device-and-database' : 'database-only',
      attendanceRecordsPreserved: attendanceCount,
      employeeName: `${employee.firstName} ${employee.lastName}`,
    });

  } catch (error) {
    console.error('❌ Error in deleteEmployee:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete employee',
      error: error.message,
    });
  }
};

// @desc    Force delete employee from database only
// @route   DELETE /api/employees/:id/force
// @access  Private
exports.forceDeleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await Employee.findById(id);
    
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    console.log(`\n⚠️ ===== FORCE DELETE (DB ONLY) =====`);
    console.log(`   Employee: ${employee.firstName} ${employee.lastName}`);
    console.log(`   Device ID: ${employee.deviceId}`);
    console.log(`   Warning: Employee may still exist on device`);
    
    // Count attendance records
    const Attendance = require('../models/Attendance');
    const attendanceCount = await Attendance.countDocuments({ employee: id });
    
    // Delete from database only
    await Employee.findByIdAndDelete(id);
    
    console.log(`✅ Employee force-deleted from database`);
    console.log(`⚠️ Manual device cleanup may be required`);
    console.log(`✅ ===== FORCE DELETE COMPLETED =====\n`);

    res.json({ 
      success: true,
      message: 'Employee deleted from database only',
      warning: 'Employee was not deleted from device. Manual device cleanup may be required.',
      deletedFrom: 'database-only',
      attendanceRecordsPreserved: attendanceCount,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      deviceCleanupRequired: true,
    });

  } catch (error) {
    console.error('❌ Error in forceDeleteEmployee:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to force delete employee',
      error: error.message,
    });
  }
};

// @desc    Get employee statistics
// @route   GET /api/employees/:id/stats
// @access  Private
exports.getEmployeeStats = async (req, res) => {
  try {
    const Attendance = require('../models/Attendance');
    const moment = require('moment');
    
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    const startOfMonth = moment().startOf('month').toDate();
    const endOfMonth = moment().endOf('month').toDate();
    
    const attendanceRecords = await Attendance.find({
      employee: req.params.id,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });
    
    const stats = {
      totalPresent: attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length,
      totalAbsent: attendanceRecords.filter(a => a.status === 'absent').length,
      totalLate: attendanceRecords.filter(a => a.status === 'late').length,
      totalHalfDay: attendanceRecords.filter(a => a.status === 'half-day').length,
      totalLeave: attendanceRecords.filter(a => a.status === 'on-leave').length,
      totalWorkHours: attendanceRecords.reduce((sum, a) => sum + (a.workHours || 0), 0),
      totalOvertime: attendanceRecords.reduce((sum, a) => sum + (a.overtime || 0), 0),
      averageLateMinutes: attendanceRecords.reduce((sum, a) => sum + (a.lateArrival || 0), 0) / (attendanceRecords.length || 1)
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
