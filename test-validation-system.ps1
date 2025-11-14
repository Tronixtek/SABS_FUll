# Employee Registration Validation Test Script
# This script tests the new validation system for duplicate employee handling

$baseUrl = "http://localhost:8081/api"
$headers = @{
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

Write-Host "=== Employee Registration Validation Test ===" -ForegroundColor Green

# Test 1: Try to register an existing employee (should be rejected)
Write-Host "`n1. Testing existing employee registration (should be rejected)..." -ForegroundColor Yellow

$existingEmployeeData = @{
    employeeId = "EP0023"
    employeeName = "John Doe"
    department = "Engineering" 
    position = "Software Engineer"
    forceUpdate = $false
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/employee/register" -Method Post -Headers $headers -Body $existingEmployeeData
    Write-Host "Response: $($response1 | ConvertTo-Json -Depth 10)" -ForegroundColor Cyan
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Validation Error (Expected): $errorBody" -ForegroundColor Red
    } else {
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

# Test 2: Register existing employee with forceUpdate=true (should succeed)
Write-Host "`n2. Testing existing employee registration with force update (should succeed)..." -ForegroundColor Yellow

$forceUpdateData = @{
    employeeId = "EP0023"
    employeeName = "John Doe Updated"
    department = "Engineering"
    position = "Senior Software Engineer"
    forceUpdate = $true
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/employee/register" -Method Post -Headers $headers -Body $forceUpdateData
    Write-Host "Response: $($response2 | ConvertTo-Json -Depth 10)" -ForegroundColor Green
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error: $errorBody" -ForegroundColor Red
    } else {
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

# Test 3: Register a new employee (should succeed)
Write-Host "`n3. Testing new employee registration (should succeed)..." -ForegroundColor Yellow

$newEmployeeData = @{
    employeeId = "EP0024"
    employeeName = "Jane Smith"
    department = "Marketing"
    position = "Marketing Manager"
    forceUpdate = $false
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri "$baseUrl/employee/register" -Method Post -Headers $headers -Body $newEmployeeData
    Write-Host "Response: $($response3 | ConvertTo-Json -Depth 10)" -ForegroundColor Green
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error: $errorBody" -ForegroundColor Red
    } else {
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

Write-Host "`n=== Test Summary ===" -ForegroundColor Green
Write-Host "1. Existing employee without forceUpdate: Should be rejected with validation error"
Write-Host "2. Existing employee with forceUpdate=true: Should succeed (update scenario)"
Write-Host "3. New employee: Should succeed (create scenario)"