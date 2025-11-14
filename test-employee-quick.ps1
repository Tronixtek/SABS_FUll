# Test Employee Registration API
# PowerShell script to test the employee management endpoints

Write-Host "Testing XO5 Employee Management API" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green

$baseUrl = "http://localhost:8081"
$deviceKey = "020e7096a03c670f63"
$secret = "123456"

# Test 1: Device Connection
Write-Host "Testing Device Connection..." -ForegroundColor Yellow
try {
    $testResponse = Invoke-RestMethod -Uri "$baseUrl/api/test" -Method Post -ContentType "application/json" -Body (@{
        deviceKey = $deviceKey
        secret = $secret
    } | ConvertTo-Json)
    
    if ($testResponse.code -eq "000") {
        Write-Host "Device connection successful" -ForegroundColor Green
        Write-Host "Response: $($testResponse.msg)" -ForegroundColor Cyan
    } else {
        Write-Host "Device connection failed: $($testResponse.msg)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Failed to connect to service: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Get Current Employee List
Write-Host "Checking Current Employee List..." -ForegroundColor Yellow
try {
    $listResponse = Invoke-RestMethod -Uri "$baseUrl/api/employee/list" -Method Post -ContentType "application/json" -Body (@{
        deviceKey = $deviceKey
        secret = $secret
    } | ConvertTo-Json)
    
    if ($listResponse.code -eq "000") {
        $employeeCount = $listResponse.data.Count
        Write-Host "Current employees on device: $employeeCount" -ForegroundColor Green
    }
} catch {
    Write-Host "Could not retrieve employee list: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Register Test Employee
Write-Host "Registering Test Employee..." -ForegroundColor Yellow

# Create a simple test image (1x1 pixel PNG in Base64)
$testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

$testEmployee = @{
    personId = "TEST$(Get-Random -Minimum 100 -Maximum 999)"
    name = "Test Employee $(Get-Date -Format 'MMdd')"
    faceImages = @($testImageBase64)
    deviceKey = $deviceKey
    secret = $secret
    email = "test@example.com"
    department = "IT Testing"
    position = "Test Engineer"
    verificationStyle = 0
}

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/employee/register" -Method Post -ContentType "application/json" -Body ($testEmployee | ConvertTo-Json)
    
    if ($registerResponse.code -eq "000") {
        Write-Host "Employee registration successful!" -ForegroundColor Green
        Write-Host "Employee ID: $($registerResponse.data.personId)" -ForegroundColor Cyan
        Write-Host "Name: $($registerResponse.data.name)" -ForegroundColor Cyan
        
        $registeredId = $registerResponse.data.personId
        
        # Test 4: Verify Registration by Finding Employee
        Write-Host "Verifying Employee Registration..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        
        try {
            $findResponse = Invoke-RestMethod -Uri "$baseUrl/api/employee/find/$registeredId" -Method Post -ContentType "application/json" -Body (@{
                deviceKey = $deviceKey
                secret = $secret
            } | ConvertTo-Json)
            
            if ($findResponse.code -eq "000") {
                Write-Host "Employee found on device!" -ForegroundColor Green
                Write-Host "Verified: Employee $registeredId is enrolled" -ForegroundColor Cyan
            } else {
                Write-Host "Employee not found on device: $($findResponse.msg)" -ForegroundColor Red
            }
        } catch {
            Write-Host "Could not verify employee: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } else {
        Write-Host "Employee registration failed: $($registerResponse.msg)" -ForegroundColor Red
        Write-Host "Code: $($registerResponse.code)" -ForegroundColor Red
    }
} catch {
    Write-Host "Registration request failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host "API Testing Complete!" -ForegroundColor Green