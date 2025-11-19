# Commands to run on your Digital Ocean server (via SSH)

# 1. Navigate to your existing SABS project directory
cd /path/to/your/existing/sabs/project

# 2. Stop any currently running containers
docker-compose down

# 3. Pull the latest changes from GitHub
git pull origin main

# 4. Create/update environment variables
# Create a .env file in the root directory
cat > .env << EOF
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://mongodb:27017/attendance_system
JWT_SECRET=your-strong-production-jwt-secret-change-this
JAVA_SERVICE_URL=http://java-service:8080
CORS_ORIGIN=https://your-firebase-domain.web.app
DEVICE_IP=143.198.150.26
SERVER_IP=143.198.150.26
MERN_BACKEND_URL=http://backend:5000
EOF

# 5. Update the docker-compose.yml to remove frontend service (since it's on Firebase)
# Edit the docker-compose.yml to comment out or remove the frontend service
nano docker-compose.yml

# 6. Build and start the services
docker-compose up --build -d

# 7. Check if services are running
docker-compose ps

# 8. Check logs
docker-compose logs -f backend
docker-compose logs -f java-service
docker-compose logs -f mongodb

# 9. Test the endpoints
curl http://localhost:5000/api/health
curl http://localhost:8080/health

# 10. Configure firewall (if not already done)
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP  
sudo ufw allow 443   # HTTPS
sudo ufw allow 5000  # Node.js backend
sudo ufw allow 8080  # Java service
sudo ufw enable

# 11. Set up Nginx reverse proxy (optional but recommended)
sudo apt update
sudo apt install nginx

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/sabs << EOF
server {
    listen 80;
    server_name your-domain.com;

    # Node.js API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Java service
    location /java-api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health checks
    location /health {
        proxy_pass http://localhost:5000/api/health;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/sabs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable nginx

# 12. Monitor the deployment
# Check running containers
docker ps

# Check logs in real-time
docker-compose logs -f

# Check system resources
htop
df -h

# 13. Test endpoints externally (replace YOUR_SERVER_IP with actual IP)
curl http://YOUR_SERVER_IP:5000/api/health
curl http://YOUR_SERVER_IP:8080/health

# Or if using Nginx:
curl http://YOUR_SERVER_IP/api/health
curl http://YOUR_SERVER_IP/java-api/health