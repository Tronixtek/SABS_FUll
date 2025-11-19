#!/bin/bash

# Script to fix Lombok logging issues and rebuild Java service
echo "=== Fixing Lombok logging issues in Java service ==="

cd /root/SABS_FUll/java-attendance-service

# Fix IntegrationController.java
echo "Fixing IntegrationController.java..."
sed -i 's/import lombok.extern.slf4j.Slf4j;/import org.slf4j.Logger;\nimport org.slf4j.LoggerFactory;/' src/main/java/com/hfims/xcan/gateway/tcp/demo/web/IntegrationController.java
sed -i 's/@Slf4j//' src/main/java/com/hfims/xcan/gateway/tcp/demo/web/IntegrationController.java
sed -i '/public class IntegrationController extends BaseController {/a\\n    private static final Logger log = LoggerFactory.getLogger(IntegrationController.class);' src/main/java/com/hfims/xcan/gateway/tcp/demo/web/IntegrationController.java

# Fix MernBackendService.java
echo "Fixing MernBackendService.java..."
sed -i 's/import lombok.extern.slf4j.Slf4j;/import org.slf4j.Logger;\nimport org.slf4j.LoggerFactory;/' src/main/java/com/hfims/xcan/gateway/tcp/demo/service/MernBackendService.java
sed -i 's/@Slf4j//' src/main/java/com/hfims/xcan/gateway/tcp/demo/service/MernBackendService.java
sed -i '/public class MernBackendService {/a\\n    private static final Logger log = LoggerFactory.getLogger(MernBackendService.class);' src/main/java/com/hfims/xcan/gateway/tcp/demo/service/MernBackendService.java

echo "=== Building Java service ==="
mvn clean compile

if [ $? -eq 0 ]; then
    echo "✅ Compilation successful! Building JAR..."
    mvn package -DskipTests
    
    if [ $? -eq 0 ]; then
        echo "✅ JAR built successfully!"
        echo "=== Starting Java service ==="
        
        # Kill any existing Java processes
        pkill -f "hf-tcp-gateway-demo"
        
        # Start the service
        nohup java -jar target/hf-tcp-gateway-demo.jar > java-service.log 2>&1 &
        
        echo "Java service started! PID: $!"
        echo "Check logs with: tail -f java-service.log"
        echo "Check if running with: ps aux | grep hf-tcp-gateway-demo"
        
        sleep 3
        
        # Test the service
        echo "=== Testing service ==="
        curl -f http://localhost:8081/api/integration/test || echo "Service not ready yet, check logs"
        
    else
        echo "❌ JAR build failed!"
    fi
else
    echo "❌ Compilation failed!"
fi