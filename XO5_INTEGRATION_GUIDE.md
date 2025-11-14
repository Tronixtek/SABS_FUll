# XO5 Device Integration Guide

This guide explains how to integrate Heystar XO5 biometric devices with the SABS attendance tracking system using push-based data synchronization.

## Overview

The XO5 device integration allows biometric devices to **push attendance data directly** to your SABS server in real-time, eliminating the need for periodic polling. This provides:

✅ **Real-time attendance tracking**  
✅ **Reduced server load** (no polling)  
✅ **Immediate notifications** for late arrivals/absences  
✅ **Strict data filtering** (only verified check-in/check-out events)  
✅ **Duplicate prevention**  

## XO5 Device Configuration

### 1. Network Setup

Ensure your XO5 device can reach your SABS server:

```
XO5 Device IP: 192.168.1.100
SABS Server IP: 192.168.1.50
Server Port: 5000
```

### 2. Configure XO5 Device

In your XO5 device settings, configure the webhook endpoint:

**Webhook URL:** `http://192.168.1.50:5000/api/xo5/record`

**HTTP Method:** `POST`

**Content-Type:** `application/json`

## SABS Configuration

### 1. Add XO5 Facility

1. Go to **Facilities** page
2. Click **Add Facility** or edit existing facility
3. Fill in the facility details:
   ```
   Name: Main Office XO5
   Code: XO5-MAIN
   Device Type: XO5
   Device API URL: http://192.168.1.100 (XO5 device IP)
   ```

4. In **XO5 Configuration** section:
   ```
   Webhook URL: http://192.168.1.50:5000/api/xo5/record
   Device Key: XO5-DEVICE-001
   Enable Strict Filtering: ✅ Yes
   Allowed Directions: Check-in (1), Check-out (4)
   ```

### 2. Employee Device ID Mapping

Each employee must have their **XO5 person ID** mapped to their SABS profile:

1. Go to **Employees** page
2. For each employee, set the **Device ID** field to their XO5 person serial number
3. Example: If XO5 shows `personSn: "1001"`, set Device ID to `1001`

## XO5 Data Format

The XO5 device sends attendance data in this format:

```json
{
  "recordId": "123456",
  "deviceKey": "XO5-DEVICE-001",
  "recordTime": "1730649600000",
  "recordTimeStr": "2025-11-03 09:00:00",
  "personSn": "1001",
  "personName": "John Doe",
  "resultFlag": "1",
  "personType": "1",
  "direction": "1",
  "faceFlag": "1",
  "fingerFlag": "0",
  "cardFlag": "0",
  "pwdFlag": "0"
}
```

### Field Descriptions

| Field | Description | Values |
|-------|-------------|---------|
| `recordId` | Unique record identifier | String |
| `deviceKey` | XO5 device identifier | String |
| `recordTime` | Unix timestamp (milliseconds) | Number |
| `recordTimeStr` | Human-readable time | String |
| `personSn` | Employee's device ID | String |
| `personName` | Employee name | String |
| `resultFlag` | Access result | `1` = Success, `2` = Failed |
| `personType` | Person type | `1` = Registered, `2` = Stranger |
| `direction` | Event type | `1` = Check-in, `4` = Check-out |
| `faceFlag` | Face verification | `1` = Used, `0` = Not used |
| `fingerFlag` | Fingerprint verification | `1` = Used, `0` = Not used |
| `cardFlag` | Card verification | `1` = Used, `0` = Not used |
| `pwdFlag` | Password verification | `1` = Used, `0` = Not used |

## Strict Filtering Rules

The system applies **strict filtering** to only process valid attendance events:

### ✅ Accepted Records
- `resultFlag` = `1` (Successful access only)
- `personType` = `1` (Registered users only)
- `direction` = `1` OR `4` (Check-in or Check-out only)
- Valid verification method (face, finger, or card)
- Non-duplicate records

### ❌ Rejected Records
- Failed access attempts (`resultFlag` ≠ `1`)
- Stranger access (`personType` ≠ `1`)
- Other directions (door open, system events, etc.)
- Duplicate records
- Missing essential fields

## API Endpoints

