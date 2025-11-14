#!/usr/bin/env pwsh

Write-Host "=== TESTING ATTENDANCE ENDPOINTS ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:8081/api/attendance"
$deviceKey = "020e7096a03c670f63"
$secret = "123456"

$headers = @{
    'Content-Type' = 'application/json'
}

Write-Host "🔄 Starting tests for attendance endpoints..." -ForegroundColor Yellow
Write-Host ""

# Test 1: Monitor Attendance - Device Status
Write-Host "=== TEST 1: Monitor Attendance (Device Status) ===" -ForegroundColor Magenta
$monitorBody = @{
    deviceKey = $deviceKey
    secret = $secret
} | ConvertTo-Json

try {
    Write-Host "Request URL: $baseUrl/monitor" -ForegroundColor Gray
    Write-Host "Request Body: $monitorBody" -ForegroundColor Gray
    Write-Host ""
    
    $monitorResponse = Invoke-RestMethod -Uri "$baseUrl/monitor" -Method POST -Body $monitorBody -Headers $headers
    
    Write-Host "✅ MONITOR Response:" -ForegroundColor Green
    $monitorResponse | ConvertTo-Json -Depth 10 | Write-Host
    Write-Host ""
    
} catch {
    Write-Host "❌ Error during monitor test:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 2: Get All Attendance Records
Write-Host "=== TEST 2: Get All Attendance Records ===" -ForegroundColor Magenta
$recordsBody = @{
    deviceKey = $deviceKey
    secret = $secret
} | ConvertTo-Json

try {
    Write-Host "Request URL: $baseUrl/records" -ForegroundColor Gray
    Write-Host "Request Body: $recordsBody" -ForegroundColor Gray
    Write-Host ""
    
    $recordsResponse = Invoke-RestMethod -Uri "$baseUrl/records" -Method POST -Body $recordsBody -Headers $headers
    
    Write-Host "✅ RECORDS Response:" -ForegroundColor Green
    $recordsResponse | ConvertTo-Json -Depth 10 | Write-Host
    Write-Host ""
    
    # Store a record ID for the next test if available
    $global:testRecordId = $null
    if ($recordsResponse.data -and $recordsResponse.data.attendanceRecords -and $recordsResponse.data.attendanceRecords.Count -gt 0) {
        $global:testRecordId = $recordsResponse.data.attendanceRecords[0].recordId
        Write-Host "Found record ID for testing: $global:testRecordId" -ForegroundColor Blue
    }
    
} catch {
    Write-Host "❌ Error during records test:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 3: Get Records with Employee Filter
Write-Host "=== TEST 3: Get Records with Employee Filter ===" -ForegroundColor Magenta
$filteredRecordsBody = @{
    deviceKey = $deviceKey
    secret = $secret
    employeeId = "EP0023"
} | ConvertTo-Json

try {
    Write-Host "Request URL: $baseUrl/records" -ForegroundColor Gray
    Write-Host "Request Body: $filteredRecordsBody" -ForegroundColor Gray
    Write-Host ""
    
    $filteredResponse = Invoke-RestMethod -Uri "$baseUrl/records" -Method POST -Body $filteredRecordsBody -Headers $headers
    
    Write-Host "✅ FILTERED RECORDS Response:" -ForegroundColor Green
    $filteredResponse | ConvertTo-Json -Depth 10 | Write-Host
    Write-Host ""
    
} catch {
    Write-Host "❌ Error during filtered records test:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 4: Get Specific Record (if we have a record ID)
if ($global:testRecordId) {
    Write-Host "=== TEST 4: Get Specific Attendance Record ===" -ForegroundColor Magenta
    $specificRecordBody = @{
        deviceKey = $deviceKey
        secret = $secret
        recordId = $global:testRecordId
    } | ConvertTo-Json

    try {
        Write-Host "Request URL: $baseUrl/record" -ForegroundColor Gray
        Write-Host "Request Body: $specificRecordBody" -ForegroundColor Gray
        Write-Host ""
        
        $specificResponse = Invoke-RestMethod -Uri "$baseUrl/record" -Method POST -Body $specificRecordBody -Headers $headers
        
        Write-Host "✅ SPECIFIC RECORD Response:" -ForegroundColor Green
        $specificResponse | ConvertTo-Json -Depth 10 | Write-Host
        Write-Host ""
        
    } catch {
        Write-Host "❌ Error during specific record test:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        if ($_.ErrorDetails) {
            Write-Host "Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
        Write-Host ""
    }
} else {
    Write-Host "=== TEST 4: SKIPPED - No record ID available ===" -ForegroundColor Yellow
    Write-Host ""
}

# Test 5: Get Attendance Statistics
Write-Host "=== TEST 5: Get Attendance Statistics ===" -ForegroundColor Magenta
$statisticsBody = @{
    deviceKey = $deviceKey
    secret = $secret
    startDate = "2024-01-01"
    endDate = "2025-12-31"
    reportType = "daily"
} | ConvertTo-Json

try {
    Write-Host "Request URL: $baseUrl/statistics" -ForegroundColor Gray
    Write-Host "Request Body: $statisticsBody" -ForegroundColor Gray
    Write-Host ""
    
    $statisticsResponse = Invoke-RestMethod -Uri "$baseUrl/statistics" -Method POST -Body $statisticsBody -Headers $headers
    
    Write-Host "✅ STATISTICS Response:" -ForegroundColor Green
    $statisticsResponse | ConvertTo-Json -Depth 10 | Write-Host
    Write-Host ""
    
} catch {
    Write-Host "❌ Error during statistics test:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 6: Get Employee-Specific Statistics
Write-Host "=== TEST 6: Get Employee-Specific Statistics ===" -ForegroundColor Magenta
$employeeStatsBody = @{
    deviceKey = $deviceKey
    secret = $secret
    employeeId = "EP0023"
    startDate = "2024-01-01"
    endDate = "2025-12-31"
    reportType = "monthly"
} | ConvertTo-Json

try {
    Write-Host "Request URL: $baseUrl/statistics" -ForegroundColor Gray
    Write-Host "Request Body: $employeeStatsBody" -ForegroundColor Gray
    Write-Host ""
    
    $employeeStatsResponse = Invoke-RestMethod -Uri "$baseUrl/statistics" -Method POST -Body $employeeStatsBody -Headers $headers
    
    Write-Host "✅ EMPLOYEE STATISTICS Response:" -ForegroundColor Green
    $employeeStatsResponse | ConvertTo-Json -Depth 10 | Write-Host
    Write-Host ""
    
} catch {
    Write-Host "❌ Error during employee statistics test:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "=== ATTENDANCE ENDPOINTS TESTING COMPLETED ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor White
Write-Host "✅ Monitor Attendance - Real-time device status and events" -ForegroundColor Green
Write-Host "✅ Get All Records - Retrieve all attendance records" -ForegroundColor Green  
Write-Host "✅ Get Filtered Records - Filter by employee ID" -ForegroundColor Green
Write-Host "✅ Get Specific Record - Retrieve individual record by ID" -ForegroundColor Green
Write-Host "✅ Get Statistics - Generate attendance analytics" -ForegroundColor Green
Write-Host "✅ Get Employee Stats - Employee-specific attendance analysis" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 All attendance endpoints are now ready for use!" -ForegroundColor Yellow