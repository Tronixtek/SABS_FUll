#!/usr/bin/env powershell

# Two-Way Communication Health Check Script
Write-Host "🔍 Two-Way Communication System Health Check" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Function to check service health
function Test-ServiceHealth {
    param(
        [string]$ServiceName,
        [string]$Url,
        [string]$ExpectedContent = ""
    )
    
    try {
        Write-Host "🌐 Checking $ServiceName..." -NoNewline
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 10
        
        if ($response.StatusCode -eq 200) {
            Write-Host " ✅ HEALTHY" -ForegroundColor Green
            
            if ($ExpectedContent -ne "") {
                $content = $response.Content | ConvertFrom-Json
                Write-Host "    📊 Response: $($content.status)" -ForegroundColor Gray
            }
            
            return $true
        } else {
            Write-Host " ❌ UNHEALTHY (Status: $($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host " ❌ UNAVAILABLE" -ForegroundColor Red
        Write-Host "    🔧 Error: $($_.Exception.Message)" -ForegroundColor Gray
        return $false
    }
}

# Function to test two-way communication
function Test-TwoWayCommunication {
    Write-Host ""
    Write-Host "🔄 Testing Two-Way Communication Flow..." -ForegroundColor Yellow
    
    try {
        # Test Java to Node.js communication
        Write-Host "   📤 Testing Java → Node.js notification..." -NoNewline
        
        $testPayload = @{
            employeeData = @{
                employeeId = "HEALTH_CHECK_001"
                fullName = "Health Check User"
                faceImageUploaded = $true
            }
            deviceSyncResult = "Health check successful"
            timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
            source = "HEALTH_CHECK"
        } | ConvertTo-Json -Depth 3
        
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/employees/device-sync-success" `
                                    -Method POST `
                                    -Body $testPayload `
                                    -ContentType "application/json" `
                                    -TimeoutSec 10
        
        if ($response.StatusCode -eq 200) {
            Write-Host " ✅ SUCCESS" -ForegroundColor Green
            return $true
        } else {
            Write-Host " ❌ FAILED" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host " ❌ ERROR" -ForegroundColor Red
        Write-Host "    🔧 Details: $($_.Exception.Message)" -ForegroundColor Gray
        return $false
    }
}

# Main health check
Write-Host "1️⃣ Service Health Checks" -ForegroundColor Cyan
Write-Host "-------------------------" -ForegroundColor Cyan

$javaHealthy = Test-ServiceHealth "Java XO5 Service" "http://localhost:8081/api/device/health"
$nodeHealthy = Test-ServiceHealth "Node.js Backend" "http://localhost:3001/api/health" "status"
$reactHealthy = Test-ServiceHealth "React Frontend" "http://localhost:3000"

Write-Host ""
Write-Host "2️⃣ Integration Tests" -ForegroundColor Cyan
Write-Host "--------------------" -ForegroundColor Cyan

$communicationHealthy = $false
if ($javaHealthy -and $nodeHealthy) {
    $communicationHealthy = Test-TwoWayCommunication
} else {
    Write-Host "⏭️  Skipping communication test - prerequisite services not available" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "3️⃣ System Status Summary" -ForegroundColor Cyan
Write-Host "-------------------------" -ForegroundColor Cyan

Write-Host "Java XO5 Service:      " -NoNewline
if ($javaHealthy) { 
    Write-Host "✅ READY" -ForegroundColor Green 
} else { 
    Write-Host "❌ NOT READY" -ForegroundColor Red 
}

Write-Host "Node.js Backend:       " -NoNewline
if ($nodeHealthy) { 
    Write-Host "✅ READY" -ForegroundColor Green 
} else { 
    Write-Host "❌ NOT READY" -ForegroundColor Red 
}

Write-Host "React Frontend:        " -NoNewline
if ($reactHealthy) { 
    Write-Host "✅ READY" -ForegroundColor Green 
} else { 
    Write-Host "❌ NOT READY" -ForegroundColor Red 
}

Write-Host "Two-Way Communication: " -NoNewline
if ($communicationHealthy) { 
    Write-Host "✅ WORKING" -ForegroundColor Green 
} else { 
    Write-Host "❌ NOT WORKING" -ForegroundColor Red 
}

Write-Host ""
Write-Host "4️⃣ Next Steps" -ForegroundColor Cyan
Write-Host "-------------" -ForegroundColor Cyan

if ($javaHealthy -and $nodeHealthy -and $reactHealthy -and $communicationHealthy) {
    Write-Host "🎉 All systems operational! Ready for frontend testing." -ForegroundColor Green
    Write-Host ""
    Write-Host "Test URLs:" -ForegroundColor White
    Write-Host "  • Employee Management: http://localhost:3000/employees" -ForegroundColor Gray
    Write-Host "  • Java API Health:     http://localhost:8081/api/device/health" -ForegroundColor Gray
    Write-Host "  • Node.js API Health:  http://localhost:3001/api/health" -ForegroundColor Gray
} else {
    Write-Host "⚠️  System not fully operational. Please check the following:" -ForegroundColor Yellow
    Write-Host ""
    
    if (-not $javaHealthy) {
        Write-Host "❌ Start Java service: mvn spring-boot:run" -ForegroundColor Red
    }
    
    if (-not $nodeHealthy) {
        Write-Host "❌ Start Node.js backend: npm start" -ForegroundColor Red
    }
    
    if (-not $reactHealthy) {
        Write-Host "❌ Start React frontend: npm start" -ForegroundColor Red
    }
    
    if (-not $communicationHealthy) {
        Write-Host "❌ Check integration configuration and network connectivity" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")