# 🔧 Technical Standard Operating Procedure (SOP)
## SABS - Smart Attendance & Biometric System
### Installation, Configuration, and Deployment Guide

**Document Version:** 1.0  
**Last Updated:** October 2025  
**Document Type:** Technical SOP  
**Classification:** Internal IT Use  

---

## 📋 Table of Contents

1. [Introduction](#1-introduction)
2. [System Requirements](#2-system-requirements)
3. [Pre-Installation Checklist](#3-pre-installation-checklist)
4. [Installation Procedure](#4-installation-procedure)
5. [Configuration](#5-configuration)
6. [Database Setup](#6-database-setup)
7. [Initial System Setup](#7-initial-system-setup)
8. [Biometric Device Integration](#8-biometric-device-integration)
9. [Security Configuration](#9-security-configuration)
10. [Testing & Validation](#10-testing--validation)
11. [Deployment](#11-deployment)
12. [Backup & Recovery](#12-backup--recovery)
13. [Maintenance](#13-maintenance)
14. [Troubleshooting](#14-troubleshooting)
15. [Appendix](#15-appendix)

---

## 1. Introduction

### 1.1 Purpose
This Standard Operating Procedure (SOP) provides detailed technical instructions for installing, configuring, and deploying the SABS (Smart Attendance & Biometric System) in production and development environments.

### 1.2 Scope
This document covers:
- ✅ Server infrastructure setup
- ✅ Application installation and configuration
- ✅ Database setup and initialization
- ✅ Biometric device integration
- ✅ Security hardening
- ✅ Deployment procedures
- ✅ Maintenance and monitoring

### 1.3 Target Audience
- System Administrators
- DevOps Engineers
- IT Support Staff
- Database Administrators

### 1.4 Document Conventions

| Symbol | Meaning |
|--------|---------|
| ⚠️ | Warning - Critical information |
| 🔒 | Security-related configuration |
| 📝 | Note - Additional information |
| ✅ | Verification step |
| 🚀 | Production-specific instruction |

---

## 2. System Requirements

### 2.1 Hardware Requirements

#### Development Environment
```
CPU:        2 cores minimum, 4 cores recommended
RAM:        4 GB minimum, 8 GB recommended
Storage:    20 GB available space
Network:    100 Mbps Ethernet
```

#### Production Environment
```
CPU:        4 cores minimum, 8 cores recommended
RAM:        8 GB minimum, 16 GB recommended
Storage:    100 GB SSD (scalable based on data volume)
Network:    1 Gbps Ethernet, redundant connections
Backup:     External backup storage (minimum 500 GB)
```

### 2.2 Software Requirements

#### Operating System
- **Recommended:** Ubuntu Server 20.04 LTS or higher
- **Alternative:** Windows Server 2019/2022
- **Alternative:** CentOS/RHEL 8+

#### Core Dependencies
```
Node.js:     v16.x or v18.x LTS
npm:         v8.x or higher
MongoDB:     v4.4 or higher (v5.x recommended)
Git:         v2.30 or higher
```

#### Optional (Production)
```
Nginx:       v1.18+ (reverse proxy)
PM2:         v5.x (process manager)
Docker:      v20.10+ (containerization - optional)
SSL:         Valid SSL certificate (Let's Encrypt or commercial)
```

### 2.3 Network Requirements

#### Ports Required
```
Frontend:     3000 (development), 80/443 (production)
Backend:      5000 (default, configurable)
MongoDB:      27017 (local), custom for remote
Device API:   Variable (configured per device)
```

#### Firewall Rules
```
Inbound:
  - Port 80 (HTTP) - from all (redirect to HTTPS)
  - Port 443 (HTTPS) - from all
  - Port 5000 (API) - from frontend server
  - Port 27017 (MongoDB) - from backend server only

Outbound:
  - Port 443 (HTTPS) - to biometric device APIs
  - Port 587/465 (SMTP) - for email notifications
```

### 2.4 Biometric Device Requirements

```
Device Type:      Face recognition terminal / RFID reader
API Support:      RESTful API (HTTP/HTTPS)
Network:          Ethernet connection
Authentication:   API key or basic auth
Response Format:  JSON
```

---

## 3. Pre-Installation Checklist

### 3.1 Infrastructure Checklist

```
Server Setup:
□ Server provisioned (VM or physical)
□ Operating system installed and updated
□ Static IP address assigned
□ Hostname configured
□ DNS records created (for production)
□ Firewall configured
□ SSH access configured (Linux) or RDP (Windows)
□ Non-root user created with sudo privileges
□ Time zone configured correctly
□ NTP service enabled and synchronized

Network Setup:
□ Network connectivity verified
□ Internet access confirmed
□ Biometric devices accessible on network
□ Device API endpoints documented
□ VPN configured (if required)
□ Backup network link available (production)

Access & Credentials:
□ Server admin credentials documented
□ Database admin credentials prepared
□ JWT secret key generated (strong, random)
□ Email server credentials obtained
□ SSL certificates acquired (production)
□ Biometric device API keys obtained

Documentation:
□ Network diagram prepared
□ IP address allocation documented
□ Device endpoints documented
□ Backup strategy defined
□ Disaster recovery plan documented
```

---

## 4. Installation Procedure

### 4.1 Operating System Preparation

#### For Ubuntu/Linux:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential build tools
sudo apt install -y build-essential curl git wget

# Install system utilities
sudo apt install -y htop net-tools vim nano

# Configure firewall
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw status
```

#### For Windows Server:

```powershell
# Enable PowerShell execution policy
Set-ExecutionPolicy RemoteSigned -Force

# Install Chocolatey (package manager)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install essential tools
choco install -y git
choco install -y notepadplusplus
```

### 4.2 Install Node.js

#### Linux (Ubuntu):

```bash
# Add NodeSource repository for Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify installation
node --version    # Should show v18.x.x
npm --version     # Should show v9.x.x or higher
```

#### Windows:

```powershell
# Using Chocolatey
choco install -y nodejs-lts

# Verify installation
node --version
npm --version
```

#### Alternative (Using NVM - Recommended for Development):

```bash
# Linux/Mac
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Windows (use nvm-windows from GitHub)
# Download from: https://github.com/coreybutler/nvm-windows/releases

# Install and use Node.js LTS
nvm install 18
nvm use 18
```

### 4.3 Install MongoDB

#### Linux (Ubuntu):

```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list

# Update package database
sudo apt update

# Install MongoDB
sudo apt install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

#### Windows:

```powershell
# Using Chocolatey
choco install -y mongodb

# Or download installer from MongoDB website
# https://www.mongodb.com/try/download/community

# Create data directory
New-Item -ItemType Directory -Path C:\data\db -Force

# Start MongoDB as a service
net start MongoDB
```

### 4.4 Install Git (if not already installed)

```bash
# Linux
sudo apt install -y git

# Windows (using Chocolatey)
choco install -y git

# Configure Git
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"
```

### 4.5 Clone SABS Repository

```bash
# Navigate to installation directory
cd /opt  # Linux
# or
cd C:\inetpub  # Windows

# Clone the repository (if using Git)
sudo git clone https://github.com/your-org/sabs.git
# or extract from zip file

# Navigate to project directory
cd sabs

# Verify project structure
ls -la  # Linux
dir     # Windows
```

### 4.6 Install Application Dependencies

```bash
# Install backend dependencies
npm install

# Navigate to client directory
cd client

# Install frontend dependencies
npm install

# Return to root directory
cd ..

# Verify installations
npm list --depth=0
cd client && npm list --depth=0 && cd ..
```

⚠️ **Common Issues:**
- If installation fails, clear npm cache: `npm cache clean --force`
- Use `npm install --legacy-peer-deps` if dependency conflicts occur
- Ensure adequate disk space (minimum 5GB free)

---

## 5. Configuration

### 5.1 Environment Variables Setup

#### Step 1: Create Environment File

```bash
# Copy example environment file
cp .env.example .env

# Edit environment file
nano .env  # Linux
notepad .env  # Windows
```

#### Step 2: Configure Backend Environment Variables

**File: `.env`**

```bash
# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=5000
NODE_ENV=production  # Use 'development' for dev environment

# ============================================
# DATABASE CONFIGURATION
# ============================================
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/sabs_production

# Remote MongoDB Atlas (Alternative)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sabs_production?retryWrites=true&w=majority

# ============================================
# SECURITY
# ============================================
# Generate strong JWT secret (32+ characters)
# Use: openssl rand -base64 32
JWT_SECRET=REPLACE_WITH_STRONG_RANDOM_STRING_MIN_32_CHARS
JWT_EXPIRE=7d

# ============================================
# CORS CONFIGURATION
# ============================================
# Development
# CORS_ORIGIN=http://localhost:3000

# Production (your domain)
CORS_ORIGIN=https://sabs.yourcompany.com

# ============================================
# EMAIL CONFIGURATION (for notifications)
# ============================================
EMAIL_SERVICE=gmail  # or 'smtp' for custom SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=notifications@yourcompany.com
EMAIL_PASSWORD=your_app_specific_password
EMAIL_FROM=SABS System <notifications@yourcompany.com>

# ============================================
# DATA SYNC CONFIGURATION
# ============================================
SYNC_INTERVAL=5  # Sync interval in minutes
SYNC_TIMEOUT=30000  # API timeout in milliseconds

# ============================================
# LOGGING
# ============================================
LOG_LEVEL=info  # Options: error, warn, info, debug
LOG_FILE_PATH=./logs

# ============================================
# RATE LIMITING
# ============================================
RATE_LIMIT_WINDOW=15  # Minutes
RATE_LIMIT_MAX=100  # Max requests per window
```

#### Step 3: Configure Frontend Environment Variables

**File: `client/.env`**

```bash
# API Backend URL
# Development
# REACT_APP_API_URL=http://localhost:5000

# Production
REACT_APP_API_URL=https://api.sabs.yourcompany.com

# App Configuration
REACT_APP_NAME=SABS - Smart Attendance System
REACT_APP_VERSION=1.0.0

# Disable host check for ngrok/tunneling (development only)
# DANGEROUSLY_DISABLE_HOST_CHECK=true
```

### 5.2 Generate Secure Secrets

#### Generate JWT Secret:

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
$bytes = New-Object byte[] 32
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Copy the output and paste as `JWT_SECRET` value in `.env`

### 5.3 Email Configuration

#### Using Gmail:

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Create password for "Mail" on "Other device"
   - Copy the 16-character password

3. **Update .env:**
```bash
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your_16_char_app_password
```

#### Using Custom SMTP:

```bash
EMAIL_SERVICE=smtp
EMAIL_HOST=mail.yourcompany.com
EMAIL_PORT=587  # or 465 for SSL
EMAIL_SECURE=true  # true for port 465
EMAIL_USER=notifications@yourcompany.com
EMAIL_PASSWORD=your_smtp_password
EMAIL_FROM=SABS System <notifications@yourcompany.com>
```

---

## 6. Database Setup

### 6.1 MongoDB Security Configuration

#### Enable Authentication:

```bash
# Connect to MongoDB shell
mongosh  # or 'mongo' for older versions

# Switch to admin database
use admin

# Create admin user
db.createUser({
  user: "adminUser",
  pwd: "SecurePassword123!",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
})

# Exit MongoDB shell
exit
```

#### Edit MongoDB Configuration:

**File: `/etc/mongod.conf` (Linux) or `C:\Program Files\MongoDB\Server\5.0\bin\mongod.cfg` (Windows)**

```yaml
# Network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1  # Only allow local connections (recommended)
  # bindIp: 0.0.0.0  # Allow remote connections (use with caution)

# Security
security:
  authorization: enabled

# Storage
storage:
  dbPath: /var/lib/mongodb  # Linux
  # dbPath: C:\data\db  # Windows
  journal:
    enabled: true

# Logging
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log  # Linux
  # path: C:\data\log\mongod.log  # Windows
  logAppend: true
```

#### Restart MongoDB:

```bash
# Linux
sudo systemctl restart mongod

# Windows
net stop MongoDB
net start MongoDB
```

### 6.2 Create Application Database

```bash
# Connect with admin credentials
mongosh -u adminUser -p SecurePassword123! --authenticationDatabase admin

# Create application database
use sabs_production

# Create application user
db.createUser({
  user: "sabs_app_user",
  pwd: "AppUserPassword456!",
  roles: [
    { role: "readWrite", db: "sabs_production" }
  ]
})

# Verify user creation
db.getUsers()

# Exit
exit
```

### 6.3 Update Connection String

Update `.env` file with authenticated connection string:

```bash
# If authentication is enabled
MONGODB_URI=mongodb://sabs_app_user:AppUserPassword456!@localhost:27017/sabs_production?authSource=sabs_production

# If authentication is disabled (development only)
# MONGODB_URI=mongodb://localhost:27017/sabs_production
```

### 6.4 Create Database Indexes (Performance Optimization)

Create a file `scripts/createIndexes.js`:

```javascript
// Connect to MongoDB and run this script
// mongosh -u sabs_app_user -p AppUserPassword456! sabs_production createIndexes.js

// Employees collection
db.employees.createIndex({ "employeeId": 1 }, { unique: true });
db.employees.createIndex({ "deviceId": 1 }, { sparse: true });
db.employees.createIndex({ "rfidCard": 1 }, { sparse: true });
db.employees.createIndex({ "facility": 1 });
db.employees.createIndex({ "status": 1 });

// Attendance collection
db.attendances.createIndex({ "employee": 1, "date": -1 });
db.attendances.createIndex({ "facility": 1, "date": -1 });
db.attendances.createIndex({ "date": -1 });
db.attendances.createIndex({ "status": 1 });

// Facilities collection
db.facilities.createIndex({ "name": 1 }, { unique: true });
db.facilities.createIndex({ "status": 1 });

// Shifts collection
db.shifts.createIndex({ "facility": 1 });
db.shifts.createIndex({ "name": 1 });

// Users collection
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });

print("✅ All indexes created successfully");
```

Run the script:

```bash
mongosh -u sabs_app_user -p AppUserPassword456! sabs_production < scripts/createIndexes.js
```

---

## 7. Initial System Setup

### 7.1 Build Frontend Application

```bash
# Navigate to client directory
cd client

# Build production-ready frontend
npm run build

# This creates an optimized production build in client/build/
```

### 7.2 Create Initial Admin User

#### Option 1: Using API Endpoint

```bash
# Start the backend server first
cd /path/to/sabs
npm start

# In another terminal, create admin user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@yourcompany.com",
    "password": "Admin@12345",
    "firstName": "System",
    "lastName": "Administrator",
    "role": "super-admin"
  }'
```

#### Option 2: Using MongoDB Shell

```javascript
// Connect to MongoDB
mongosh -u sabs_app_user -p AppUserPassword456! sabs_production

// Insert admin user (password is pre-hashed for "Admin@12345")
db.users.insertOne({
  username: "admin",
  email: "admin@yourcompany.com",
  password: "$2a$10$8K1p/a0dL3LKzOWR7BH3OeK7d2xJKpN0OGjBxGxJZU2QpZpKZc0gK",
  firstName: "System",
  lastName: "Administrator",
  role: "super-admin",
  createdAt: new Date(),
  updatedAt: new Date()
});

// Verify user creation
db.users.findOne({ username: "admin" });

exit
```

⚠️ **Change the default password immediately after first login!**

### 7.3 Test Backend Server

```bash
# Start backend server
npm start

# In another terminal, test health endpoint
curl http://localhost:5000/api/health

# Expected response:
# {"status":"OK","timestamp":"2025-10-19T12:00:00.000Z","uptime":123}
```

### 7.4 Test Frontend Application

```bash
# For development
cd client
npm start

# Access at http://localhost:3000
# Login with admin credentials created above
```

---

## 8. Biometric Device Integration

### 8.1 Device Network Configuration

#### Verify Device Connectivity:

```bash
# Test device API endpoint
curl -X GET "http://device-ip-address/api/test" \
  -H "Authorization: Bearer YOUR_DEVICE_API_KEY"

# Or use PowerShell
Invoke-WebRequest -Uri "http://device-ip-address/api/test" `
  -Headers @{"Authorization"="Bearer YOUR_DEVICE_API_KEY"}
```

### 8.2 Configure Facility with Device Details

#### Via Web Interface:

1. Login to SABS as admin
2. Navigate to **Facilities** → **Add Facility**
3. Fill in facility details:

```
Facility Name:     Head Office
Location:          123 Main Street, Lagos
Timezone:          Africa/Lagos
Status:            Active

Device Configuration:
Device API URL:    http://192.168.1.100/api/attendance
User API URL:      http://192.168.1.100/api/users/list
Add User URL:      http://192.168.1.100/api/users/add
Update User URL:   http://192.168.1.100/api/person/{person_uuid}
Device API Key:    your_device_api_key_here
Device Username:   admin (if using basic auth)
Device Password:   ******** (if using basic auth)

Sync Settings:
☑ Enable Auto Sync
Sync Interval:     5 minutes
```

4. Click **Test Connection** to verify
5. Click **Save Facility**

#### Via MongoDB (Advanced):

```javascript
db.facilities.insertOne({
  name: "Head Office",
  location: "123 Main Street, Lagos",
  timezone: "Africa/Lagos",
  deviceConfig: {
    attendanceApiUrl: "http://192.168.1.100/api/attendance",
    userApiUrl: "http://192.168.1.100/api/users/list",
    addUserUrl: "http://192.168.1.100/api/users/add",
    updateUserUrl: "http://192.168.1.100/api/person/{person_uuid}",
    apiKey: "your_device_api_key_here",
    username: "admin",
    password: "encrypted_password"
  },
  syncSettings: {
    enabled: true,
    interval: 5,
    lastSync: null
  },
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### 8.3 Test Device Synchronization

#### Manual Sync Test:

1. Login to SABS
2. Go to **Facilities**
3. Find your facility
4. Click **"Force Sync Now"**
5. Monitor sync logs: **Settings** → **Sync Logs**

#### Check Sync Logs:

```bash
# View sync logs
tail -f logs/sync.log

# View user sync logs
tail -f logs/user-sync.log

# View attendance logs
tail -f logs/attendance.log
```

### 8.4 Device API Format Reference

**Expected User List Response:**
```json
{
  "data": [
    {
      "personUUID": "1760669812601-IF0TTH5",
      "name": "John Doe",
      "IdCard": "12345",
      "avatar": "base64_encoded_image_or_url"
    }
  ]
}
```

**Expected Attendance Response:**
```json
{
  "data": [
    {
      "personUUID": "1760669812601-IF0TTH5",
      "time": "2025-10-19 08:30:00",
      "type": 0,  // 0=check-in, 1=check-out
      "temperature": 36.5
    }
  ]
}
```

---

## 9. Security Configuration

### 9.1 SSL/TLS Certificate Setup (Production)

#### Using Let's Encrypt (Free SSL):

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d sabs.yourcompany.com -d api.sabs.yourcompany.com

# Test auto-renewal
sudo certbot renew --dry-run
```

#### Using Commercial Certificate:

1. Purchase SSL certificate from provider
2. Download certificate files (.crt, .key, .ca-bundle)
3. Place in `/etc/ssl/certs/` directory
4. Configure Nginx (see section 9.2)

### 9.2 Nginx Reverse Proxy Configuration

**File: `/etc/nginx/sites-available/sabs`**

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name sabs.yourcompany.com api.sabs.yourcompany.com;
    
    return 301 https://$server_name$request_uri;
}

# Frontend - HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sabs.yourcompany.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/sabs.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sabs.yourcompany.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Root directory
    root /opt/sabs/client/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Backend API - HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.sabs.yourcompany.com;

    # SSL Configuration (same as above)
    ssl_certificate /etc/letsencrypt/live/sabs.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sabs.yourcompany.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
}
```

Enable site and restart Nginx:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/sabs /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 9.3 Firewall Configuration

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 'Nginx Full'
sudo ufw allow 22/tcp
sudo ufw delete allow 5000/tcp  # Remove direct access to backend
sudo ufw enable
sudo ufw status

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

### 9.4 MongoDB Security Hardening

```bash
# Disable remote access (if not needed)
# Edit /etc/mongod.conf
sudo nano /etc/mongod.conf

# Set bindIp to localhost only
net:
  bindIp: 127.0.0.1

# Enable firewall for MongoDB (if remote access needed)
sudo ufw allow from <backend-server-ip> to any port 27017

# Restart MongoDB
sudo systemctl restart mongod
```

### 9.5 Environment Variables Protection

```bash
# Set proper permissions on .env file
chmod 600 .env
chown sabs-user:sabs-user .env

# Ensure .env is in .gitignore
echo ".env" >> .gitignore
```

---

## 10. Testing & Validation

### 10.1 System Health Checks

#### Backend Health Check:

```bash
# Test backend API
curl https://api.sabs.yourcompany.com/api/health

# Expected response
{
  "status": "OK",
  "timestamp": "2025-10-19T10:30:00.000Z",
  "uptime": 3600
}
```

#### Database Connection Test:

```bash
# Test MongoDB connection
mongosh -u sabs_app_user -p AppUserPassword456! sabs_production --eval "db.runCommand({ ping: 1 })"

# Expected output
{ ok: 1 }
```

#### Frontend Accessibility Test:

```bash
# Test frontend
curl -I https://sabs.yourcompany.com

# Expected response headers
HTTP/2 200
content-type: text/html
```

### 10.2 Authentication Test

```bash
# Test login endpoint
curl -X POST https://api.sabs.yourcompany.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@12345"
  }'

# Expected response
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "username": "admin",
      "role": "super-admin"
    }
  }
}
```

### 10.3 Device Sync Test

1. Navigate to Facilities page
2. Click "Force Sync Now" for each facility
3. Verify sync logs show successful completion
4. Check that employees are synced: Navigate to Employees page
5. Verify attendance records: Navigate to Attendance page

### 10.4 Email Notification Test

```bash
# Via web interface
Settings → Email Configuration → Test Email

# Or via API
curl -X POST https://api.sabs.yourcompany.com/api/settings/test-email \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "test@yourcompany.com"}'
```

### 10.5 Performance Test

```bash
# Install Apache Bench (if not installed)
sudo apt install -y apache2-utils

# Test backend performance (100 requests, 10 concurrent)
ab -n 100 -c 10 https://api.sabs.yourcompany.com/api/health

# Expected: Server should handle >50 req/sec
```

### 10.6 Security Scan

```bash
# SSL/TLS test
curl https://www.ssllabs.com/ssltest/analyze.html?d=sabs.yourcompany.com

# Check security headers
curl -I https://sabs.yourcompany.com

# Should include:
# Strict-Transport-Security
# X-Frame-Options
# X-Content-Type-Options
```

---

## 11. Deployment

### 11.1 Process Manager Setup (PM2)

#### Install PM2:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

#### Create PM2 Ecosystem File:

**File: `ecosystem.config.js`**

```javascript
module.exports = {
  apps: [{
    name: 'sabs-backend',
    script: './server/server.js',
    instances: 2,  // Use 'max' for all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10
  }]
};
```

#### Start Application with PM2:

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd
# Copy and run the command shown in output

# Verify application is running
pm2 status
pm2 logs sabs-backend
```

#### PM2 Management Commands:

```bash
# View status
pm2 status

# View logs
pm2 logs sabs-backend
pm2 logs sabs-backend --lines 100

# Restart application
pm2 restart sabs-backend

# Stop application
pm2 stop sabs-backend

# Reload with zero downtime
pm2 reload sabs-backend

# Monitor resources
pm2 monit

# Delete process
pm2 delete sabs-backend
```

### 11.2 Systemd Service (Alternative to PM2)

**File: `/etc/systemd/system/sabs.service`**

```ini
[Unit]
Description=SABS - Smart Attendance & Biometric System
After=network.target mongodb.service

[Service]
Type=simple
User=sabs-user
WorkingDirectory=/opt/sabs
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /opt/sabs/server/server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=sabs

[Install]
WantedBy=multi-user.target
```

Enable and start service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable sabs

# Start service
sudo systemctl start sabs

# Check status
sudo systemctl status sabs

# View logs
sudo journalctl -u sabs -f
```

### 11.3 Deployment Checklist

```
Pre-Deployment:
□ All dependencies installed
□ Environment variables configured
□ Database setup completed
□ Admin user created
□ SSL certificates installed
□ Nginx configured
□ Firewall configured
□ PM2 or systemd service configured
□ All tests passed
□ Backup strategy in place

Deployment:
□ Build frontend: cd client && npm run build
□ Start backend: pm2 start ecosystem.config.js
□ Verify backend is running: pm2 status
□ Verify frontend is accessible via browser
□ Test login functionality
□ Test device synchronization
□ Verify email notifications
□ Check all major features

Post-Deployment:
□ Monitor logs for errors: pm2 logs
□ Monitor system resources: pm2 monit
□ Set up monitoring alerts
□ Document deployment date and version
□ Backup database
□ Create rollback plan
□ Train end users
```

---

## 12. Backup & Recovery

### 12.1 Database Backup

#### Automated Daily Backup Script:

**File: `/opt/sabs/scripts/backup-db.sh`**

```bash
#!/bin/bash

# Configuration
DB_NAME="sabs_production"
DB_USER="sabs_app_user"
DB_PASS="AppUserPassword456!"
BACKUP_DIR="/backup/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Perform backup
mongodump \
  --db=$DB_NAME \
  --username=$DB_USER \
  --password=$DB_PASS \
  --authenticationDatabase=$DB_NAME \
  --out=$BACKUP_DIR/backup_$DATE

# Compress backup
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $BACKUP_DIR backup_$DATE
rm -rf $BACKUP_DIR/backup_$DATE

# Remove old backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Log backup completion
echo "[$(date)] Database backup completed: backup_$DATE.tar.gz" >> /var/log/sabs-backup.log

# Optional: Upload to cloud storage (AWS S3, Azure Blob, etc.)
# aws s3 cp $BACKUP_DIR/backup_$DATE.tar.gz s3://your-bucket/backups/
```

Make script executable:

```bash
chmod +x /opt/sabs/scripts/backup-db.sh
```

#### Schedule Automated Backup (Cron):

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/sabs/scripts/backup-db.sh

# Verify cron job
crontab -l
```

### 12.2 Database Restore

```bash
# Extract backup
tar -xzf /backup/mongodb/backup_20251019_020000.tar.gz -C /tmp

# Restore database
mongorestore \
  --db=sabs_production \
  --username=sabs_app_user \
  --password=AppUserPassword456! \
  --authenticationDatabase=sabs_production \
  --drop \
  /tmp/backup_20251019_020000/sabs_production

# Verify restore
mongosh -u sabs_app_user -p AppUserPassword456! sabs_production --eval "db.stats()"
```

### 12.3 Application Backup

```bash
# Backup application files
tar -czf /backup/sabs_app_$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=client/node_modules \
  --exclude=client/build \
  --exclude=logs \
  /opt/sabs

# Backup configuration
cp /opt/sabs/.env /backup/env_backup_$(date +%Y%m%d).txt
```

### 12.4 Disaster Recovery Plan

#### Recovery Time Objective (RTO): 4 hours
#### Recovery Point Objective (RPO): 24 hours

**Recovery Steps:**

1. **Prepare New Server**
   - Provision server with same specifications
   - Install OS and required software (Node.js, MongoDB, Nginx)

2. **Restore Database**
   ```bash
   # Copy latest backup to new server
   scp backup_latest.tar.gz user@new-server:/tmp/
   
   # Restore on new server
   mongorestore --drop /tmp/backup_latest/sabs_production
   ```

3. **Restore Application**
   ```bash
   # Copy application backup
   scp sabs_app_latest.tar.gz user@new-server:/opt/
   
   # Extract
   tar -xzf /opt/sabs_app_latest.tar.gz -C /opt/
   
   # Restore .env file
   cp /backup/env_backup_latest.txt /opt/sabs/.env
   
   # Install dependencies
   cd /opt/sabs && npm install
   cd /opt/sabs/client && npm install
   ```

4. **Configure Services**
   ```bash
   # Setup PM2
   pm2 start ecosystem.config.js
   pm2 save
   
   # Setup Nginx
   # Copy nginx config and restart
   ```

5. **Verify System**
   - Test database connection
   - Test API endpoints
   - Test frontend access
   - Test device synchronization

6. **Update DNS** (if IP changed)

---

## 13. Maintenance

### 13.1 Regular Maintenance Tasks

#### Daily:
```
□ Monitor system logs for errors
□ Check PM2 status (pm2 status)
□ Verify sync is running (check sync logs)
□ Monitor disk space usage
□ Review attendance sync success rate
```

#### Weekly:
```
□ Review error logs and address issues
□ Check database size and growth
□ Monitor API response times
□ Verify backup completion
□ Review security logs
□ Update system packages (if needed)
```

#### Monthly:
```
□ Database optimization (reindex, cleanup)
□ Review and archive old logs
□ Test backup restoration
□ Review user access and permissions
□ Security audit
□ Performance tuning
□ Update documentation
```

### 13.2 Log Management

#### Log Rotation Configuration:

**File: `/etc/logrotate.d/sabs`**

```
/opt/sabs/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    missingok
    create 0644 sabs-user sabs-user
    postrotate
        pm2 reloadLogs
    endscript
}
```

#### Manual Log Cleanup:

```bash
# Archive old logs (older than 30 days)
find /opt/sabs/logs -name "*.log" -mtime +30 -exec gzip {} \;

# Delete very old compressed logs (older than 90 days)
find /opt/sabs/logs -name "*.log.gz" -mtime +90 -delete
```

### 13.3 Database Maintenance

```javascript
// Run monthly in MongoDB shell
use sabs_production

// Analyze database statistics
db.stats()

// Check collection sizes
db.attendances.stats()
db.employees.stats()

// Rebuild indexes
db.attendances.reIndex()
db.employees.reIndex()

// Remove old attendance records (optional - keep last 2 years)
db.attendances.deleteMany({
  date: { $lt: new Date(new Date().setFullYear(new Date().getFullYear() - 2)) }
})

// Compact database (reduces disk usage)
db.runCommand({ compact: 'attendances' })
```

### 13.4 System Updates

```bash
# Update system packages (Ubuntu)
sudo apt update
sudo apt upgrade -y

# Update Node.js packages
cd /opt/sabs
npm outdated
npm update

# Update PM2
sudo npm update -g pm2
pm2 update

# Restart application
pm2 restart sabs-backend
```

### 13.5 Monitoring Setup

#### Install Monitoring Tools:

```bash
# Install htop (system monitor)
sudo apt install -y htop

# Install netdata (real-time monitoring)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Access at http://your-server-ip:19999
```

#### Setup Email Alerts:

Create monitoring script: `/opt/sabs/scripts/monitor.sh`

```bash
#!/bin/bash

# Check if backend is running
if ! pm2 describe sabs-backend > /dev/null 2>&1; then
    echo "ALERT: SABS backend is down!" | mail -s "SABS Alert: Service Down" admin@yourcompany.com
    pm2 restart sabs-backend
fi

# Check disk space
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "ALERT: Disk usage is at ${DISK_USAGE}%" | mail -s "SABS Alert: Low Disk Space" admin@yourcompany.com
fi

# Check MongoDB connection
if ! mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "ALERT: MongoDB is not responding!" | mail -s "SABS Alert: Database Down" admin@yourcompany.com
fi
```

Schedule monitoring:

```bash
# Run every 5 minutes
*/5 * * * * /opt/sabs/scripts/monitor.sh
```

---

## 14. Troubleshooting

### 14.1 Common Issues & Solutions

#### Issue 1: Backend Won't Start

**Symptoms:**
- `npm start` fails
- PM2 shows "errored" status
- Port 5000 already in use

**Solutions:**

```bash
# Check if port is in use
sudo lsof -i :5000
sudo netstat -tulpn | grep 5000

# Kill process using port
sudo kill -9 <PID>

# Check for syntax errors
node server/server.js

# Check environment variables
cat .env | grep -v '^#'

# Check MongoDB connection
mongosh -u sabs_app_user -p AppUserPassword456! sabs_production --eval "db.stats()"

# Check logs
pm2 logs sabs-backend --lines 50
```

#### Issue 2: Database Connection Failed

**Symptoms:**
- Error: "MongoNetworkError: connect ECONNREFUSED"
- Backend crashes on startup

**Solutions:**

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Verify connection string in .env
grep MONGODB_URI .env

# Test connection manually
mongosh mongodb://localhost:27017/sabs_production
```

#### Issue 3: Device Sync Failing

**Symptoms:**
- No new employees synced
- No attendance records
- Timeout errors in sync logs

**Solutions:**

```bash
# Check device connectivity
ping <device-ip>
curl http://<device-ip>/api/test

# Verify device credentials in facility settings
# Check sync logs
tail -f logs/sync.log
tail -f logs/user-sync.log

# Test API manually
curl -X GET "http://<device-ip>/api/users/list" \
  -H "Authorization: Bearer <api-key>"

# Increase sync timeout in .env
SYNC_TIMEOUT=60000  # 60 seconds

# Restart backend
pm2 restart sabs-backend
```

#### Issue 4: Frontend Not Loading

**Symptoms:**
- Blank page
- "Failed to fetch" errors
- 404 errors

**Solutions:**

```bash
# Check if build exists
ls -la client/build/

# Rebuild frontend
cd client
npm run build

# Check Nginx configuration
sudo nginx -t
sudo systemctl restart nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Verify API URL in client/.env
grep REACT_APP_API_URL client/.env

# Check browser console for errors (F12)
```

#### Issue 5: High Memory Usage

**Symptoms:**
- Server becomes slow
- PM2 restarts application frequently
- "Out of memory" errors

**Solutions:**

```bash
# Check memory usage
free -h
pm2 monit

# Identify memory-consuming process
top
ps aux --sort=-%mem | head

# Increase PM2 memory limit
# Edit ecosystem.config.js
max_memory_restart: '2G'

# Restart with new config
pm2 delete sabs-backend
pm2 start ecosystem.config.js

# Add swap space (if physical RAM is low)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 14.2 Log Analysis

```bash
# Find errors in backend logs
grep -i "error" logs/*.log | tail -50

# Find sync failures
grep -i "failed" logs/sync.log | tail -20

# Monitor logs in real-time
tail -f logs/sync.log logs/error.log

# Count sync operations today
grep "$(date +%Y-%m-%d)" logs/sync.log | grep "SUCCESS" | wc -l
```

### 14.3 Performance Issues

```bash
# Check system resources
htop

# Check PM2 metrics
pm2 monit

# Analyze database performance
mongosh sabs_production --eval "db.currentOp()"

# Check slow queries (enable profiling)
mongosh sabs_production --eval "db.setProfilingLevel(1, 100)"
mongosh sabs_production --eval "db.system.profile.find().limit(10).sort({ts:-1})"

# Check index usage
mongosh sabs_production --eval "db.attendances.stats()"
```

### 14.4 Emergency Procedures

#### Backend Crash:

```bash
# 1. Check if running
pm2 status

# 2. Restart
pm2 restart sabs-backend

# 3. If restart fails, check logs
pm2 logs sabs-backend --err --lines 100

# 4. Fix issue and start
pm2 start ecosystem.config.js

# 5. Monitor
pm2 monit
```

#### Database Corruption:

```bash
# 1. Stop application
pm2 stop sabs-backend

# 2. Stop MongoDB
sudo systemctl stop mongod

# 3. Repair database
mongod --repair --dbpath /var/lib/mongodb

# 4. Start MongoDB
sudo systemctl start mongod

# 5. Verify database
mongosh sabs_production --eval "db.stats()"

# 6. Restore from backup if needed
mongorestore --drop /backup/latest/

# 7. Start application
pm2 start sabs-backend
```

---

## 15. Appendix

### 15.1 Command Reference

#### PM2 Commands:
```bash
pm2 start <app>           # Start application
pm2 stop <app>            # Stop application
pm2 restart <app>         # Restart application
pm2 reload <app>          # Zero-downtime reload
pm2 delete <app>          # Remove from PM2
pm2 logs <app>            # View logs
pm2 monit                 # Monitor resources
pm2 status                # List all processes
pm2 save                  # Save process list
pm2 resurrect             # Restore saved processes
```

#### MongoDB Commands:
```bash
mongosh                   # Connect to MongoDB shell
mongodump                 # Backup database
mongorestore              # Restore database
mongostat                 # Monitor MongoDB stats
mongotop                  # Monitor read/write activity
```

#### Nginx Commands:
```bash
sudo nginx -t             # Test configuration
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx
sudo systemctl status nginx
```

#### System Commands:
```bash
sudo systemctl status <service>
sudo systemctl start <service>
sudo systemctl stop <service>
sudo systemctl restart <service>
sudo systemctl enable <service>
sudo systemctl disable <service>
journalctl -u <service> -f
```

### 15.2 Port Reference

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Frontend (dev) | 3000 | HTTP | React dev server |
| Backend | 5000 | HTTP | Node.js API |
| MongoDB | 27017 | TCP | Database |
| HTTP | 80 | HTTP | Web traffic (redirects to HTTPS) |
| HTTPS | 443 | HTTPS | Secure web traffic |
| Netdata | 19999 | HTTP | Monitoring dashboard |

### 15.3 File Locations

```
Application Root:        /opt/sabs
Backend Code:            /opt/sabs/server
Frontend Code:           /opt/sabs/client
Frontend Build:          /opt/sabs/client/build
Environment Variables:   /opt/sabs/.env
Logs:                    /opt/sabs/logs
Backups:                 /backup/mongodb

MongoDB Data:            /var/lib/mongodb
MongoDB Logs:            /var/log/mongodb
Nginx Config:            /etc/nginx/sites-available/sabs
Nginx Logs:              /var/log/nginx
SSL Certificates:        /etc/letsencrypt/live
PM2 Logs:                ~/.pm2/logs
Systemd Service:         /etc/systemd/system/sabs.service
```

### 15.4 Environment Variables Reference

```bash
# Required
PORT                     # Backend port (default: 5000)
NODE_ENV                 # Environment: development/production
MONGODB_URI              # Database connection string
JWT_SECRET               # JWT signing secret (min 32 chars)

# Optional
JWT_EXPIRE               # Token expiration (default: 7d)
CORS_ORIGIN              # Allowed CORS origin
SYNC_INTERVAL            # Sync interval in minutes (default: 5)
SYNC_TIMEOUT             # API timeout in ms (default: 30000)
LOG_LEVEL                # Logging level (default: info)

# Email
EMAIL_SERVICE            # Email provider (gmail/smtp)
EMAIL_HOST               # SMTP host
EMAIL_PORT               # SMTP port (587/465)
EMAIL_SECURE             # Use SSL/TLS (true/false)
EMAIL_USER               # Email username
EMAIL_PASSWORD           # Email password
EMAIL_FROM               # From address

# Security
RATE_LIMIT_WINDOW        # Rate limit window (minutes)
RATE_LIMIT_MAX           # Max requests per window
```

### 15.5 Default Credentials

⚠️ **Change these immediately after installation!**

```
Admin User:
  Username: admin
  Password: Admin@12345
  Email:    admin@yourcompany.com

MongoDB:
  Admin User:     adminUser
  Admin Password: SecurePassword123!
  App User:       sabs_app_user
  App Password:   AppUserPassword456!
```

### 15.6 Support & Resources

```
Documentation:           /opt/sabs/README.md
User Manual:             /opt/sabs/SABS_USER_MANUAL.md
Technical SOP:           /opt/sabs/TECHNICAL_SOP.md
Setup Guide:             /opt/sabs/SETUP_GUIDE.md

GitHub Repository:       https://github.com/your-org/sabs
Issue Tracker:           https://github.com/your-org/sabs/issues
Technical Support:       tech@yourcompany.com
Emergency Contact:       +234-XXX-XXX-XXXX
```

### 15.7 Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-19 | Initial release |

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Prepared By** | IT Department | __________ | ________ |
| **Reviewed By** | System Admin | __________ | ________ |
| **Approved By** | IT Manager | __________ | ________ |

---

**📄 End of Technical SOP**

*This document is confidential and for internal use only.*
*Last Updated: October 2025*
