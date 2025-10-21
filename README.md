# SABS - Smart Attendance Biometric System

A comprehensive, robust multi-facility attendance tracking system built with the MERN stack (MongoDB, Express.js, React, Node.js) that aggregates data from multiple facilities and provides detailed analytics, performance reports, and automated email notifications.

## 🌟 Features

### Core Features
- **Multi-Facility Support**: Manage attendance across 6 different facilities
- **Automated Data Sync**: Automatic synchronization with device servers every 5 minutes
- **Real-time Dashboard**: Live attendance statistics and analytics
- **Employee Management**: Complete CRUD operations for employee data
- **Shift Management**: Flexible shift scheduling with customizable work hours
- **Attendance Tracking**: Automated check-in/check-out with overtime and late arrival calculations
- **Comprehensive Reports**: Daily, monthly, and custom date range reports
- **Performance Analytics**: Employee performance metrics, attendance trends, and insights

### Advanced Features
- **Role-based Access Control**: Super-admin, admin, manager, HR, and viewer roles
- **Permission Management**: Granular permissions for different operations
- **Smart Calculations**: Automatic work hours, overtime, and undertime calculations
- **Late Arrival Tracking**: Monitors and reports late arrivals with grace periods
- **Device Integration**: Supports multiple biometric devices (fingerprint, face, card)
- **Data Aggregation**: Central server aggregates data from all facilities
- **REST API**: Well-documented API endpoints for all operations

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## 🚀 Installation

### 1. Clone or navigate to the project directory
```bash
cd "c:\Users\PC\Desktop\attendance tracking system"
```

### 2. Install Backend Dependencies
```bash
npm install
```

### 3. Install Frontend Dependencies
```bash
cd client
npm install
cd ..
```

### 4. Environment Configuration

Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:
```env
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/attendance-tracking

# JWT Secret (Change this in production!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# Facility Device APIs (Update with your actual device server endpoints)
FACILITY_1_API=http://facility1-server.com/api/attendance
FACILITY_2_API=http://facility2-server.com/api/attendance
FACILITY_3_API=http://facility3-server.com/api/attendance
FACILITY_4_API=http://facility4-server.com/api/attendance
FACILITY_5_API=http://facility5-server.com/api/attendance
FACILITY_6_API=http://facility6-server.com/api/attendance

# Data Sync Interval (in minutes)
SYNC_INTERVAL=5

# CORS Origin
CORS_ORIGIN=http://localhost:3000
```

### 5. Start MongoDB

Ensure MongoDB is running on your system:
```bash
# Windows (if MongoDB is installed as a service)
net start MongoDB

# Or start mongod manually
mongod --dbpath "path/to/your/data/directory"
```

## 🏃 Running the Application

### Development Mode

#### Option 1: Run both frontend and backend together
```bash
npm run dev:full
```

#### Option 2: Run separately

Terminal 1 - Backend:
```bash
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm start
```

### Production Mode

1. Build the frontend:
```bash
cd client
npm run build
cd ..
```

2. Start the server:
```bash
npm start
```

## 📱 Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## 👤 Default Login

After setting up the system, you'll need to create an admin user. You can do this by:

1. Using the registration endpoint (POST /api/auth/register)
2. Or using MongoDB directly to insert a user

Example user creation via API:
```json
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "username": "admin",
  "email": "admin@example.com",
  "password": "admin123",
  "firstName": "Admin",
  "lastName": "User",
  "role": "super-admin"
}
```

## 📊 System Architecture

### Backend Structure
```
server/
├── models/           # Mongoose data models
│   ├── User.js
│   ├── Employee.js
│   ├── Facility.js
│   ├── Shift.js
│   ├── Attendance.js
│   └── Settings.js
├── controllers/      # Request handlers
│   ├── authController.js
│   ├── employeeController.js
│   ├── attendanceController.js
│   ├── facilityController.js
│   ├── shiftController.js
│   ├── reportController.js
│   ├── analyticsController.js
│   └── settingsController.js
├── routes/          # API routes
├── middleware/      # Custom middleware (auth, etc.)
├── services/        # Business logic
│   └── dataSyncService.js
└── server.js        # Application entry point
```

