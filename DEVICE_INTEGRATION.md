# Device API Integration Guide

This guide explains how to integrate your biometric device servers with the attendance tracking system.

## Device Server Requirements

Your device servers should expose a REST API endpoint that returns attendance data in a specific format.

## Expected API Response Format

### Endpoint
Your device server should provide an endpoint that returns attendance records:

```
GET http://your-device-server.com/api/attendance?from=<timestamp>&to=<timestamp>
```

### Request Parameters
- `from` (required): Start timestamp (ISO 8601 format)
- `to` (required): End timestamp (ISO 8601 format)

### Response Format
The endpoint should return a JSON array of attendance records:

```json
[
  {
    "employeeId": "EMP001",
    "deviceId": "DEVICE001",
    "timestamp": "2025-10-16T09:05:00Z",
    "type": "in",
    "method": "fingerprint",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  },
  {
    "employeeId": "EMP001",
    "deviceId": "DEVICE001",
    "timestamp": "2025-10-16T17:02:00Z",
    "type": "out",
    "method": "fingerprint",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  }
]
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employeeId` | String | Optional | Employee ID from your system |
| `deviceId` | String | Required | Unique device/biometric ID |
| `timestamp` | String | Required | ISO 8601 timestamp |
| `type` | String | Optional | "in" for check-in, "out" for check-out |
| `method` | String | Optional | "fingerprint", "face", "card", or "manual" |
| `location` | Object | Optional | GPS coordinates |
| `location.latitude` | Number | Optional | Latitude |
| `location.longitude` | Number | Optional | Longitude |

## Authentication

If your device server requires authentication, you can configure it in the facility settings:

```json
{
  "deviceApiUrl": "http://device-server.com/api/attendance",
  "deviceApiKey": "your-api-key-here"
}
```

The system will send the API key as a Bearer token:
```
Authorization: Bearer your-api-key-here
```

## Integration Steps

### 1. Configure Facility

In the Attendance Tracking System:

1. Go to **Facilities** page
2. Click **Add Facility** or edit existing facility
3. Fill in the details:
   ```
   Device API URL: http://your-device-server.com/api/attendance
   Device API Key: [your-api-key] (if required)
   ```

### 2. Map Employees to Device IDs

Each employee must have a `deviceId` that matches the ID from your biometric device:

1. Go to **Employees** page
2. For each employee, set the **Device ID** field
3. This should match the `deviceId` returned by your device server

### 3. Test the Integration

1. Go to **Facilities** page
2. Click **Sync Now** on your facility
3. Check if data syncs successfully
4. View synced attendance in the **Attendance** page

## Data Flow

```
┌─────────────────┐
│ Biometric       │
│ Devices         │
│ (6 Facilities)  │
└────────┬────────┘
         │
         │ Store punch data
         ▼
┌─────────────────┐
│ Device Server   │◄─── Your existing server
│ APIs            │     (one per facility)
└────────┬────────┘
         │
         │ HTTP GET request every 5 min
         ▼
┌─────────────────┐
│ Attendance      │
│ Tracking System │◄─── This system
│ (Central Server)│
└────────┬────────┘
         │
         │ Process & Display
         ▼
┌─────────────────┐
│ Frontend        │
│ Dashboard       │◄─── Admin interface
└─────────────────┘
```

## Sample Device Server Implementation

### Node.js/Express Example

```javascript
const express = require('express');
const app = express();

// Your database or storage system
const attendanceDB = require('./database');

app.get('/api/attendance', async (req, res) => {
  try {
    const { from, to } = req.query;
    
    // Validate parameters
    if (!from || !to) {
      return res.status(400).json({ 
        error: 'from and to parameters are required' 
      });
    }
    
    // Fetch attendance records from your database
    const records = await attendanceDB.getRecordsBetween(
      new Date(from), 
      new Date(to)
    );
    
    // Format records according to expected format
    const formattedRecords = records.map(record => ({
      employeeId: record.emp_id,
      deviceId: record.device_id,
      timestamp: record.punch_time.toISOString(),
      type: record.punch_type, // 'in' or 'out'
      method: record.auth_method, // 'fingerprint', 'face', etc.
      location: {
        latitude: record.lat,
        longitude: record.lng
      }
    }));
    
    res.json(formattedRecords);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3001, () => {
  console.log('Device API server running on port 3001');
});
```

### Python/Flask Example

```python
from flask import Flask, request, jsonify
from datetime import datetime
import database  # Your database module

app = Flask(__name__)

@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    try:
        from_date = request.args.get('from')
        to_date = request.args.get('to')
        
        if not from_date or not to_date:
            return jsonify({'error': 'from and to parameters are required'}), 400
        
        # Convert ISO strings to datetime
        start = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
        
        # Fetch records from your database
        records = database.get_attendance_between(start, end)
        
        # Format records
        formatted_records = [
            {
                'employeeId': record['emp_id'],
                'deviceId': record['device_id'],
                'timestamp': record['punch_time'].isoformat() + 'Z',
                'type': record['punch_type'],
                'method': record['auth_method'],
                'location': {
                    'latitude': record.get('lat'),
                    'longitude': record.get('lng')
                }
            }
            for record in records
        ]
        
        return jsonify(formatted_records)
    
    except Exception as e:
        print(f'Error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(port=3001)
```

## Testing Your Device API

### Using PowerShell

```powershell
$from = (Get-Date).AddDays(-1).ToString("yyyy-MM-ddTHH:mm:ssZ")
$to = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
$url = "http://your-device-server.com/api/attendance?from=$from&to=$to"

Invoke-RestMethod -Uri $url -Method Get | ConvertTo-Json -Depth 10
```

### Using curl

```bash
curl "http://your-device-server.com/api/attendance?from=2025-10-15T00:00:00Z&to=2025-10-16T23:59:59Z"
```

## Troubleshooting

### Sync Failures

1. **Check API URL**: Ensure the URL is correct and accessible
2. **Check Response Format**: Verify your API returns data in the expected format
3. **Check Authentication**: If using API key, verify it's correct
4. **Check Network**: Ensure the central server can reach device servers
5. **Check Logs**: Review error messages in facility sync status

### Employee Not Found Warnings

- Ensure each employee has a `deviceId` that matches your device records
- Check that employees are assigned to the correct facility
- Verify employee status is "active"

### Missing Attendance Records

- Check the time range in your query
- Verify records exist in your device server
- Check if data format matches expected structure
- Review sync interval settings

## Best Practices

1. **Keep Device IDs Unique**: Each device ID should be unique across all facilities
2. **Consistent Timestamps**: Always use ISO 8601 format with timezone
3. **Error Handling**: Implement proper error handling in your device server
4. **Rate Limiting**: Consider implementing rate limiting to prevent abuse
5. **Logging**: Log all API requests for troubleshooting
6. **Data Retention**: Keep historical data for at least 90 days
7. **Security**: Use HTTPS in production and implement authentication

## Support

If you need help integrating your device servers:
1. Check your device server logs
2. Test the API manually using tools like Postman
3. Review the sync status and error messages in the facility details
4. Contact system administrators for assistance
