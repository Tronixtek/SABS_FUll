# Quick Setup Guide

## Initial Setup Steps

### 1. Install Dependencies
```powershell
# Install backend dependencies
npm install

# Install frontend dependencies
cd client; npm install; cd ..
```

### 2. Configure Environment
```powershell
# Copy environment template
Copy-Item .env.example .env

# Edit .env file with your settings
notepad .env
```

### 3. Start MongoDB
```powershell
# If MongoDB is installed as a service
net start MongoDB

# Or start mongod manually
# mongod --dbpath "C:\data\db"
```

### 4. Create Initial Admin User

Option 1 - Using PowerShell:
```powershell
# Make a POST request to create admin
$body = @{
    username = "admin"
    email = "admin@example.com"
    password = "Admin@123"
    firstName = "System"
    lastName = "Administrator"
    role = "super-admin"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method Post -Body $body -ContentType "application/json"
```

Option 2 - Using MongoDB directly:
```javascript
// Connect to MongoDB
use attendance-tracking

// Insert admin user (password: Admin@123)
db.users.insertOne({
  username: "admin",
  email: "admin@example.com",
  password: "$2a$10$XQqXqrF.MQPXqrF.MQPXqOqXqrF.MQPXqrF.MQPXqOqXqrF.MQP", // Admin@123
  firstName: "System",
  lastName: "Administrator",
  role: "super-admin",
  permissions: [],
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### 5. Run the Application

Development mode (both frontend and backend):
```powershell
npm run dev:full
```

Or run separately:

Terminal 1 - Backend:
```powershell
npm run dev
```

Terminal 2 - Frontend:
```powershell
cd client; npm start
```

### 6. Access the Application

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Health Check: http://localhost:5000/api/health

Login with:
- Username: `admin`
- Password: `Admin@123` (or what you set)

## Post-Setup Configuration

### 1. Add Facilities

1. Login to the system
2. Navigate to "Facilities" page
3. Click "Add Facility"
4. Configure each facility with:
   - Name and Code
   - Device API URL
   - API Key (if required)
   - Timezone
   - Auto-sync settings

### 2. Create Shifts

1. Navigate to "Shifts" page
2. Click "Add Shift"
3. Configure shift timings:
   - Name and Code
   - Start/End times
   - Working hours
   - Grace periods
   - Break time
   - Working days

### 3. Add Employees

1. Navigate to "Employees" page
2. Click "Add Employee"
3. Fill in employee details:
   - Employee ID
   - Device ID (from biometric device)
   - Personal information
   - Assign facility and shift
   - Set department and designation

### 4. Test Data Sync

1. Go to "Facilities" page
2. Click "Sync Now" on a facility
3. Check if data syncs successfully
4. View synced attendance in "Attendance" page

## Troubleshooting

### MongoDB Connection Error
```powershell
# Check if MongoDB is running
Get-Service MongoDB

# Start MongoDB if not running
net start MongoDB
```

### Port Already in Use
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Module Not Found Errors
```powershell
# Clear node_modules and reinstall
Remove-Item node_modules -Recurse -Force
npm install

# For frontend
cd client
Remove-Item node_modules -Recurse -Force
npm install
cd ..
```

### Device API Connection Issues

1. Check if device server is accessible
2. Verify API URL in facility configuration
3. Test API endpoint manually:
```powershell
Invoke-RestMethod -Uri "http://your-device-api-url" -Method Get
```

## Verification Checklist

- [ ] MongoDB is running
- [ ] Backend server starts without errors
- [ ] Frontend loads at http://localhost:3000
- [ ] Can login with admin credentials
- [ ] All menu items are accessible
- [ ] Can create facilities
- [ ] Can create shifts
- [ ] Can create employees
- [ ] Data sync works for at least one facility
- [ ] Dashboard displays data
- [ ] Reports generate successfully

## Production Deployment

### 1. Build Frontend
```powershell
cd client
npm run build
cd ..
```

### 2. Update Environment Variables
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-secure-production-secret
CORS_ORIGIN=https://your-domain.com
```

### 3. Start Production Server
```powershell
npm start
```

### 4. Use Process Manager (PM2)
```powershell
# Install PM2
npm install -g pm2

# Start application
pm2 start server/server.js --name attendance-system

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

## Maintenance

### Database Backup
```powershell
# Backup MongoDB database
mongodump --db attendance-tracking --out "C:\backups\attendance-$(Get-Date -Format 'yyyy-MM-dd')"
```

### View Logs
```powershell
# With PM2
pm2 logs attendance-system

# Or check log files
Get-Content logs\app.log -Tail 50 -Wait
```

### Update Application
```powershell
# Pull latest changes (if using git)
git pull

# Install new dependencies
npm install
cd client; npm install; cd ..

# Rebuild frontend
cd client; npm run build; cd ..

# Restart server
pm2 restart attendance-system
```

## Support

For issues and questions:
- Check README.md for detailed documentation
- Review API_DOCUMENTATION.md for API usage
- Check application logs for errors
- Verify all configuration settings
