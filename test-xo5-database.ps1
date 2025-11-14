# XO5 Database Test Script
Write-Host "🧪 Testing XO5 Database Integration..." -ForegroundColor Cyan
Write-Host ""

# Test data
$testData = @{
    recordId = "test-db-001"
    deviceKey = "XO5-DEVICE-001"
    recordTime = ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()).ToString()
    recordTimeStr = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    personSn = "1001"
    personName = "Test User"
    resultFlag = "1"
    personType = "1" 
    direction = "1"
    faceFlag = "1"
    fingerFlag = "0"
    cardFlag = "0"
    pwdFlag = "0"
} | ConvertTo-Json

Write-Host "📋 Test Data:" -ForegroundColor Yellow
Write-Host $testData

Write-Host ""
Write-Host "1️⃣ Testing Health Endpoint..." -ForegroundColor Green

try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/xo5/health" -Method Get -ContentType "application/json"
    Write-Host "✅ Health Check: $($healthResponse.message)" -ForegroundColor Green
    Write-Host "   Server Uptime: $([math]::Round($healthResponse.server.uptime)) seconds" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Make sure the server is running with: npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "2️⃣ Testing XO5 Record Endpoint..." -ForegroundColor Green

try {
    $recordResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/xo5/record" -Method Post -Body $testData -ContentType "application/json"
    Write-Host "✅ Record Response: $($recordResponse.status)" -ForegroundColor Green
    Write-Host "   Message: $($recordResponse.message)" -ForegroundColor Gray
    
    if ($recordResponse.attendanceId) {
        Write-Host "🎯 Attendance ID: $($recordResponse.attendanceId)" -ForegroundColor Cyan
        Write-Host "✅ DATA WAS SAVED TO DATABASE!" -ForegroundColor Green -BackgroundColor Black
    } else {
        Write-Host "⚠️ No attendance ID returned - check employee setup" -ForegroundColor Yellow
    }
    
    Write-Host "   Person ID: $($recordResponse.personId)" -ForegroundColor Gray
    Write-Host "   Record ID: $($recordResponse.recordId)" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Record Test Failed: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $errorDetails = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorDetails)
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Error Details: $errorBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "3️⃣ Testing General API Health..." -ForegroundColor Green

try {
    $apiHealth = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get
    Write-Host "✅ Main API Health: $($apiHealth.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Main API Health Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🏁 Test Complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. If attendance ID was returned, data IS being saved to DB ✅" -ForegroundColor White
Write-Host "   2. If no attendance ID, check:" -ForegroundColor White
Write-Host "      - Employee with Device ID 1001 exists" -ForegroundColor Gray
Write-Host "      - Employee has a shift assigned" -ForegroundColor Gray
Write-Host "      - MongoDB is connected" -ForegroundColor Gray
Write-Host "   3. Check server logs for detailed information" -ForegroundColor White