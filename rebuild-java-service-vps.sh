#!/bin/bash

echo "=== SABS Java Service Rebuild with Face Detection ==="
echo "This script rebuilds the Java service with OpenCV face detection support"
echo "Run this script on the VPS after pulling latest changes"
echo ""

# Navigate to Java service directory
cd /root/SABS_FUll/java-attendance-service || { echo "❌ Failed to navigate to java-attendance-service"; exit 1; }

echo "=== Step 1: Verify Haar Cascade File Exists ==="
HAAR_CASCADE="src/main/resources/haarcascades/haarcascade_frontalface_default.xml"
if [ ! -f "$HAAR_CASCADE" ]; then
    echo "⚠️ Haar Cascade file not found. Downloading..."
    mkdir -p src/main/resources/haarcascades
    wget -O "$HAAR_CASCADE" https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml
    if [ $? -eq 0 ]; then
        echo "✅ Haar Cascade downloaded successfully"
    else
        echo "❌ Failed to download Haar Cascade"
        exit 1
    fi
else
    echo "✅ Haar Cascade file exists"
fi

echo ""
echo "=== Step 2: Clean Previous Build ==="
mvn clean
if [ $? -ne 0 ]; then
    echo "❌ Maven clean failed"
    exit 1
fi

echo ""
echo "=== Step 3: Download Dependencies (Including OpenCV) ==="
mvn dependency:resolve
if [ $? -ne 0 ]; then
    echo "❌ Failed to download dependencies"
    echo "Checking internet connectivity and Maven repository access..."
    exit 1
fi

echo ""
echo "=== Step 4: Verify OpenCV Dependency ==="
mvn dependency:tree | grep opencv
if [ $? -eq 0 ]; then
    echo "✅ OpenCV dependency found"
else
    echo "⚠️ OpenCV dependency not found in dependency tree"
fi

echo ""
echo "=== Step 5: Compile Source Code ==="
# Set Maven memory options to prevent OOM
export MAVEN_OPTS="-Xmx512m -Xms256m"
mvn compile
if [ $? -ne 0 ]; then
    echo "❌ Compilation failed!"
    echo ""
    echo "Common issues:"
    echo "1. OpenCV native library loading errors (non-critical if face detection disabled)"
    echo "2. Missing Java 17 (run: java -version)"
    echo "3. Syntax errors in EmployeeController.java"
    echo ""
    echo "Check logs above for specific errors"
    exit 1
fi

echo ""
echo "=== Step 6: Package JAR File ==="
echo "Using memory-optimized Maven settings..."
export MAVEN_OPTS="-Xmx512m -Xms256m -XX:MaxMetaspaceSize=256m"
mvn package -DskipTests -Dmaven.compiler.fork=false
if [ $? -ne 0 ]; then
    echo "❌ Packaging failed!"
    echo ""
    echo "If you see 'Killed' message, your VPS may be out of memory."
    echo "Solutions:"
    echo "1. Add swap space: sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile"
    echo "2. Stop other services temporarily: sudo systemctl stop nginx mongodb"
    echo "3. Try building with even less memory: MAVEN_OPTS='-Xmx256m' mvn package -DskipTests"
    exit 1
fi

echo ""
echo "=== Step 7: Verify JAR File Created ==="
JAR_FILE="target/hf-tcp-gateway-demo.jar"
if [ -f "$JAR_FILE" ]; then
    JAR_SIZE=$(du -h "$JAR_FILE" | cut -f1)
    echo "✅ JAR file created successfully: $JAR_FILE ($JAR_SIZE)"
    ls -lh "$JAR_FILE"
else
    echo "❌ JAR file not found at $JAR_FILE"
    echo "Checking target directory:"
    ls -lh target/
    exit 1
fi

echo ""
echo "=== Step 8: Stop Existing Service ==="
sudo systemctl stop sabs-java-service
echo "✅ Service stopped"

echo ""
echo "=== Step 9: Start Service ==="
sudo systemctl start sabs-java-service
sleep 3

echo ""
echo "=== Step 10: Check Service Status ==="
sudo systemctl status sabs-java-service --no-pager

echo ""
echo "=== Step 11: Check Recent Logs ==="
echo "Recent service logs:"
sudo journalctl -u sabs-java-service -n 50 --no-pager

echo ""
echo "=== Step 12: Test Java Service Endpoint ==="
sleep 5
echo "Testing health endpoint..."
curl -s http://localhost:8081/actuator/health || curl -s http://localhost:8081/api/health || echo "⚠️ Service may still be starting up"

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "✅ Java service rebuilt and restarted successfully!"
echo ""
echo "Next steps:"
echo "1. Check if face detection initialized: sudo journalctl -u sabs-java-service | grep 'Face detection'"
echo "2. Monitor logs: sudo journalctl -u sabs-java-service -f"
echo "3. Test employee registration with face detection"
echo ""
echo "If face detection shows warnings (OpenCV not initialized), the service will still work"
echo "but face validation will be skipped and handled by XO5 device only."
