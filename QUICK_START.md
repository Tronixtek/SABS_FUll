# QUICK START COMMANDS

## Copy and paste these commands in PowerShell

### Step 1: Navigate to project directory
```powershell
cd "c:\Users\PC\Desktop\attendance tracking system"
```

### Step 2: Install backend dependencies
```powershell
npm install
```

### Step 3: Install frontend dependencies
```powershell
cd client
npm install
cd ..
```

### Step 4: Create .env file
```powershell
Copy-Item .env.example .env
```

### Step 5: Start MongoDB (if not running)
```powershell
net start MongoDB
```

### Step 6: Run the application
```powershell
# This will start both backend and frontend
npm run dev:full
```

### Alternative: Run backend and frontend separately

**Terminal 1 - Backend:**
```powershell
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd client
npm start
```

## After Starting

1. **Frontend will open at**: http://localhost:3000
2. **Backend API runs at**: http://localhost:5000

## Create First Admin User

### Option 1: Using API (after backend is running)
```powershell
$body = @{
    username = "admin"
    email = "admin@attendance.com"
    password = "Admin@12345"
    firstName = "System"
    lastName = "Administrator"
    role = "super-admin"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method Post -Body $body -ContentType "application/json"
```

### Option 2: Using MongoDB Shell
```javascript
// Open MongoDB shell
mongo

// Switch to database
use attendance-tracking

// Create admin user
db.users.insertOne({
  username: "admin",
  email: "admin@attendance.com",
  password: "$2a$10$YourHashedPasswordHere",
  firstName: "System",
  lastName: "Administrator",
  role: "super-admin",
  permissions: [],
  status: "active",
  facilities: [],
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## Login Credentials

**After creating admin user:**
- Username: `admin`
- Password: `Admin@12345` (or whatever you set)

## Verify Installation

### Check if services are running:
```powershell
# Check if backend is running
Invoke-RestMethod -Uri "http://localhost:5000/api/health"

# Should return: {"status":"OK","timestamp":"...","uptime":...}
```

### Check processes:
```powershell
# Check Node processes
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# Check port usage
netstat -ano | findstr :5000
netstat -ano | findstr :3000
```

## Troubleshooting Commands

### If ports are in use:
```powershell
# Find and kill process on port 5000
$port5000 = netstat -ano | findstr :5000 | ForEach-Object {$_.Split()[-1]} | Select-Object -First 1
if ($port5000) { taskkill /PID $port5000 /F }

# Find and kill process on port 3000
$port3000 = netstat -ano | findstr :3000 | ForEach-Object {$_.Split()[-1]} | Select-Object -First 1
if ($port3000) { taskkill /PID $port3000 /F }
```

### Clear and reinstall dependencies:
```powershell
# Backend
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm install

# Frontend
cd client
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm install
cd ..
```

### Check MongoDB status:
```powershell
# Check if MongoDB service exists and is running
Get-Service MongoDB -ErrorAction SilentlyContinue

# Start MongoDB if stopped
Start-Service MongoDB -ErrorAction SilentlyContinue
```

### View logs:
```powershell
# Backend logs (if using npm run dev)
# Logs will appear in the terminal

# Check for error files
Get-ChildItem -Path . -Filter *.log -Recurse
```

## Production Build Commands

### Build frontend for production:
```powershell
cd client
npm run build
cd ..
```

### Start in production mode:
```powershell
$env:NODE_ENV="production"
npm start
```

### Using PM2 (Process Manager):
```powershell
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start server/server.js --name attendance-system

# View status
pm2 status

# View logs
pm2 logs attendance-system

# Stop application
pm2 stop attendance-system

# Restart application
pm2 restart attendance-system

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Database Management

### Backup MongoDB:
```powershell
$backupPath = "C:\backups\attendance-$(Get-Date -Format 'yyyy-MM-dd-HHmmss')"
New-Item -ItemType Directory -Path $backupPath -Force
mongodump --db attendance-tracking --out $backupPath
```

### Restore MongoDB:
```powershell
$restorePath = "C:\backups\attendance-2025-10-16"
mongorestore --db attendance-tracking "$restorePath\attendance-tracking"
```

### Clear all data (WARNING: This will delete all data):
```powershell
mongo attendance-tracking --eval "db.dropDatabase()"
```

## Update Application

### Pull latest changes (if using git):
```powershell
git pull origin main
npm install
cd client
npm install
npm run build
cd ..
pm2 restart attendance-system
```

## Testing Device API

### Test device API connectivity:
```powershell
# Replace with your device API URL
$deviceUrl = "http://your-device-api.com/api/attendance"
$from = (Get-Date).AddDays(-1).ToString("yyyy-MM-ddTHH:mm:ssZ")
$to = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")

Invoke-RestMethod -Uri "$deviceUrl`?from=$from&to=$to" -Method Get
```

## Common Issues and Fixes

### Issue: "Cannot find module"
```powershell
# Solution: Reinstall dependencies
npm install
cd client; npm install; cd ..
```

### Issue: "MongoDB connection error"
```powershell
# Solution: Start MongoDB
net start MongoDB
```

### Issue: "Port already in use"
```powershell
# Solution: Kill process using the port
# See "Troubleshooting Commands" section above
```

### Issue: "npm not recognized"
```powershell
# Solution: Install Node.js from https://nodejs.org/
# Then restart PowerShell
```

## System Requirements Check

```powershell
# Check Node.js version (should be 14+)
node --version

# Check npm version
npm --version

# Check MongoDB version
mongo --version

# Check if MongoDB is running
Get-Service MongoDB
```

## All-in-One Setup Script

```powershell
# Run this entire block to set everything up
cd "c:\Users\PC\Desktop\attendance tracking system"
npm install
cd client; npm install; cd ..
Copy-Item .env.example .env -Force
net start MongoDB
Write-Host "Setup complete! Now run: npm run dev:full" -ForegroundColor Green
```

---

**🎉 You're ready to go! Follow the steps above to get your attendance tracking system running.**
