# Simple XO5 Database Test
Write-Host "Testing XO5 Database Integration..." -ForegroundColor Cyan

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

Write-Host "Testing Health Endpoint..." -ForegroundColor Green

try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/xo5/health" -Method Get -ContentType "application/json"
    Write-Host "SUCCESS: Health Check Passed" -ForegroundColor Green
    Write-Host "Server Uptime: $([math]::Round($healthResponse.server.uptime)) seconds" -ForegroundColor Gray
} catch {
    Write-Host "ERROR: Health Check Failed - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure the server is running with: npm start" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Testing XO5 Record Endpoint..." -ForegroundColor Green

try {
    $recordResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/xo5/record" -Method Post -Body $testData -ContentType "application/json"
    Write-Host "SUCCESS: Record Response - $($recordResponse.status)" -ForegroundColor Green
    Write-Host "Message: $($recordResponse.message)" -ForegroundColor Gray
    
    if ($recordResponse.attendanceId) {
        Write-Host "ATTENDANCE ID: $($recordResponse.attendanceId)" -ForegroundColor Cyan
        Write-Host "*** DATA WAS SAVED TO DATABASE! ***" -ForegroundColor Green -BackgroundColor Black
    } else {
        Write-Host "WARNING: No attendance ID returned - check employee setup" -ForegroundColor Yellow
    }
    
    Write-Host "Person ID: $($recordResponse.personId)" -ForegroundColor Gray
    Write-Host "Record ID: $($recordResponse.recordId)" -ForegroundColor Gray
    
} catch {
    Write-Host "ERROR: Record Test Failed - $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $errorDetails = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorDetails)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error Details: $errorBody" -ForegroundColor Red
        } catch {
            Write-Host "Could not read error details" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Test Complete!" -ForegroundColor Cyan