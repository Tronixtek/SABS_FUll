# Test Create Facility API
# This script tests the Node.js backend create facility endpoint

$serverUrl = "http://143.198.150.26:5000"  # Change to your server URL
# $serverUrl = "http://localhost:5000"  # Uncomment for local testing

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Test Create Facility API" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login to get token (if authentication is required)
Write-Host "Step 1: Login to get authentication token..." -ForegroundColor Yellow

$loginBody = @{
    email = "admin@example.com"  # Change to your admin credentials
    password = "admin123"         # Change to your password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$serverUrl/api/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json"
    
    $token = $loginResponse.token
    Write-Host "✅ Login successful! Token obtained." -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "⚠️  Login failed or not required. Proceeding without token..." -ForegroundColor Yellow
    $token = $null
    Write-Host ""
}

# Step 2: Create Facility
Write-Host "Step 2: Creating new facility..." -ForegroundColor Yellow

$facilityData = @{
    name = "Test Facility XO5"
    code = "TEST-XO5-001"
    address = @{
        street = "123 Test Street"
        city = "Lagos"
        state = "Lagos State"
        zipCode = "100001"
        country = "Nigeria"
    }
    location = @{
        address = "123 Test Street"
        city = "Lagos"
        state = "Lagos State"
        zipCode = "100001"
        country = "Nigeria"
    }
    contactInfo = @{
        phone = "+234-123-456-7890"
        email = "facility@example.com"
        manager = "John Doe"
    }
    contactPerson = @{
        name = "John Doe"
        email = "john@example.com"
        phone = "+234-123-456-7890"
    }
    deviceApiUrl = "http://143.198.150.26:8081"
    deviceApiKey = "020e7096a03c670f63"
    timezone = "Africa/Lagos"
    status = "active"
    deviceInfo = @{
        deviceId = "XO5-DEVICE-001"
        deviceModel = "XO5 Biometric"
    }
    configuration = @{
        autoSync = $true
        syncInterval = 5
        maxRetries = 3
    }
} | ConvertTo-Json -Depth 5

Write-Host "Facility Data:" -ForegroundColor Cyan
Write-Host $facilityData -ForegroundColor Gray
Write-Host ""

try {
    # Create headers
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    # Add token if available
    if ($token) {
        $headers["Authorization"] = "Bearer $token"
    }
    
    # Make the request
    $response = Invoke-RestMethod -Uri "$serverUrl/api/facilities" `
        -Method POST `
        -Body $facilityData `
        -Headers $headers
    
    Write-Host "✅ Facility created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 5) -ForegroundColor Gray
    Write-Host ""
    
    if ($response.data) {
        Write-Host "Facility ID: $($response.data._id)" -ForegroundColor Green
        Write-Host "Facility Name: $($response.data.name)" -ForegroundColor Green
        Write-Host "Facility Code: $($response.data.code)" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Failed to create facility!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error Details:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Server Response:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
