$testUrl = "http://localhost:8081/api/employee/register"

# Test data with your exact payload structure
$testData = @{
    employeeId = "EMP0023"
    fullName = "John Doe"
    faceImage = "/9j/4AAQSkZJRgABAQAAAQABAAD//gA7Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2ODApLCBxdWFsaXR5ID0gOTAK/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgAYABgAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMEAQMDAgQEBQYECAMAAQIDEQQSITEFQVFhBhMicYEUMpGhFSNCscEkM0LSYhfhJ3LxFxg="
    deviceKey = "020e7096a03c670f63"
    secret = "123456"
} | ConvertTo-Json

Write-Host "=== Testing Employee Registration API with Face Enrollment ==="
Write-Host "URL: $testUrl"
Write-Host "Employee ID: EMP0023"
Write-Host "Full Name: John Doe"
Write-Host "Has Face Image: Yes"
Write-Host "Device Key: 020e7096a03c670f63"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $testUrl -Method POST -Body $testData -ContentType "application/json" -ErrorAction Stop
    Write-Host "✅ SUCCESS - Response:"
    $response | ConvertTo-Json -Depth 10
    
    if ($response.success -eq $true) {
        Write-Host ""
        Write-Host "🎉 Employee registration successful!"
        Write-Host "Status: $($response.data.status)"
        if ($response.data.enrollmentStatus) {
            Write-Host "Enrollment: $($response.data.enrollmentStatus)"
        }
    }
    
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