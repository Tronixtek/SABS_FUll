#!/bin/bash

# SABS Deployment Script for DigitalOcean
# Run this script on your DigitalOcean server: 143.198.150.26

echo "🚀 SABS Deployment Script Starting..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js (Latest LTS)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
echo "📦 Installing MongoDB..."
sudo apt-get install gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Java 17 for Java service
echo "📦 Installing Java 17..."
sudo apt-get install -y openjdk-17-jdk

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Git (if not already installed)
echo "📦 Installing Git..."
sudo apt-get install -y git

# Clone the repository
echo "📥 Cloning SABS repository..."
cd /opt
sudo git clone https://github.com/Tronixtek/SABS_FUll.git sabs
sudo chown -R $USER:$USER /opt/sabs
cd /opt/sabs

# Install MERN dependencies
echo "📦 Installing MERN dependencies..."
npm install

# Install client dependencies
cd client
npm install
cd ..

# Build client for production
echo "🔨 Building React client..."
cd client
npm run build
cd ..

# Create production environment file
echo "⚙️ Creating production environment..."
cp .env.example .env
sed -i "s/localhost/127.0.0.1/g" .env
sed -i "s/3000/5000/g" .env
echo "NODE_ENV=production" >> .env

# Create PM2 ecosystem file
echo "⚙️ Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'sabs-backend',
      script: 'server.js',
      cwd: '/opt/sabs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log'
    }
  ]
}
EOF

# Create logs directory
mkdir -p logs

# Build Java service
echo "🔨 Building Java service..."
cd java-attendance-service
chmod +x mvnw
./mvnw clean package -DskipTests
cd ..

# Create systemd service for Java application
echo "⚙️ Creating Java service..."
sudo tee /etc/systemd/system/sabs-java.service > /dev/null << 'EOF'
[Unit]
Description=SABS Java Attendance Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/sabs/java-attendance-service
ExecStart=/usr/bin/java -jar target/attendance-gateway-1.0.jar
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=sabs-java
Environment=JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

[Install]
WantedBy=multi-user.target
EOF

# Set up Nginx (optional - for serving static files and reverse proxy)
echo "📦 Installing and configuring Nginx..."
sudo apt-get install -y nginx

sudo tee /etc/nginx/sites-available/sabs > /dev/null << 'EOF'
server {
    listen 80;
    server_name 143.198.150.26;

    # Serve React app
    location / {
        root /opt/sabs/client/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Java service proxy
    location /java-api/ {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/sabs /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Start services
echo "🚀 Starting all services..."

# Start Java service
sudo systemctl daemon-reload
sudo systemctl enable sabs-java
sudo systemctl start sabs-java

# Start Node.js backend with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Deployment completed!"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://143.198.150.26"
echo "   Backend API: http://143.198.150.26/api"
echo "   Java Service: http://143.198.150.26/java-api"
echo ""
echo "📊 Service Status:"
echo "   MongoDB: sudo systemctl status mongod"
echo "   Java Service: sudo systemctl status sabs-java"
echo "   Node.js Backend: pm2 status"
echo "   Nginx: sudo systemctl status nginx"
echo ""
echo "📝 Logs:"
echo "   Java Service: sudo journalctl -u sabs-java -f"
echo "   Node.js Backend: pm2 logs sabs-backend"
echo "   Nginx: sudo tail -f /var/log/nginx/error.log"
