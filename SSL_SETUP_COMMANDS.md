# SABS Backend SSL Setup Commands
# Domain: sabs-backend.hefrias.ng
# Run these commands on your server (143.198.150.26)

# ============================================
# STEP 1: VERIFY DOMAIN POINTS TO YOUR SERVER
# ============================================
# First, make sure sabs-backend.hefrias.ng points to 143.198.150.26
# You can test this with: nslookup sabs-backend.hefrias.ng

# ============================================
# STEP 2: INSTALL NGINX AND SSL TOOLS
# ============================================

# Update system
sudo apt update && sudo apt upgrade -y

# Install nginx
sudo apt install nginx -y

# Install certbot for SSL
sudo apt install certbot python3-certbot-nginx -y

# ============================================
# STEP 3: CREATE NGINX CONFIGURATION
# ============================================

# Create nginx config for your domain
sudo nano /etc/nginx/sites-available/sabs-backend

# Copy and paste this configuration:
server {
    listen 80;
    server_name sabs-backend.hefrias.ng;
    
    # Temporary location for SSL setup
    location / {
        return 200 '{"message": "SABS Backend - Setting up SSL..."}';
        add_header Content-Type application/json;
    }
}

# Enable the site
sudo ln -s /etc/nginx/sites-available/sabs-backend /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Start nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# ============================================
# STEP 4: GET SSL CERTIFICATE
# ============================================

# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d sabs-backend.hefrias.ng

# Follow the prompts:
# 1. Enter email: admin@hefrias.ng
# 2. Agree to terms: Y
# 3. Share email with EFF: Y or N (your choice)

# ============================================
# STEP 5: UPDATE NGINX CONFIGURATION FOR API
# ============================================

# After SSL is working, update the nginx config
sudo nano /etc/nginx/sites-available/sabs-backend

# Replace with this full configuration:
server {
    listen 80;
    server_name sabs-backend.hefrias.ng;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sabs-backend.hefrias.ng;
    
    ssl_certificate /etc/letsencrypt/live/sabs-backend.hefrias.ng/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sabs-backend.hefrias.ng/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    # Node.js API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Content-Type, Authorization, X-Requested-With' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin * always;
            add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header Access-Control-Allow-Headers 'Content-Type, Authorization, X-Requested-With' always;
            add_header Content-Length 0;
            return 204;
        }
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5000/api/health;
    }
    
    # Root info
    location / {
        return 200 '{"message": "SABS Backend API", "domain": "sabs-backend.hefrias.ng", "endpoints": ["/api/*", "/health"], "note": "Frontend communicates only with Node.js API"}';
        add_header Content-Type application/json;
    }
}

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx

# ============================================
# STEP 6: UPDATE SERVER ENVIRONMENT
# ============================================

# Go to your Node.js app directory
cd /path/to/your/SABS_FUll/server

# Create/update .env file
nano .env

# Add these environment variables:
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sabs_attendance
JAVA_SERVICE_URL=http://127.0.0.1:8081
ENABLE_JAVA_INTEGRATION=true
CORS_ORIGIN=https://your-frontend-domain.com
JWT_SECRET=your-secure-jwt-secret
XO5_WEBHOOK_URL=https://sabs-backend.hefrias.ng/api/xo5/record

# Restart your Node.js service
sudo systemctl restart sabs-node

# ============================================
# STEP 7: TEST YOUR SETUP
# ============================================

# Test SSL certificate
curl https://sabs-backend.hefrias.ng

# Test API health
curl https://sabs-backend.hefrias.ng/health

# Test specific API endpoint
curl https://sabs-backend.hefrias.ng/api/health

# ============================================
# STEP 8: SET UP AUTO-RENEWAL
# ============================================

# Add certbot renewal to crontab
sudo crontab -e

# Add this line:
0 3 * * * certbot renew --quiet && systemctl reload nginx

# ============================================
# VERIFICATION CHECKLIST
# ============================================

# ✅ Domain points to your server
# ✅ SSL certificate is valid
# ✅ Nginx is running and configured
# ✅ Node.js service is running on port 5000
# ✅ Java service is running on port 8081 (if needed)
# ✅ API endpoints respond correctly
# ✅ CORS allows your frontend domain

echo "🎉 SSL setup complete!"
echo "Your secure backend is available at: https://sabs-backend.hefrias.ng"