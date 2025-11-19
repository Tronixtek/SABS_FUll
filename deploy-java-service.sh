#!/bin/bash

echo "=== Deploying Java Service on Digital Ocean Server ==="
echo "Server IP: 143.198.150.26"
echo "Java Service Port: 8081"
echo "Node Server Port: 5000"

# Navigate to Java service directory
cd /root/SABS_FUll/java-attendance-service

# Pull latest changes (includes logging fixes and server binding configuration)
echo "=== Pulling latest changes ==="
git pull origin main

# Set environment variables for production
export SPRING_PROFILES_ACTIVE=production
export MERN_BACKEND_URL=http://143.198.150.26:5000
export DEVICE_IP=143.198.150.26
export PORT=8081

echo "=== Environment Configuration ==="
echo "SPRING_PROFILES_ACTIVE: $SPRING_PROFILES_ACTIVE"
echo "MERN_BACKEND_URL: $MERN_BACKEND_URL"
echo "DEVICE_IP: $DEVICE_IP"
echo "PORT: $PORT"

# Stop any existing Java service
echo "=== Stopping existing Java service ==="
pkill -f "hf-tcp-gateway-demo" || echo "No existing service found"

# Clean and build
echo "=== Building Java service ==="
mvn clean compile

if [ $? -eq 0 ]; then
    echo "✅ Compilation successful!"
    mvn package -DskipTests
    
    if [ $? -eq 0 ]; then
        echo "✅ JAR built successfully!"
        
        # Start the service with production profile
        echo "=== Starting Java service ==="
        nohup java -jar \
            -Dspring.profiles.active=production \
            -DMERN_BACKEND_URL=http://143.198.150.26:5000 \
            -DDEVICE_IP=143.198.150.26 \
            -DPORT=8081 \
            target/hf-tcp-gateway-demo.jar > java-service.log 2>&1 &
        
        JAVA_PID=$!
        echo "Java service started with PID: $JAVA_PID"
        
        # Wait a moment for service to start
        sleep 10
        
        # Test local connectivity
        echo "=== Testing Java service locally ==="
        curl -f http://localhost:8081/actuator/health || echo "Local health check failed"
        
        # Test external connectivity
        echo "=== Testing Java service externally ==="
        curl -f http://143.198.150.26:8081/actuator/health || echo "External health check failed"
        
        # Test integration endpoint
        echo "=== Testing integration endpoint ==="
        curl -f http://143.198.150.26:8081/api/integration/test || echo "Integration test failed"
        
        # Check if process is still running
        if ps -p $JAVA_PID > /dev/null; then
            echo "✅ Java service is running successfully!"
            echo "View logs: tail -f java-service.log"
            echo "Check process: ps aux | grep hf-tcp-gateway-demo"
            echo "Service URL: http://143.198.150.26:8081"
            echo "Health check: http://143.198.150.26:8081/actuator/health"
            echo "Integration test: http://143.198.150.26:8081/api/integration/test"
        else
            echo "❌ Java service failed to start! Check logs:"
            tail -20 java-service.log
        fi
        
    else
        echo "❌ JAR build failed!"
    fi
else
    echo "❌ Compilation failed!"
    echo "Check the error above and ensure all dependencies are available"
fi

# Show current Java processes
echo "=== Current Java processes ==="
ps aux | grep java

# Show open ports
echo "=== Open ports ==="
netstat -tulpn | grep :8081 || echo "Port 8081 not listening"
netstat -tulpn | grep :5000 || echo "Port 5000 not listening"