# Test Device API Response

## Quick Test Command

Run this in PowerShell to see what your device is returning:

```powershell
$body = @{
    from = (Get-Date).AddHours(-24).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    to = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://335461d15241.ngrok-free.app/api/device/attendance" -Method Post -Body $body -ContentType "application/json"

Write-Host "Response Type: " -NoNewline
Write-Host ($response.GetType().Name) -ForegroundColor Cyan

Write-Host "`nFull Response:" -ForegroundColor Yellow
$response | ConvertTo-Json -Depth 10

Write-Host "`nResponse Keys:" -ForegroundColor Yellow
if ($response -is [PSCustomObject]) {
    $response.PSObject.Properties.Name
} elseif ($response -is [Array]) {
    Write-Host "Direct Array with $($response.Count) items" -ForegroundColor Green
}
```

## What We're Looking For

Your device should return one of these formats:

### Format 1: Direct Array
```json
[
  {
    "userId": "12345",
    "timestamp": "2025-10-16T09:00:00Z",
    "type": "in"
  }
]
```

### Format 2: Nested in 'data'
```json
{
  "success": true,
  "data": [
    {
      "userId": "12345",
      "timestamp": "2025-10-16T09:00:00Z",
      "type": "in"
    }
  ]
}
```

### Format 3: Nested in 'records'
```json
{
  "records": [
    {
      "userId": "12345",
      "timestamp": "2025-10-16T09:00:00Z",
      "type": "in"
    }
  ]
}
```

### Format 4: Other nested property
```json
{
  "attendance": [...],
  // or
  "result": [...],
  // or
  "items": [...]
}
```

## Next Steps

1. Run the PowerShell test command above
2. Copy the output showing "Response Keys" or "Full Response"
3. Share it so we can add support for your device's format
4. The system will be updated to recognize it automatically

## Alternative: Use curl

```bash
curl -X POST https://335461d15241.ngrok-free.app/api/device/attendance \
  -H "Content-Type: application/json" \
  -d '{
    "from": "2025-10-15T00:00:00Z",
    "to": "2025-10-16T23:59:59Z"
  }'
```
