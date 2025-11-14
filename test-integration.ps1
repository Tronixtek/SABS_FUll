# Integration Connectivity Test Script
# Tests the communication between MERN backend and Java service

Write-Host "🔄 MERN-Java Integration Test" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

$mernUrl = "http://localhost:5000"
$javaUrl = "http://localhost:8081"
$authKey = "java-service-auth-key-2025"

# Test 1: Check MERN Backend Health
Write-Host "`n1️⃣ Testing MERN Backend Health..." -ForegroundColor Yellow
try {
    $mernHealth = Invoke-RestMethod -Uri "$mernUrl/api/health" -Method Get -TimeoutSec 10
    Write-Host "✅ MERN Backend is running" -ForegroundColor Green
    Write-Host "   Status: $($mernHealth.status)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ MERN Backend is not running" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   💡 Please start the MERN backend with: npm run dev" -ForegroundColor Yellow
}

# Test 2: Check Java Service Health
Write-Host "`n2️⃣ Testing Java Service Health..." -ForegroundColor Yellow
try {
    $javaTest = Invoke-RestMethod -Uri "$javaUrl/api/test" -Method Post -ContentType "application/json" -Body (@{
        deviceKey = "test-device"
        secret = "123456"
    } | ConvertTo-Json) -TimeoutSec 10
    
    Write-Host "✅ Java Service is running" -ForegroundColor Green
    Write-Host "   Response: $($javaTest.msg)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Java Service is not running" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   💡 Please start the Java service with: mvn spring-boot:run" -ForegroundColor Yellow
}

# Test 3: Test Integration Endpoints
Write-Host "`n3️⃣ Testing Integration Connectivity..." -ForegroundColor Yellow

# Test MERN -> Java connectivity
Write-Host "`n   🔵 Testing MERN Integration Test Endpoint..." -ForegroundColor Cyan
try {
    $mernIntegrationTest = Invoke-RestMethod -Uri "$mernUrl/api/integration/test" -Method Get -TimeoutSec 15
    Write-Host "   ✅ MERN Integration Test Successful" -ForegroundColor Green
    Write-Host "   Java Service Status: $($mernIntegrationTest.data.javaService.status)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ MERN Integration Test Failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Java -> MERN connectivity
Write-Host "`n   🟠 Testing Java Integration Test Endpoint..." -ForegroundColor Cyan
try {
    $javaIntegrationTest = Invoke-RestMethod -Uri "$javaUrl/api/integration/test" -Method Get -TimeoutSec 15
    Write-Host "   ✅ Java Integration Test Successful" -ForegroundColor Green
    Write-Host "   MERN Backend Connected: $($javaIntegrationTest.data.mernBackendConnected)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Java Integration Test Failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Test Employee Sync
Write-Host "`n4️⃣ Testing Employee Sync (Java -> MERN)..." -ForegroundColor Yellow
try {
    $testEmployee = @{
        employeeId = "TEST001"
        firstName = "Test"
        lastName = "Employee"
        email = "test@example.com"
        deviceId = "DEVICE001"
    }
    
    $syncResult = Invoke-RestMethod -Uri "$javaUrl/api/integration/test/employee" -Method Post -ContentType "application/json" -Body ($testEmployee | ConvertTo-Json) -TimeoutSec 15
    
    if ($syncResult.data.syncSuccess) {
        Write-Host "✅ Employee sync test successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Employee sync test failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Employee sync test error" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Test Attendance Sync
Write-Host "`n5️⃣ Testing Attendance Sync (Java -> MERN)..." -ForegroundColor Yellow
try {
    $testAttendance = @{
        employeeId = "TEST001"
        type = "check-in"
        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        deviceId = "DEVICE001"
    }
    
    $attendanceResult = Invoke-RestMethod -Uri "$javaUrl/api/integration/test/attendance" -Method Post -ContentType "application/json" -Body ($testAttendance | ConvertTo-Json) -TimeoutSec 15
    
    if ($attendanceResult.data.syncSuccess) {
        Write-Host "✅ Attendance sync test successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Attendance sync test failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Attendance sync test error" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Test Service Authentication
Write-Host "`n6️⃣ Testing Service Authentication..." -ForegroundColor Yellow
try {
    $headers = @{
        'X-Service-Auth' = $authKey
        'Content-Type' = 'application/json'
    }
    
    $authTestData = @{
        employeeId = "AUTH_TEST001"
        firstName = "Auth"
        lastName = "Test"
    }
    
    $authResult = Invoke-RestMethod -Uri "$mernUrl/api/integration/employee/sync" -Method Post -Headers $headers -Body ($authTestData | ConvertTo-Json) -TimeoutSec 10
    Write-Host "✅ Service authentication successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Service authentication failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host "`n📋 Integration Test Summary" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host "MERN Backend URL: $mernUrl" -ForegroundColor Cyan
Write-Host "Java Service URL: $javaUrl" -ForegroundColor Cyan
Write-Host "Authentication Key: ***masked***" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Ensure both services are running" -ForegroundColor White
Write-Host "2. Check firewall/network settings" -ForegroundColor White
Write-Host "3. Verify environment variables" -ForegroundColor White
Write-Host "4. Test with real device data" -ForegroundColor White