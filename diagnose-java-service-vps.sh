#!/bin/bash

echo "=== SABS Java Service Diagnostic Tool ==="
echo ""

echo "1. Checking Java Version:"
java -version

echo ""
echo "2. Checking Maven Version:"
mvn -version

echo ""
echo "3. Checking Project Directory:"
ls -lah /root/SABS_FUll/java-attendance-service/

echo ""
echo "4. Checking Target Directory:"
ls -lah /root/SABS_FUll/java-attendance-service/target/ 2>/dev/null || echo "Target directory does not exist (build never completed)"

echo ""
echo "5. Checking pom.xml exists:"
if [ -f "/root/SABS_FUll/java-attendance-service/pom.xml" ]; then
    echo "✅ pom.xml exists"
    echo "OpenCV dependency in pom.xml:"
    grep -A 4 "opencv" /root/SABS_FUll/java-attendance-service/pom.xml || echo "⚠️ OpenCV dependency not found in pom.xml"
else
    echo "❌ pom.xml not found!"
fi

echo ""
echo "6. Checking Haar Cascade file:"
if [ -f "/root/SABS_FUll/java-attendance-service/src/main/resources/haarcascades/haarcascade_frontalface_default.xml" ]; then
    echo "✅ Haar Cascade file exists"
    ls -lh /root/SABS_FUll/java-attendance-service/src/main/resources/haarcascades/
else
    echo "❌ Haar Cascade file missing"
fi

echo ""
echo "7. Checking Service Status:"
sudo systemctl status sabs-java-service --no-pager

echo ""
echo "8. Last 30 lines of service logs:"
sudo journalctl -u sabs-java-service -n 30 --no-pager

echo ""
echo "9. Checking for build errors in logs:"
sudo journalctl -u sabs-java-service | grep -i "error\|exception\|failed" | tail -20

echo ""
echo "10. Disk space:"
df -h /root

echo ""
echo "=== Diagnostic Complete ==="
echo ""
echo "Common Issues:"
echo "- If JAR not found: Maven build failed (run rebuild script)"
echo "- If OpenCV errors: Face detection will be disabled (service works anyway)"
echo "- If port 8081 in use: Another process using port (check with: lsof -i :8081)"
