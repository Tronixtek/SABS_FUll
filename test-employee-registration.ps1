$testUrl = "http://localhost:8081/api/employee/register"

$testData = @{
    employeeId = "EmP0023"
    fullName = "John Doe"
    faceImage = "/9j/4AAQSkZJRgABAQAAAQABAAD/"
    deviceKey = "020e7096a03c670f63"
    secret = "123456"
} | ConvertTo-Json

Write-Host "=== Testing Employee Registration API ==="
Write-Host "URL: $testUrl"
Write-Host "Test Data: $testData"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $testUrl -Method POST -Body $testData -ContentType "application/json" -ErrorAction Stop
    Write-Host "✅ SUCCESS - Response:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ ERROR - Response:"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
    Write-Host "Message: $($_.Exception.Message)"
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)"
    }
}

Write-Host ""
Write-Host "=== Test Complete ==="