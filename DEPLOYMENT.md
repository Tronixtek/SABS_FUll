# SABS Deployment Guide - DigitalOcean Server

## 🚀 Quick Deployment Steps

### Step 1: Push to GitHub Repository

On your local machine:

```bash
# Navigate to project directory
cd "C:\Users\PC\Desktop\attendance tracking system - Copy"

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial SABS deployment ready"

# Add remote repository
git remote add origin https://github.com/Tronixtek/SABS_FUll.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 2: Deploy on DigitalOcean Server

SSH into your server and run these commands:

```bash
# SSH into server
ssh root@143.198.150.26

# Update system
apt update && apt upgrade -y

# Install Git (if not installed)
apt install -y git

# Clone the repository
cd /opt
git clone https://github.com/Tronixtek/SABS_FUll.git sabs
cd sabs

# Make scripts executable
chmod +x *.sh

# Option 1: Quick Docker Deployment (Recommended)
./start-sabs.sh

# Option 2: Manual Installation (If Docker not preferred)
./deploy.sh
```

## 📦 What Gets Deployed

### Services Started:
1. **MongoDB** (Database) - Port 27017
2. **SABS Backend** (Node.js/Express) - Port 5000  
3. **SABS Frontend** (React) - Port 80
4. **Java Service** (Spring Boot) - Port 8080

### File Structure on Server:
```
/opt/sabs/
├── client/                 # React frontend
├── server/                 # Node.js backend
├── java-attendance-service/ # Java microservice
├── docker-compose.yml      # Docker configuration
├── start-sabs.sh          # Quick start script
├── deploy.sh              # Manual deployment script
└── logs/                  # Application logs
```

## 🔧 Configuration

### Environment Variables
The system will use production settings automatically. Key configurations:

```env
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/attendance_system  
PORT=5000
JAVA_SERVICE_URL=http://localhost:8080
```

### Default Credentials
- **Admin Email**: admin@sabs.com
- **Password**: (You need to set this during first setup)

## 🌐 Access the Application

After deployment, access SABS at:
- **Main Application**: http://143.198.150.26
- **API Documentation**: http://143.198.150.26:5000/api
- **Java Service Health**: http://143.198.150.26:8080/actuator/health

## 🔍 Monitoring & Troubleshooting

### Check Service Status
```bash
# With Docker (Recommended method)
docker-compose ps
docker-compose logs -f

# With Manual Installation
pm2 status                           # Node.js backend
sudo systemctl status sabs-java     # Java service
sudo systemctl status mongod        # MongoDB
```

### View Logs
```bash
# Docker logs
docker-compose logs backend         # Backend logs
docker-compose logs java-service    # Java service logs
docker-compose logs mongodb         # Database logs

# Manual installation logs
pm2 logs sabs-backend              # Backend logs
sudo journalctl -u sabs-java -f    # Java service logs
tail -f /var/log/mongodb/mongod.log # MongoDB logs
```

### Common Issues & Solutions

#### Issue 1: Services won't start
```bash
# Check if ports are occupied
sudo netstat -tulpn | grep :5000
sudo netstat -tulpn | grep :8080

# Restart services
docker-compose restart
# OR
pm2 restart all
sudo systemctl restart sabs-java
```

#### Issue 2: Database connection errors
```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

#### Issue 3: Java service connection issues
```bash
# Check Java service status
sudo systemctl status sabs-java

# Restart Java service
sudo systemctl restart sabs-java

# View Java logs
sudo journalctl -u sabs-java -f
```

## 🔄 Updates & Maintenance

### Update Application
```bash
cd /opt/sabs
git pull origin main

# With Docker
docker-compose down
docker-compose up --build -d

# With Manual Installation
pm2 reload all
sudo systemctl restart sabs-java
```

### Backup Database
```bash
# Create backup directory
mkdir -p /backup/sabs

# Backup MongoDB
mongodump --db attendance_system --out /backup/sabs/$(date +%Y%m%d_%H%M%S)
```

### Monitor Disk Space
```bash
df -h
du -sh /opt/sabs
```

## 🔐 Security Considerations

1. **Change default passwords** immediately after deployment
2. **Configure firewall** to allow only necessary ports:
   ```bash
   ufw allow 22    # SSH
   ufw allow 80    # HTTP
   ufw allow 443   # HTTPS (if SSL configured)
   ufw enable
   ```
3. **Regular updates**: Keep system and dependencies updated
4. **SSL Certificate**: Consider adding HTTPS with Let's Encrypt

## 📞 Support

If you encounter any issues:

1. **Check logs** first (see monitoring section above)
2. **Restart services** if needed
3. **Contact system administrator** for complex issues

## 🎉 Success Indicators

You'll know the deployment is successful when:

- ✅ All Docker containers are running (`docker-compose ps`)
- ✅ You can access the web interface at http://143.198.150.26
- ✅ Login page loads without errors
- ✅ API endpoints respond (check http://143.198.150.26:5000/api/health)
- ✅ Java service health check passes (http://143.198.150.26:8080/actuator/health)

---

**Note**: This deployment guide assumes Ubuntu 20.04+ LTS. Adjust commands as needed for other operating systems.