### Frontend Structure
```
client/src/
├── components/      # Reusable React components
│   ├── Layout.js
│   ├── PrivateRoute.js
│   └── EmployeeModal.js
├── pages/          # Page components
│   ├── Login.js
│   ├── Dashboard.js
│   ├── Employees.js
│   ├── Attendance.js
│   ├── Facilities.js
│   ├── Shifts.js
│   ├── Reports.js
│   ├── Analytics.js
│   └── Settings.js
├── context/        # React Context (Auth, etc.)
├── App.js          # Main application component
└── index.js        # Application entry point
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatepassword` - Update password

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get single employee
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `GET /api/employees/:id/stats` - Get employee statistics

### Attendance
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/:id` - Get single attendance record
- `POST /api/attendance` - Create manual attendance
- `PUT /api/attendance/:id` - Update attendance
- `DELETE /api/attendance/:id` - Delete attendance
- `POST /api/attendance/absence` - Mark absence

### Facilities
- `GET /api/facilities` - Get all facilities
- `GET /api/facilities/:id` - Get single facility
- `POST /api/facilities` - Create facility
- `PUT /api/facilities/:id` - Update facility
- `DELETE /api/facilities/:id` - Delete facility
- `POST /api/facilities/:id/sync` - Trigger manual sync

### Shifts
- `GET /api/shifts` - Get all shifts
- `GET /api/shifts/:id` - Get single shift
- `POST /api/shifts` - Create shift
- `PUT /api/shifts/:id` - Update shift
- `DELETE /api/shifts/:id` - Delete shift

### Reports
- `GET /api/reports/daily` - Daily attendance report
- `GET /api/reports/monthly` - Monthly attendance report
- `GET /api/reports/custom` - Custom date range report

### Analytics
- `GET /api/analytics/dashboard` - Dashboard analytics
- `GET /api/analytics/employee-performance` - Employee performance
- `GET /api/analytics/overtime` - Overtime report

## 🔧 Configuration

### Facility Setup

1. Navigate to the Facilities page
2. Click "Add Facility"
3. Fill in:
   - Facility name and code
   - Device API URL (your device server endpoint)
   - Device API Key (if required)
   - Timezone
   - Auto-sync settings

### Shift Setup

1. Navigate to the Shifts page
2. Click "Add Shift"
3. Configure:
   - Shift name and code
   - Start and end times
   - Working hours
   - Grace periods for check-in/check-out
   - Break time
   - Working days

### Employee Setup

1. Navigate to the Employees page
2. Click "Add Employee"
3. Enter employee details:
   - Employee ID and Device ID
   - Personal information
   - Facility and shift assignment
   - Department and designation

## 🔄 Data Synchronization

The system automatically syncs data from device servers every 5 minutes (configurable). The sync process:

1. Fetches attendance data from each facility's device API
2. Maps device records to employees
3. Creates or updates attendance records
4. Calculates work hours, overtime, and late arrivals
5. Updates facility sync status

### Manual Sync

You can trigger manual sync for any facility:
- Go to Facilities page
- Click "Sync Now" button on the facility card

## 📈 Reports and Analytics

### Available Reports

1. **Daily Report**: Shows attendance for a specific date
2. **Monthly Report**: Comprehensive monthly attendance summary
3. **Custom Report**: Flexible date range with filters
4. **Performance Analytics**: Employee performance metrics
5. **Overtime Report**: Overtime hours tracking

### Dashboard Metrics

- Total employees across all facilities
- Today's attendance status
- 7-day attendance trend
- Facility-wise attendance distribution
- Top late arrivals

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Permission-based route protection
- Rate limiting on API endpoints
- Helmet.js for security headers
- CORS configuration

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check MongoDB URI in .env file
- Verify network connectivity

### Device Sync Failures
- Check device API URLs in facility configuration
- Verify API keys if required
- Check network connectivity to device servers
- Review sync error messages in facility details

### Frontend Not Loading
- Ensure backend is running
- Check proxy configuration in client/package.json
- Clear browser cache
- Check browser console for errors

## 📝 License

This project is proprietary software. All rights reserved.

## 👥 Support

For support and questions:
- Create an issue in the project repository
- Contact the development team

## 🔮 Future Enhancements

- Mobile application
- Email/SMS notifications
- Leave management system
- Payroll integration
- Advanced analytics with AI insights
- Facial recognition integration
- Geofencing for location-based attendance
- Multi-language support

---

**Version**: 1.0.0  
**Last Updated**: October 2025
