# Troubleshooting XO5 Device Heartbeat Issues

## Commands to run on your Digital Ocean server (SSH):

# 1. Check current log level and enable more verbose logging
cd /root/SABS_FUll/java-attendance-service

# 2. Check if there are any heartbeat-related configurations
grep -r -i "heartbeat" src/ || echo "No heartbeat config found in source"
grep -r -i "ping" src/ || echo "No ping config found in source"

# 3. Enable DEBUG logging for the gateway
# Edit application.properties to add debug logging
echo "logging.level.com.hfims.xcan.gateway=DEBUG" >> src/main/resources/application.properties
echo "logging.level.io.netty=DEBUG" >> src/main/resources/application.properties

# 4. Restart Java service with debug logging
pkill -f "hf-tcp-gateway-demo"
mvn clean package -DskipTests
nohup java -jar target/hf-tcp-gateway-demo.jar > java-service-debug.log 2>&1 &

# 5. Monitor logs for heartbeat activity
tail -f java-service-debug.log | grep -i -E "(heartbeat|ping|alive|status)"

# 6. Check what data is actually being received
# Look for the actual message content in the logs
tail -f java-service-debug.log | grep -A5 -B5 "READ:"

# 7. Test device connectivity directly
# Check if device is sending any structured data
netstat -an | grep :10010

# 8. Capture network traffic to see what device is sending
# Install tcpdump if not available
which tcpdump || apt-get update && apt-get install -y tcpdump

# Monitor traffic on port 10010
tcpdump -i any -X port 10010

# 9. Check if device IP is in employee database
# Connect to MongoDB and search for device
mongo attendance-tracking --eval "db.employees.find({deviceId: '197.210.76.145'})"

# 10. Manual device status check
curl -X POST http://localhost:8081/api/integration/device-status \
  -H "Content-Type: application/json" \
  -d '{"deviceIp": "197.210.76.145"}'

## Device Configuration Check:

# The connecting device (197.210.76.145) should be configured with:
# Server IP: 143.198.150.26
# Server Port: 10010
# Communication Protocol: TCP
# Data Format: Should send heartbeat every 30-60 seconds

## Expected Heartbeat Message Format:
# Most XO5 devices send heartbeat in this format:
# {"type":"heartbeat","deviceId":"XO5-001","timestamp":1700000000,"status":"online"}

## If no heartbeat is seen:

# 1. Check if device is configured correctly:
#    - Server IP: 143.198.150.26 (your Digital Ocean server)
#    - Port: 10010
#    - Enable heartbeat in device settings

# 2. Check if device time is synchronized
# 3. Verify device network connectivity
# 4. Check if device firmware supports heartbeat

## Next Steps:
# 1. Run the debug commands above
# 2. Check device web interface for heartbeat settings
# 3. Verify device is registered in your employee database
# 4. If still no heartbeat, the device might need reconfiguration