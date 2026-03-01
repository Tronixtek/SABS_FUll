#!/bin/bash

##
# SABS Nginx Configuration Deployment Script
# This script backs up current nginx config, applies new configuration with proper timeouts,
# and optionally deploys all services
##

set -e

echo "=================================================="
echo "  SABS Nginx Configuration & Deployment Script"
echo "=================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Backup current nginx configuration
echo -e "${YELLOW}[1/6] Backing up current nginx configuration...${NC}"
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d-%H%M%S)
echo -e "${GREEN}✅ Backup created${NC}"
echo ""

# Step 2: Create new nginx configuration
echo -e "${YELLOW}[2/6] Creating new nginx configuration...${NC}"
sudo tee /etc/nginx/sites-available/default > /dev/null <<'EOF'
##
# SABS Attendance System - Nginx Configuration
# This file proxies API requests to Node.js backend and serves the React frontend
##

server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    # Root directory for static files (if serving React build from nginx)
    root /var/www/html;
    index index.html index.htm;

    # API Backend Proxy - Node.js on port 5000
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Extended timeouts for long-running device operations (15 minutes)
        proxy_read_timeout 900s;
        proxy_connect_timeout 900s;
        proxy_send_timeout 900s;
        proxy_buffering off;
    }

    # Java Service Proxy - Spring Boot on port 8081
    location /java-api/ {
        proxy_pass http://localhost:8081/;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Extended timeouts
        proxy_read_timeout 900s;
        proxy_connect_timeout 900s;
        proxy_send_timeout 900s;
    }

    # Default location - serve static files or React app
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Deny access to .htaccess files
    location ~ /\.ht {
        deny all;
    }

    # Extended timeouts at server level
    client_body_timeout 900s;
    client_header_timeout 900s;
    send_timeout 900s;
}
EOF
echo -e "${GREEN}✅ New configuration created${NC}"
echo ""

# Step 3: Test nginx configuration
echo -e "${YELLOW}[3/6] Testing nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors. Restoring backup...${NC}"
    sudo cp /etc/nginx/sites-available/default.backup.$(date +%Y%m%d)* /etc/nginx/sites-available/default
    exit 1
fi
echo ""

# Step 4: Reload nginx
echo -e "${YELLOW}[4/6] Reloading nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✅ Nginx reloaded successfully${NC}"
echo ""

# Step 5: Verify nginx status
echo -e "${YELLOW}[5/6] Verifying nginx status...${NC}"
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
else
    echo -e "${RED}❌ Nginx failed to start${NC}"
    sudo systemctl status nginx
    exit 1
fi
echo ""

# Step 6: Display current configuration summary
echo -e "${YELLOW}[6/6] Configuration Summary:${NC}"
echo "  - /api/* → http://localhost:5000 (Node.js Backend)"
echo "  - /java-api/* → http://localhost:8081 (Java Service)"
echo "  - Timeouts: 900 seconds (15 minutes)"
echo ""

echo -e "${GREEN}=================================================="
echo "  ✅ Nginx Configuration Deployed Successfully!"
echo "==================================================${NC}"
echo ""

# Optional: Deploy services
read -p "Do you want to deploy all services now? (Java + Node + Frontend) [y/N]: " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "=================================================="
    echo "  Deploying All Services"
    echo "=================================================="
    echo ""
    
    # Deploy Java Service
    echo -e "${YELLOW}Deploying Java Service...${NC}"
    cd /root/SABS_FUll
    bash deploy-java-service.sh
    echo -e "${GREEN}✅ Java service deployed${NC}"
    echo ""
    
    # Restart Node Backend
    echo -e "${YELLOW}Restarting Node Backend...${NC}"
    pm2 restart sabs-node-server || pm2 start server/index.js --name sabs-node-server
    echo -e "${GREEN}✅ Node backend restarted${NC}"
    echo ""
    
    # Optional: Build and deploy frontend
    read -p "Do you want to build and deploy frontend to Firebase? [y/N]: " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Building and deploying frontend...${NC}"
        cd /root/SABS_FUll/client
        npm run build
        firebase deploy --only hosting
        echo -e "${GREEN}✅ Frontend deployed${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}=================================================="
    echo "  ✅ All Services Deployed Successfully!"
    echo "==================================================${NC}"
fi

echo ""
echo "To verify the configuration:"
echo "  - Check nginx: sudo systemctl status nginx"
echo "  - Check Node.js: pm2 status"
echo "  - Check Java: sudo systemctl status sabs-java-service"
echo "  - View nginx logs: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "To restore backup if needed:"
echo "  sudo cp /etc/nginx/sites-available/default.backup.* /etc/nginx/sites-available/default"
echo "  sudo systemctl reload nginx"
echo ""
