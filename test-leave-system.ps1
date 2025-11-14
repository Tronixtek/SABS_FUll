# Test Leave/Excuse Request - PowerShell Script

# Configuration
$baseUrl = "http://localhost:5000/api"

Write-Host "🧪 Testing Leave/Excuse Management System" -ForegroundColor Cyan

# Test 1: Submit a late arrival excuse
Write-Host "`n1️⃣ Submitting late arrival excuse..." -ForegroundColor Yellow

$lateArrivalRequest = @{
    employeeId = "EMP001122"
    type = "late-arrival"
    affectedDate = (Get-Date).ToString("yyyy-MM-dd")
    startTime = (Get-Date -Hour 9 -Minute 0).ToString("yyyy-MM-ddTHH:mm:ss")
    endTime = (Get-Date -Hour 10 -Minute 30).ToString("yyyy-MM-ddTHH:mm:ss")
    reason = "Heavy traffic due to road construction on main highway"
    category = "traffic-delay"
    urgency = "medium"
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/leave/submit" -Method POST -Body $lateArrivalRequest -ContentType "application/json"
    Write-Host "✅ Late arrival excuse submitted successfully" -ForegroundColor Green
    Write-Host "Status: $($response.data.leaveRequest.status)" -ForegroundColor Cyan
    $leaveRequestId = $response.data.leaveRequest._id
} catch {
    Write-Host "❌ Error submitting late arrival excuse: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Submit an emergency exit
Write-Host "`n2️⃣ Submitting emergency exit..." -ForegroundColor Yellow

$emergencyExit = @{
    employeeId = "EMP001122"
    reason = "Family emergency - need to rush to hospital"
    category = "family-emergency"
    exitTime = (Get-Date -Hour 14 -Minute 30).ToString("yyyy-MM-ddTHH:mm:ss")
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/leave/emergency-exit" -Method POST -Body $emergencyExit -ContentType "application/json"
    Write-Host "✅ Emergency exit recorded successfully" -ForegroundColor Green
    Write-Host "Status: $($response.data.leaveRequest.status)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error recording emergency exit: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Submit an early departure request
Write-Host "`n3️⃣ Submitting early departure request..." -ForegroundColor Yellow

$tomorrowDate = (Get-Date).AddDays(1)
$earlyDeparture = @{
    employeeId = "EMP001122"
    type = "early-departure"
    affectedDate = $tomorrowDate.ToString("yyyy-MM-dd")
    startTime = $tomorrowDate.Date.AddHours(15).ToString("yyyy-MM-ddTHH:mm:ss")
    endTime = $tomorrowDate.Date.AddHours(17).ToString("yyyy-MM-ddTHH:mm:ss")
    reason = "Medical appointment with cardiologist"
    category = "medical"
    urgency = "high"
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/leave/submit" -Method POST -Body $earlyDeparture -ContentType "application/json"
    Write-Host "✅ Early departure request submitted successfully" -ForegroundColor Green
    Write-Host "Status: $($response.data.leaveRequest.status)" -ForegroundColor Cyan
    $earlyDepartureId = $response.data.leaveRequest._id
} catch {
    Write-Host "❌ Error submitting early departure request: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Get pending requests
Write-Host "`n4️⃣ Fetching pending requests..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/leave/pending" -Method GET
    Write-Host "✅ Found $($response.data.count) pending requests" -ForegroundColor Green
    
    foreach ($request in $response.data.pendingRequests) {
        Write-Host "  📋 $($request.type) - $($request.reason) ($($request.urgency) urgency)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Error fetching pending requests: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Approve the early departure request
if ($earlyDepartureId) {
    Write-Host "`n5️⃣ Approving early departure request..." -ForegroundColor Yellow
    
    $approval = @{
        action = "approve"
        managerNotes = "Approved - medical appointment is essential"
        approvedBy = "manager123"
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/leave/process/$earlyDepartureId" -Method PATCH -Body $approval -ContentType "application/json"
        Write-Host "✅ Early departure request approved successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error approving request: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 6: Check attendance excuse for today
Write-Host "`n6️⃣ Checking attendance excuse for late arrival..." -ForegroundColor Yellow

try {
    $todayDate = (Get-Date).ToString("yyyy-MM-dd")
    $response = Invoke-RestMethod -Uri "$baseUrl/leave/check-excuse?employeeId=EMP001122&date=$todayDate&timeType=late-arrival" -Method GET
    
    if ($response.data.hasValidExcuse) {
        Write-Host "✅ Valid excuse found for late arrival" -ForegroundColor Green
        Write-Host "  📝 Excuse: $($response.data.excuse.reason)" -ForegroundColor White
        Write-Host "  🕐 Impact: $($response.data.impact) hours adjusted" -ForegroundColor White
    } else {
        Write-Host "⚠️ No valid excuse found for late arrival" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error checking attendance excuse: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Get leave statistics
Write-Host "`n7️⃣ Fetching leave statistics..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/leave/statistics" -Method GET
    Write-Host "✅ Leave Statistics:" -ForegroundColor Green
    Write-Host "  📊 Total Requests: $($response.data.overall.totalRequests)" -ForegroundColor White
    Write-Host "  ✅ Approved: $($response.data.overall.approvedRequests)" -ForegroundColor White
    Write-Host "  ⏳ Pending: $($response.data.overall.pendingRequests)" -ForegroundColor White
    Write-Host "  ❌ Rejected: $($response.data.overall.rejectedRequests)" -ForegroundColor White
    Write-Host "  🚨 Emergency Exits: $($response.data.overall.emergencyExits)" -ForegroundColor White
    Write-Host "  🕐 Total Excused Hours: $($response.data.overall.totalExcusedHours)" -ForegroundColor White
} catch {
    Write-Host "❌ Error fetching statistics: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Leave/Excuse Management System Testing Complete!" -ForegroundColor Green