### Webhook Endpoint (for XO5 devices)
```http
POST /api/xo5/record
Content-Type: application/json

{
  "recordId": "123456",
  "deviceKey": "XO5-DEVICE-001",
  "recordTime": "1730649600000",
  "personSn": "1001",
  "direction": "1",
  "resultFlag": "1",
  "personType": "1",
  "faceFlag": "1"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Attendance record processed successfully",
  "attendanceId": "673123456789abcd",
  "deviceId": "192.168.1.100",
  "personId": "1001",
  "recordId": "123456",
  "timestamp": "2025-11-03T09:00:00.000Z"
}
```

**Response (Filtered):**
```json
{
  "status": "received",
  "message": "Data received but filtered (strict mode)",
  "reason": "Invalid direction (2)",
  "deviceId": "192.168.1.100",
  "timestamp": "2025-11-03T09:00:00.000Z"
}
```

### Health Check
```http
GET /api/xo5/health
```

**Response:**
```json
{
  "success": true,
  "message": "XO5 webhook endpoint is active",
  "timestamp": "2025-11-03T09:00:00.000Z",
  "server": {
    "uptime": 3600,
    "memory": {...}
  }
}
```

## Testing the Integration

### 1. Check Server Status
```bash
curl http://192.168.1.50:5000/api/xo5/health
```

### 2. Test Webhook (Manual)
```bash
curl -X POST http://192.168.1.50:5000/api/xo5/record \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "test-001",
    "deviceKey": "XO5-DEVICE-001",
    "recordTime": "1730649600000",
    "recordTimeStr": "2025-11-03 09:00:00",
    "personSn": "1001",
    "personName": "Test User",
    "resultFlag": "1",
    "personType": "1",
    "direction": "1",
    "faceFlag": "1",
    "fingerFlag": "0",
    "cardFlag": "0"
  }'
```

### 3. Monitor Logs

Check server logs for XO5 activity:
```bash
# View recent XO5 logs
tail -f logs/combined.log | grep XO5

# View attendance logs
tail -f logs/attendance.log
```

## Troubleshooting

### Common Issues

**1. Employee Not Found**
```
Error: Employee not found for device ID: 1001
```
**Solution:** Ensure employee's Device ID in SABS matches XO5 `personSn`

**2. No Shift Assigned**
```
Error: No shift assigned to employee: John Doe
```
**Solution:** Assign a shift to the employee in SABS

**3. Network Connection**
```
Error: XO5 device cannot reach webhook URL
```
**Solution:** Check network connectivity and firewall settings

**4. Records Being Filtered**
```
Info: XO5 Record skipped: Invalid direction (2)
```
**Solution:** This is normal - only check-in/check-out events are processed

### Log Examples

**Successful Check-in:**
```
[2025-11-03 09:00:00] [INFO]: ✅ Valid XO5 record processed
[2025-11-03 09:00:00] [INFO]: ✅ Check-in recorded for John Doe at 2025-11-03T09:00:00.000Z
```

**Filtered Record:**
```
[2025-11-03 09:01:00] [INFO]: ⏭️ XO5 Record skipped: Invalid direction (2)
```

## Security Considerations

1. **Network Security**: Ensure XO5 device and SABS server are on a secure network
2. **Firewall Rules**: Allow XO5 device IP to access SABS server on port 5000
3. **Data Validation**: All incoming data is validated before processing
4. **Duplicate Prevention**: Built-in duplicate record detection
5. **Error Logging**: All events are logged for audit purposes

## Advanced Configuration

### Custom Filtering Rules

You can modify the filtering rules in `server/controllers/xo5Controller.js`:

```javascript
// Custom validation function
function isValidXO5Record(data) {
  // Add your custom validation logic here
  return true;
}
```

### Multiple XO5 Devices

To support multiple XO5 devices:

1. Create separate facility entries for each device
2. Use unique `deviceKey` for each device
3. Map employees to their respective devices using Device ID

## Support

For technical support with XO5 integration:

1. Check server logs first
2. Verify network connectivity
3. Test webhook endpoint manually
4. Ensure employee device ID mapping is correct
5. Contact system administrator if issues persist