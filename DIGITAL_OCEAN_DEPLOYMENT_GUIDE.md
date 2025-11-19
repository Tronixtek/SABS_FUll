# Digital Ocean Deployment Guide

## Current Status
✅ SSH connected to Digital Ocean server
✅ Previous SABS project folder exists on server
✅ Client deployed to Firebase
✅ Need to deploy: Java service + Node.js server

## Deployment Steps

### 1. Update the existing project on Digital Ocean

```bash
# Navigate to your existing SABS project folder
cd /path/to/your/sabs/project

# Pull latest changes from GitHub
git pull origin main

# Or if you need to fetch from specific branch
git fetch origin
git checkout main
git pull origin main
```

### 2. Check what's currently running

```bash
# Check running containers
docker ps

# Check running processes
ps aux | grep node
ps aux | grep java

# Check ports in use
netstat -tulpn | grep :8080
netstat -tulpn | grep :8081
netstat -tulpn | grep :27017
```

### 3. Stop existing services (if any)

```bash
# Stop Docker containers
docker stop $(docker ps -q)

# Or stop specific services
sudo pkill -f "node"
sudo pkill -f "java"
```

### 4. Update environment variables

```bash
# Navigate to server folder
cd server

# Create/update .env file
nano .env
```

Add these environment variables:
```
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb://localhost:27017/attendance-tracking
JWT_SECRET=your-jwt-secret-key
CORS_ORIGIN=https://your-firebase-domain.web.app
```

### 5. Install/Update dependencies

```bash
# For Node.js server
cd server
npm install

# For Java service
cd ../java-attendance-service
mvn clean package -DskipTests
```

### 6. Set up MongoDB (if not already running)

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# If not installed, install MongoDB
sudo apt update
sudo apt install mongodb

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 7. Deploy using Docker Compose (Recommended)

Create docker-compose.yml in project root:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: sabs-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: attendance-tracking
    networks:
      - sabs-network

  node-server:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: sabs-node-server
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/attendance-tracking
      - JWT_SECRET=your-jwt-secret-key
      - CORS_ORIGIN=https://your-firebase-domain.web.app
    depends_on:
      - mongodb
    networks:
      - sabs-network

  java-service:
    build:
      context: ./java-attendance-service
      dockerfile: Dockerfile.java
    container_name: sabs-java-service
    ports:
      - "8081:8081"
    environment:
      - SERVER_PORT=8081
      - NODE_SERVER_URL=http://node-server:8080
    depends_on:
      - node-server
    networks:
      - sabs-network

volumes:
  mongodb_data:

networks:
  sabs-network:
    driver: bridge
```

### 8. Deploy the services

```bash
# Build and start all services
docker-compose up --build -d

# Check if services are running
docker-compose ps

# Check logs
docker-compose logs -f node-server
docker-compose logs -f java-service
docker-compose logs -f mongodb
```

### 9. Alternative: Manual deployment

If you prefer not to use Docker:

```bash
# Start MongoDB
sudo systemctl start mongod

# Start Node.js server
cd server
npm install
npm start &

# Start Java service
cd ../java-attendance-service
mvn clean package -DskipTests
java -jar target/hf-tcp-gateway-demo.jar &
```

### 10. Configure Nginx (if using reverse proxy)

```bash
# Install Nginx if not already installed
sudo apt update
sudo apt install nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/sabs
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Node.js API
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Java service
    location /java-api {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/sabs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 11. Set up SSL with Let's Encrypt (Optional)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 12. Monitor and troubleshoot

```bash
# Check running services
docker-compose ps
netstat -tulpn | grep :8080
netstat -tulpn | grep :8081

# View logs
docker-compose logs -f
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Test endpoints
curl http://localhost:8080/api/health
curl http://localhost:8081/health
```

## Environment Variables Needed

Make sure to update these in your server/.env file:

```
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb://localhost:27017/attendance-tracking
JWT_SECRET=your-strong-jwt-secret
CORS_ORIGIN=https://your-firebase-domain.web.app
```

## Firewall Configuration

```bash
# Allow required ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 8080  # Node.js (if not behind Nginx)
sudo ufw allow 8081  # Java service (if not behind Nginx)
sudo ufw enable
```

## Health Checks

Test your deployment:

1. **MongoDB**: `mongo --eval "db.adminCommand('ismaster')"`
2. **Node.js**: `curl http://localhost:8080/api/health`
3. **Java service**: `curl http://localhost:8081/health`
4. **Frontend**: Check your Firebase URL

## Next Steps

1. Execute the commands above on your Digital Ocean server
2. Update CORS settings in your server to allow your Firebase domain
3. Test all endpoints
4. Monitor logs for any issues

Let me know if you need help with any specific step!