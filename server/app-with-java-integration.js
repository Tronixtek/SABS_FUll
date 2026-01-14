const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Route imports
const employeeRoutes = require('./routes/employee');
const attendanceRoutes = require('./routes/attendance'); 
const deviceRoutes = require('./routes/device');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: Date.now(),
        service: 'MERN Backend',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Java Service Integration Endpoints
// These endpoints handle two-way communication with the Java XO5 service

/**
 * Employee Device Sync Success Handler
 * Called by Java service when employee is successfully synced to XO5 device
 * Only saves to MongoDB if device sync was successful
 */
app.post('/api/employees/device-sync-success', async (req, res) => {
    try {
        const { employeeData, deviceSyncResult, timestamp, source } = req.body;
        
        console.log('=== DEVICE SYNC SUCCESS ===');
        console.log('Employee Data:', employeeData);
        console.log('Device Result:', deviceSyncResult);
        console.log('Source:', source);
        
        // Import Employee model dynamically to avoid circular dependency
        const Employee = require('./models/Employee');
        
        // Create employee record in MongoDB since device sync was successful
        const newEmployee = new Employee({
            employeeId: employeeData.employeeId,
            fullName: employeeData.fullName,
            faceImageUploaded: employeeData.faceImageUploaded,
            deviceSynced: true,
            deviceSyncTimestamp: new Date(timestamp),
            deviceResponse: employeeData.deviceResponse,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        const savedEmployee = await newEmployee.save();
        
        console.log('Employee saved to database:', savedEmployee._id);
        
        res.status(200).json({
            success: true,
            message: 'Employee saved to database successfully',
            employeeId: savedEmployee._id,
            mongoId: savedEmployee._id,
            timestamp: Date.now()
        });
        
    } catch (error) {
        console.error('Database save error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save employee to database',
            details: error.message,
            timestamp: Date.now()
        });
    }
});

/**
 * Employee Device Sync Failure Handler
 * Called by Java service when employee sync to XO5 device fails
 * Prevents database save and logs the failure
 */
app.post('/api/employees/device-sync-failure', async (req, res) => {
    try {
        const { employeeData, error, timestamp, source } = req.body;
        
        console.log('=== DEVICE SYNC FAILURE ===');
        console.log('Employee Data:', employeeData);
        console.log('Device Error:', error);
        console.log('Source:', source);
        
        // Log the failure for audit purposes (optional)
        const SyncFailure = require('./models/SyncFailure');
        const failureLog = new SyncFailure({
            type: 'employee_sync',
            employeeId: employeeData.employeeId,
            fullName: employeeData.fullName,
            error: error,
            timestamp: new Date(timestamp),
            source: source
        });
        
        await failureLog.save();
        
        res.status(200).json({
            success: true,
            message: 'Device sync failure logged, database save prevented',
            action: 'no_database_save',
            timestamp: Date.now()
        });
        
    } catch (logError) {
        console.error('Failed to log sync failure:', logError);
        res.status(500).json({
            success: false,
            error: 'Failed to log sync failure',
            details: logError.message,
            timestamp: Date.now()
        });
    }
});

/**
 * Attendance Record Handler
 * Called by Java service to save attendance data from XO5 device
 */
app.post('/api/attendance/record', async (req, res) => {
    try {
        const { attendanceData, timestamp, source, verified } = req.body;
        
        console.log('=== ATTENDANCE RECORD ===');
        console.log('Attendance Data:', attendanceData);
        console.log('Source:', source);
        console.log('Verified:', verified);
        
        const Attendance = require('./models/Attendance');
        
        // Create attendance record
        const newAttendance = new Attendance({
            employeeId: attendanceData.employeeId,
            type: attendanceData.type, // 'check-in' or 'check-out'
            timestamp: new Date(attendanceData.timestamp || timestamp),
            deviceIP: '192.168.0.169',
            verified: verified,
            source: source,
            deviceResponse: attendanceData.deviceResponse,
            workDuration: attendanceData.workDuration,
            createdAt: new Date()
        });
        
        const savedAttendance = await newAttendance.save();
        
        res.status(200).json({
            success: true,
            message: 'Attendance record saved successfully',
            attendanceId: savedAttendance._id,
            timestamp: Date.now()
        });
        
    } catch (error) {
        console.error('Attendance save error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save attendance record',
            details: error.message,
            timestamp: Date.now()
        });
    }
});

/**
 * Device Status Update Handler
 * Called by Java service to update device status
 */
app.post('/api/devices/status', async (req, res) => {
    try {
        const { deviceStatus, timestamp, deviceIP } = req.body;
        
        const DeviceStatus = require('./models/DeviceStatus');
        
        // Update or create device status
        const updatedStatus = await DeviceStatus.findOneAndUpdate(
            { deviceIP: deviceIP },
            {
                status: deviceStatus,
                lastUpdate: new Date(timestamp),
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
        
        res.status(200).json({
            success: true,
            message: 'Device status updated successfully',
            deviceId: updatedStatus._id,
            timestamp: Date.now()
        });
        
    } catch (error) {
        console.error('Device status update error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update device status',
            details: error.message,
            timestamp: Date.now()
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server Error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
        timestamp: Date.now()
    });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_system', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ Connected to MongoDB');
    console.log('📊 Database: attendance_system');
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 MERN Backend Server running on port ${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🔄 Java Integration Endpoints Ready`);
    console.log(`   Employee Sync Success: POST /api/employees/device-sync-success`);
    console.log(`   Employee Sync Failure: POST /api/employees/device-sync-failure`);
    console.log(`   Attendance Record: POST /api/attendance/record`);
    console.log(`   Device Status: POST /api/devices/status`);
});

module.exports = app;