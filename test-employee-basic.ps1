# Test Employee Registration - Basic Connectivity Test

$apiUrl = "http://localhost:8081/api/employee/register"

# Test data based on your input
$testData = @{
    personId = "EMP0023"
    name = "John Doe"
    deviceKey = "12345678"
    secret = "12345678" 
    email = "john.doe@company.com"
    department = "IT"
    position = "Developer"
    verificationStyle = 1
} | ConvertTo-Json

Write-Host "Testing Employee Registration Endpoint..." -ForegroundColor Green
Write-Host "URL: $apiUrl" -ForegroundColor Yellow
Write-Host "Data: $testData" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $testData -ContentType "application/json"
    
    Write-Host "`nResponse received:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    
    if ($response.code -eq "000") {
        Write-Host "`n✅ SUCCESS: Device connectivity test passed!" -ForegroundColor Green
        Write-Host "Device Status: $($response.data.deviceConnected)" -ForegroundColor Green
        Write-Host "Status Message: $($response.data.status)" -ForegroundColor Green
    } else {
        Write-Host "`n❌ FAILED: $($response.msg)" -ForegroundColor Red
    }
} catch {
    Write-Host "`n❌ ERROR: Failed to connect to API" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nIs the service running? Check: http://localhost:8081" -ForegroundColor Yellow
}

Write-Host "`nNext steps after success:" -ForegroundColor Cyan
Write-Host "1. Add face image processing" -ForegroundColor White
Write-Host "2. Implement actual device enrollment" -ForegroundColor White
Write-Host "3. Test with real face data" -ForegroundColor White