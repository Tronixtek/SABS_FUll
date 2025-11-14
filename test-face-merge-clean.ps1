# Enhanced Face Merge Testing Script
# Tests the new face image processing and retry logic

$baseUrl = "http://localhost:8081/api"
$headers = @{
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

Write-Host "=== Enhanced Face Merge Testing ===" -ForegroundColor Green

# Create a simple test image in Base64 (small JPEG-like structure for testing)
$testImageBase64 = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/gA"

Write-Host "`n Testing Enhanced Face Merge with New Employee..." -ForegroundColor Yellow

$newEmployeeData = @{
    employeeId = "EP0025"
    fullName = "Test Enhanced User"
    email = "enhanced@test.com"
    department = "Engineering" 
    position = "Test Engineer"
    deviceKey = "020e7096a03c670f63"
    secret = "123456"
    verificationStyle = 3
    faceImage = "data:image/jpeg;base64," + $testImageBase64
    forceUpdate = $false
} | ConvertTo-Json

try {
    Write-Host "Sending registration request..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "$baseUrl/employee/register" -Method Post -Headers $headers -Body $newEmployeeData -TimeoutSec 30
    Write-Host "Response received:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Response:" -ForegroundColor Red
        Write-Host $errorBody -ForegroundColor Red
    } else {
        Write-Host "Network/Connection Error: $_" -ForegroundColor Red
    }
}

Write-Host "`n Testing Force Update with Same Employee..." -ForegroundColor Yellow

$updateEmployeeData = @{
    employeeId = "EP0025"
    fullName = "Test Enhanced User Updated"
    email = "enhanced.updated@test.com"
    department = "Engineering" 
    position = "Senior Test Engineer"
    deviceKey = "020e7096a03c670f63"
    secret = "123456"
    verificationStyle = 3
    faceImage = "data:image/jpeg;base64," + $testImageBase64
    forceUpdate = $true
} | ConvertTo-Json

try {
    Write-Host "Sending force update request..." -ForegroundColor Cyan
    $response2 = Invoke-RestMethod -Uri "$baseUrl/employee/register" -Method Post -Headers $headers -Body $updateEmployeeData -TimeoutSec 30
    Write-Host "Update Response received:" -ForegroundColor Green
    Write-Host ($response2 | ConvertTo-Json -Depth 10) -ForegroundColor White
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Update Error Response:" -ForegroundColor Red
        Write-Host $errorBody -ForegroundColor Red
    } else {
        Write-Host "Update Network Error: $_" -ForegroundColor Red
    }
}

Write-Host "`n Testing with Invalid Base64 Image..." -ForegroundColor Yellow

$invalidImageData = @{
    employeeId = "EP0026"
    fullName = "Test Invalid Image User"
    email = "invalid@test.com"
    department = "QA" 
    position = "QA Engineer"
    deviceKey = "020e7096a03c670f63"
    secret = "123456"
    verificationStyle = 3
    faceImage = "invalid-base64-data-here"
    forceUpdate = $false
} | ConvertTo-Json

try {
    Write-Host "Sending invalid image request..." -ForegroundColor Cyan
    $response3 = Invoke-RestMethod -Uri "$baseUrl/employee/register" -Method Post -Headers $headers -Body $invalidImageData -TimeoutSec 30
    Write-Host "Unexpected success with invalid image:" -ForegroundColor Yellow
    Write-Host ($response3 | ConvertTo-Json -Depth 10) -ForegroundColor White
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Expected error for invalid image:" -ForegroundColor Green
        Write-Host $errorBody -ForegroundColor Red
    } else {
        Write-Host "Network Error: $_" -ForegroundColor Red
    }
}

Write-Host "`n=== Face Merge Enhancement Summary ===" -ForegroundColor Green
Write-Host "Image processing validation" -ForegroundColor Green
Write-Host "XO5 device compatibility checks" -ForegroundColor Green  
Write-Host "Retry logic for better success rates" -ForegroundColor Green
Write-Host "Enhanced error diagnosis" -ForegroundColor Green
Write-Host "Face already exists handling" -ForegroundColor Green
Write-Host "Base64 format cleaning and validation" -ForegroundColor Green