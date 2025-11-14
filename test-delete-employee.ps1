#!/usr/bin/env pwsh

Write-Host "=== TESTING DELETE EMPLOYEE ENDPOINT ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:8081/api/employee"
$deviceKey = "020e7096a03c670f63"
$secret = "123456"
$employeeId = "EP0023"  # Employee that should exist from previous tests

# Test DELETE Employee
Write-Host "Testing DELETE Employee..." -ForegroundColor Yellow
$deleteBody = @{
    employeeId = $employeeId
    deviceKey = $deviceKey
    secret = $secret
} | ConvertTo-Json

$headers = @{
    'Content-Type' = 'application/json'
}

try {
    Write-Host "Request URL: $baseUrl/delete" -ForegroundColor Gray
    Write-Host "Request Body: $deleteBody" -ForegroundColor Gray
    Write-Host ""
    
    $deleteResponse = Invoke-RestMethod -Uri "$baseUrl/delete" -Method POST -Body $deleteBody -Headers $headers
    
    Write-Host "✅ DELETE Response:" -ForegroundColor Green
    $deleteResponse | ConvertTo-Json -Depth 10 | Write-Host
    
    if ($deleteResponse.success -eq $true) {
        Write-Host ""
        Write-Host "🎉 DELETE operation successful!" -ForegroundColor Green
        
        # Test that employee is actually deleted by trying to list
        Write-Host ""
        Write-Host "Verifying deletion by listing employees..." -ForegroundColor Yellow
        
        $listBody = @{
            deviceKey = $deviceKey
            secret = $secret
        } | ConvertTo-Json
        
        $listResponse = Invoke-RestMethod -Uri "$baseUrl/list" -Method POST -Body $listBody -Headers $headers
        Write-Host "Employee list after deletion:" -ForegroundColor Gray
        $listResponse | ConvertTo-Json -Depth 10 | Write-Host
        
    } else {
        Write-Host ""
        Write-Host "❌ DELETE operation failed" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error during DELETE test:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== DELETE TEST COMPLETED ===" -ForegroundColor Cyan