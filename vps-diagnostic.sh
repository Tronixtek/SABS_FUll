#!/bin/bash
# VPS Device Connection Diagnostic Script

echo "🔍 VPS Device Connection Diagnostic"
echo "===================================="
echo ""

# Check if Java service is running
echo "📊 Step 1: Checking Java Service Process..."
if pgrep -f "java.*device-service" > /dev/null; then
    echo "✅ Java service process is running"
    ps aux | grep -i java | grep -v grep
else
    echo "❌ Java service is NOT running!"
fi
echo ""

# Check Java service port
echo "📊 Step 2: Checking Java Service Port (8081)..."
if netstat -tuln | grep :8081 > /dev/null 2>&1; then
    echo "✅ Port 8081 is listening"
    netstat -tuln | grep :8081
elif ss -tuln | grep :8081 > /dev/null 2>&1; then
    echo "✅ Port 8081 is listening"
    ss -tuln | grep :8081
else
    echo "❌ Port 8081 is NOT listening"
fi
echo ""

# Test Java service HTTP endpoint
echo "📊 Step 3: Testing Java Service HTTP Response..."
if command -v curl > /dev/null; then
    echo "Testing: http://localhost:8081/api/persons"
    curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8081/api/persons
    echo ""
    echo "Response body:"
    curl -s http://localhost:8081/api/persons | head -20
else
    echo "⚠️  curl not found, skipping HTTP test"
fi
echo ""

# Check Node.js backend
echo "📊 Step 4: Checking Node.js Backend..."
if pgrep -f "node.*server" > /dev/null; then
    echo "✅ Node.js backend is running"
    ps aux | grep -i "node.*server" | grep -v grep
else
    echo "❌ Node.js backend is NOT running!"
fi
echo ""

# Check backend port
echo "📊 Step 5: Checking Backend Port (5000)..."
if netstat -tuln | grep :5000 > /dev/null 2>&1; then
    echo "✅ Port 5000 is listening"
    netstat -tuln | grep :5000
elif ss -tuln | grep :5000 > /dev/null 2>&1; then
    echo "✅ Port 5000 is listening"
    ss -tuln | grep :5000
else
    echo "❌ Port 5000 is NOT listening"
fi
echo ""

# Check environment variables
echo "📊 Step 6: Checking Environment Variables..."
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo "JAVA_SERVICE_URL: $(grep JAVA_SERVICE_URL .env | cut -d= -f2)"
    echo "PORT: $(grep ^PORT .env | cut -d= -f2)"
else
    echo "❌ .env file not found!"
fi
echo ""

# Check recent logs
echo "📊 Step 7: Checking Recent PM2 Logs..."
if command -v pm2 > /dev/null; then
    echo "Backend logs (last 20 lines):"
    pm2 logs sabs-backend --lines 20 --nostream 2>/dev/null || echo "No logs found"
    echo ""
    echo "Java service logs (last 20 lines):"
    pm2 logs sabs-java --lines 20 --nostream 2>/dev/null || echo "No logs found"
else
    echo "⚠️  PM2 not found"
fi
echo ""

echo "===================================="
echo "✅ Diagnostic complete!"
echo ""
echo "💡 Quick Fixes:"
echo "1. Start Java service: cd /path/to/device-service && ./start.sh"
echo "2. Start backend: pm2 restart sabs-backend"
echo "3. Check logs: pm2 logs"
