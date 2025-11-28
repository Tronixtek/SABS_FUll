# Java Service Deployment - Production Setup

## Option 1: Using systemd (Recommended for Production)

### 1. Create a systemd service file
```bash
sudo nano /etc/systemd/system/sabs-java-service.service
```

Add this content:
```ini
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
```

### 2. Enable and start the service
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start at boot
sudo systemctl enable sabs-java-service

# Start the service
sudo systemctl start sabs-java-service

# Check status
sudo systemctl status sabs-java-service

# View logs
sudo journalctl -u sabs-java-service -f
```

### 3. Service management commands
```bash
# Start service
sudo systemctl start sabs-java-service

# Stop service
sudo systemctl stop sabs-java-service

# Restart service
sudo systemctl restart sabs-java-service

# Check if service is running
sudo systemctl is-active sabs-java-service

# View logs
sudo journalctl -u sabs-java-service --since "1 hour ago"
```

---

## Option 2: Using Docker (Recommended for Containers)

### 1. Build and run as Docker container
```bash
cd /root/SABS_FUll

# Stop any existing containers
docker-compose down

# Build and start just the Java service
docker-compose up -d java-service

# Check if running
docker ps

# View logs
docker-compose logs -f java-service
```

---

## Option 3: Using screen/tmux (Simple but not production-ready)

### Using screen:
```bash
# Install screen if not available
sudo apt install screen

# Start a new screen session
screen -S java-service

# Navigate and start service
cd /root/SABS_FUll/java-attendance-service
java -jar target/hf-tcp-gateway-demo.jar

# Detach from screen: Press Ctrl+A then D
# Reattach to screen: screen -r java-service
```

### Using tmux:
```bash
# Install tmux if not available
sudo apt install tmux

# Start tmux session
tmux new-session -d -s java-service

# Run command in tmux
tmux send-keys -t java-service "cd /root/SABS_FUll/java-attendance-service" Enter
tmux send-keys -t java-service "java -jar target/hf-tcp-gateway-demo.jar" Enter

# Attach to session: tmux attach -t java-service
# Detach: Ctrl+B then D
```

---

## Option 4: Using nohup (Background process)

```bash
cd /root/SABS_FUll/java-attendance-service

# Kill any existing processes
pkill -f "hf-tcp-gateway-demo"

# Start with nohup
nohup java -jar target/hf-tcp-gateway-demo.jar > java-service.log 2>&1 &

# Check if running
ps aux | grep hf-tcp-gateway-demo

# View logs
tail -f java-service.log
```

---

## Quick Setup Script

Here's a complete script to set up the systemd service:

```bash
#!/bin/bash

echo "Setting up SABS Java Service for continuous operation..."

# Navigate to project directory
cd /root/SABS_FUll/java-attendance-service

# Kill any existing processes
pkill -f "hf-tcp-gateway-demo"

# Ensure the JAR is built
mvn clean package -DskipTests

# Create systemd service file
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
sudo systemctl daemon-reload
sudo systemctl enable sabs-java-service
sudo systemctl start sabs-java-service

echo "Service setup complete!"
echo "Check status with: sudo systemctl status sabs-java-service"
echo "View logs with: sudo journalctl -u sabs-java-service -f"

# Wait a moment and check status
sleep 3
sudo systemctl status sabs-java-service
```

---

## Monitoring and Maintenance

### Health checks:
```bash
# Check if service is running
curl http://143.198.150.26:8081/api/health

# Check system resource usage
htop
df -h

# Check logs for errors
sudo journalctl -u sabs-java-service --since "1 hour ago" | grep ERROR
```

### Auto-restart on failure:
The systemd service is configured with `Restart=always` which means:
- Service restarts automatically if it crashes
- Service starts automatically when server boots
- 10-second delay between restart attempts

---

## Recommended Approach:

**Use Option 1 (systemd)** for production because it provides:
- ✅ Auto-restart on failure
- ✅ Auto-start on server boot
- ✅ Proper logging integration
- ✅ Resource management
- ✅ Service status monitoring

Run the quick setup script above to get started!