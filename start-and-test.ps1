# Employee CRUD API Testing Script
# Starts the Spring Boot server and provides testing instructions

Write-Host "🚀 Employee CRUD API Testing Setup" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Check if server is already running
Write-Host "📡 Checking if server is running on port 8081..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8081/api/employee/list?deviceKey=020e7096a03c670f63&secret=123456" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Server is already running and responding!" -ForegroundColor Green
    Write-Host "Response Status: $($response.StatusCode)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Server not running. Starting server..." -ForegroundColor Red
    
    # Navigate to the correct directory
    $projectDir = "C:\Users\PC\Desktop\attendance tracking system - Copy\java-attendance-service"
    Set-Location $projectDir
    
    Write-Host "📂 Changed to directory: $projectDir" -ForegroundColor Yellow
    
    # Start the Spring Boot application
    Write-Host "🔧 Starting Spring Boot application..." -ForegroundColor Yellow
    Write-Host "This may take a few moments..." -ForegroundColor Gray
    
    Start-Process -FilePath "mvn" -ArgumentList "spring-boot:run" -WindowStyle Normal
    
    Write-Host "⏳ Waiting for server to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Test if server is now running
    try {
        $testResponse = Invoke-WebRequest -Uri "http://localhost:8081/api/employee/list?deviceKey=020e7096a03c670f63&secret=123456" -Method GET -TimeoutSec 10 -ErrorAction Stop
        Write-Host "✅ Server started successfully!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Server may still be starting up. Please wait a moment and try the Postman requests." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "📋 POSTMAN COLLECTION INSTRUCTIONS" -ForegroundColor Magenta
Write-Host "===================================" -ForegroundColor Magenta
Write-Host "1. Import the collection file: Employee-CRUD-API.postman_collection.json" -ForegroundColor White
Write-Host "2. The collection includes the following test categories:" -ForegroundColor White
Write-Host "   📝 Employee Registration (New + Force Update)" -ForegroundColor Cyan
Write-Host "   🔍 CRUD Operations (GET All, GET by ID, PUT Update, DELETE)" -ForegroundColor Cyan
Write-Host "   👥 Multiple Employee Tests" -ForegroundColor Cyan
Write-Host "   ⚠️  Error Handling Tests" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Variables are pre-configured:" -ForegroundColor White
Write-Host "   • base_url: http://localhost:8081" -ForegroundColor Gray
Write-Host "   • device_key: 020e7096a03c670f63" -ForegroundColor Gray
Write-Host "   • device_secret: 123456" -ForegroundColor Gray
Write-Host ""
Write-Host "🧪 RECOMMENDED TEST SEQUENCE:" -ForegroundColor Green
Write-Host "1. Register New Employee (EMP001)" -ForegroundColor White
Write-Host "2. Get All Employees (should show EMP001)" -ForegroundColor White
Write-Host "3. Get Employee by ID (EMP001)" -ForegroundColor White
Write-Host "4. Try Register Duplicate (should fail)" -ForegroundColor White
Write-Host "5. Register with Force Update (should succeed)" -ForegroundColor White
Write-Host "6. Update Employee (PUT request)" -ForegroundColor White
Write-Host "7. Register more employees (EMP002, EMP003)" -ForegroundColor White
Write-Host "8. Get All Employees (should show all)" -ForegroundColor White
Write-Host "9. Delete Employee (EMP001)" -ForegroundColor White
Write-Host "10. Get All Employees (should show remaining)" -ForegroundColor White
Write-Host ""
Write-Host "🎯 API ENDPOINTS AVAILABLE:" -ForegroundColor Blue
Write-Host "POST   /api/employee/register        - Register new employee" -ForegroundColor White
Write-Host "GET    /api/employee/list           - Get all employees" -ForegroundColor White
Write-Host "GET    /api/employee/{id}           - Get employee by ID" -ForegroundColor White
Write-Host "PUT    /api/employee/{id}           - Update employee" -ForegroundColor White
Write-Host "DELETE /api/employee/{id}           - Delete employee" -ForegroundColor White
Write-Host ""
Write-Host "🔧 XO5 DEVICE INFO:" -ForegroundColor Magenta
Write-Host "Device IP: 192.168.0.189" -ForegroundColor Gray
Write-Host "Gateway IP: 192.168.0.169:10011" -ForegroundColor Gray
Write-Host "Device Key: 020e7096a03c670f63" -ForegroundColor Gray
Write-Host "Device Secret: 123456" -ForegroundColor Gray
Write-Host ""
Write-Host "Ready for testing! 🎉" -ForegroundColor Green