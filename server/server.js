const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const leaveDocsDir = path.join(uploadsDir, 'leave-documents');
const profilesDir = path.join(uploadsDir, 'profiles');

[uploadsDir, leaveDocsDir, profilesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const employeeAuthRoutes = require('./routes/employeeAuth');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const facilityRoutes = require('./routes/facilityRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const breakRoutes = require('./routes/breakRoutes');
const reportRoutes = require('./routes/reportRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const xo5Routes = require('./routes/xo5Routes');
const integrationRoutes = require('./routes/integrationRoutes');
const leaveRoutes = require('./routes/leave');
const leavePolicyRoutes = require('./routes/leavePolicy');
const payrollRoutes = require('./routes/payrollRoutes');
const payrollSettingsRoutes = require('./routes/payrollSettingsRoutes');
const salaryGradeRoutes = require('./routes/salaryGradeRoutes');
const staffIdPrefixRoutes = require('./routes/staffIdPrefix');

// Models
const Employee = require('./models/Employee');
const SyncFailure = require('./models/SyncFailure');

// Import services
const DataSyncService = require('./services/dataSyncService');

const app = express();

// Trust proxy for rate limiting (handles X-Forwarded-For headers)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting - Increased for employee registration with face enrollment
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased to 1000 requests per windowMs for high-volume operations
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parser middleware with increased limits for face images
app.use(express.json({ limit: '50mb' })); // Increased from default 1mb to 50mb
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS - Allow network access
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGIN || 'http://localhost:3000'
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Logging
if (process.env.NODE_ENV === 'development') {
  // Skip logging for XO5 webhook endpoint to keep console clean
  app.use(morgan('dev', {
    skip: (req, res) => req.path === '/api/xo5/record'
  }));
}

// Serve uploaded files - MUST be before API routes
const uploadsPath = path.join(__dirname, 'uploads');
console.log('📁 Serving static files from:', uploadsPath);
console.log('📁 Directory exists:', fs.existsSync(uploadsPath));
app.use('/uploads', express.static(uploadsPath));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully');
  
  // Start data sync service after DB connection
  const dataSyncService = new DataSyncService();
  dataSyncService.startSync();
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employee-auth', employeeAuthRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/breaks', breakRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/xo5', xo5Routes);
app.use('/api/integration', integrationRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/leave-policy', leavePolicyRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/payroll-settings', payrollSettingsRoutes);
app.use('/api/salary-grades', salaryGradeRoutes);
app.use('/api/staff-id-prefix', staffIdPrefixRoutes);

// Debug route to check if files exist
app.get('/uploads/debug', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads');
  const leaveDocsDir = path.join(uploadsDir, 'leave-documents');
  
  try {
    const uploadsExists = fs.existsSync(uploadsDir);
    const leaveDocsExists = fs.existsSync(leaveDocsDir);
    
    let files = [];
    if (leaveDocsExists) {
      files = fs.readdirSync(leaveDocsDir);
    }
    
    res.json({
      uploadsDir,
      leaveDocsDir,
      uploadsExists,
      leaveDocsExists,
      files: files.slice(0, 10), // First 10 files
      totalFiles: files.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`📡 Network Access:`);
  console.log(`   Local:    http://localhost:${PORT}`);
  console.log(`   Network:  http://0.0.0.0:${PORT}`);
  console.log(`   LAN:      http://[your-ip]:${PORT}`);
  console.log(`🔗 XO5 Webhook: http://[your-ip]:${PORT}/api/xo5/record`);
  console.log(`💡 To find your IP: ipconfig (Windows) or ifconfig (Mac/Linux)`);
});

module.exports = app;
