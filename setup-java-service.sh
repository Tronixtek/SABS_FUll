#!/bin/bash

echo "🚀 Setting up SABS Java Service for continuous operation..."

# Navigate to project directory
cd /root/SABS_FUll/java-attendance-service

# Kill any existing processes
echo "🔄 Stopping existing Java service..."
pkill -f "hf-tcp-gateway-demo"

# Ensure the JAR is built
echo "🔨 Building Java service..."
mvn clean package -DskipTests

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix compilation errors first."
    exit 1
fi

# Create systemd service file
echo "📝 Creating systemd service..."
sudo tee /etc/systemd/system/sabs-java-service.service > /dev/null <<EOF
[Unit]
Description=SABS Java Attendance Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/SABS_FUll/java-attendance-service
ExecStart=/usr/bin/java -jar /root/SABS_FUll/java-attendance-service/target/hf-tcp-gateway-demo.jar
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sabs-java
Environment=SPRING_PROFILES_ACTIVE=production

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
echo "🔧 Configuring systemd service..."
sudo systemctl daemon-reload
sudo systemctl enable sabs-java-service
sudo systemctl start sabs-java-service

echo "✅ Service setup complete!"
echo ""
echo "📊 Service Status:"
sudo systemctl status sabs-java-service --no-pager

echo ""
echo "🔍 Service Management Commands:"
echo "  Start:   sudo systemctl start sabs-java-service"
echo "  Stop:    sudo systemctl stop sabs-java-service"  
echo "  Restart: sudo systemctl restart sabs-java-service"
echo "  Status:  sudo systemctl status sabs-java-service"
echo "  Logs:    sudo journalctl -u sabs-java-service -f"

echo ""
echo "🌐 Testing service endpoints..."
sleep 5

# Test the service
curl -f http://localhost:8081/api/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Service is responding at http://localhost:8081/api/health"
else
    echo "⚠️  Service may still be starting up. Check logs with:"
    echo "   sudo journalctl -u sabs-java-service -f"
fi

echo ""
echo "🎉 Java service is now running continuously!"
echo "   It will auto-restart if it crashes and auto-start when server boots."