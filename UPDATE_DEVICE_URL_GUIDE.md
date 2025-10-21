# How to Update Device Attendance Fetch URL

## 🎯 Quick Answer
Update device URLs in the **Facilities page** at http://localhost:3000/facilities

---

## Method 1: Frontend (RECOMMENDED) ⭐

### Step-by-Step:

1. **Start the application:**
   ```powershell
   npm run dev:full
   ```

2. **Login to admin panel:**
   - Go to: http://localhost:3000
   - Login with your admin credentials

3. **Navigate to Facilities:**
   - Click "Facilities" in the sidebar
   - Or go directly to: http://localhost:3000/facilities

4. **Edit Facility:**
   - Click "Edit" button on the facility you want to update

5. **Update Device API Configuration:**
   ```
   Device API URL: https://abc123.ngrok.io/api/attendance
   Device API Key: your-device-api-key (if required)
   User API URL: https://abc123.ngrok.io/api/users (optional)
   ```

6. **Save Changes:**
   - Click "Save" or "Update Facility"

7. **Test Sync:**
   - Click "Sync Now" button to test immediately
   - Or wait for automatic sync (every 5 minutes)

---

## Method 2: Using API Endpoint

### Update via API Request:

```powershell
# Get facility ID first
$facilities = Invoke-RestMethod -Uri "http://localhost:5000/api/facilities" -Method Get -Headers @{Authorization="Bearer YOUR_JWT_TOKEN"}
$facilities.data

# Update specific facility
$facilityId = "YOUR_FACILITY_ID_HERE"
$body = @{
    deviceApiUrl = "https://your-new-ngrok-url.ngrok.io/api/attendance"
    deviceApiKey = "your-api-key"
    configuration = @{
        userApiUrl = "https://your-new-ngrok-url.ngrok.io/api/users"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/facilities/$facilityId" -Method Put -Body $body -ContentType "application/json" -Headers @{Authorization="Bearer YOUR_JWT_TOKEN"}
```

---

## Method 3: MongoDB Shell (Advanced)

### Direct database update:

```javascript
// Open MongoDB shell
mongo

// Switch to database
use attendance-tracking

// View all facilities
db.facilities.find().pretty()

// Update specific facility by name
db.facilities.updateOne(
  { name: "Main Office" },
  {
    $set: {
      deviceApiUrl: "https://abc123.ngrok.io/api/attendance",
      deviceApiKey: "your-api-key",
      "configuration.userApiUrl": "https://abc123.ngrok.io/api/users"
    }
  }
)

// Update by facility ID
db.facilities.updateOne(
  { _id: ObjectId("YOUR_FACILITY_ID") },
  {
    $set: {
      deviceApiUrl: "https://abc123.ngrok.io/api/attendance",
      deviceApiKey: "your-api-key",
      "configuration.userApiUrl": "https://abc123.ngrok.io/api/users"
    }
  }
)

// Update all facilities at once (if they use same device)
db.facilities.updateMany(
  {},
  {
    $set: {
      deviceApiUrl: "https://abc123.ngrok.io/api/attendance",
      deviceApiKey: "your-api-key"
    }
  }
)

// Verify update
db.facilities.find({}, {name: 1, deviceApiUrl: 1, "configuration.userApiUrl": 1}).pretty()
```

---

## 📋 URL Configuration Details

### Required Fields:
- **deviceApiUrl** - Main attendance records endpoint
  - Example: `https://abc123.ngrok.io/api/attendance`
  - **Method**: POST (device accepts POST requests with from/to date range)
  - This is where check-in/check-out records are fetched

### Optional Fields:
- **deviceApiKey** - Authentication key for device API
  - Example: `Bearer abc123xyz` or `your-secret-key`
  - Leave empty if device doesn't require authentication

- **configuration.userApiUrl** - User registry endpoint (for face recognition + RFID devices)
  - Example: `https://abc123.ngrok.io/api/users`
  - **Method**: POST (device accepts POST requests with from/to date range)
  - Only needed if device has separate endpoint for registered users
  - See FACE_RFID_DEVICE_SETUP.md for details

### Important: POST Request Format
The system automatically sends POST requests with this body:
```json
{
  "from": "2025-10-15T00:00:00Z",
  "to": "2025-10-16T23:59:59Z"
}
```

---

## 🔍 How to Find Your Device URL

### If using ngrok:

1. **Start ngrok tunnel:**
   ```powershell
   ngrok http 8080
   ```
   *(Replace 8080 with your device's port)*

2. **Copy the HTTPS URL from ngrok output:**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:8080
   ```

3. **Append your device's API endpoint:**
   - Attendance: `https://abc123.ngrok.io/api/attendance`
   - Users: `https://abc123.ngrok.io/api/users`

### If device is on local network:

- Use device's IP address:
  ```
  http://192.168.1.100:8080/api/attendance
  ```

### If device has cloud API:

- Use the provided cloud URL:
  ```
  https://device-cloud.example.com/api/v1/attendance
  ```

---

## ✅ After Updating URL

### 1. Test Manual Sync:
- Go to Facilities page
- Click "Sync Now" button on the updated facility
- Check console logs for connection status

### 2. Check Server Logs:
Look for these messages:
```
✅ Facility Main Office: Processed 5 records, 0 errors
📥 Syncing users from Main Office device...
```

### 3. Verify Data:
- Go to Attendance page
- Check if new records are appearing
- Verify employee matching is working

### 4. Enable Auto-Sync:
- Edit facility settings
- Toggle "Auto Sync" to ON
- System will sync every 5 minutes automatically

---

## 🚨 Troubleshooting

### Issue: "Connection timeout"
**Solution:** 
- Check if device URL is accessible
- Test URL in browser: `https://abc123.ngrok.io/api/attendance`
- Verify ngrok is running
- Check firewall settings

### Issue: "Invalid API key"
**Solution:**
- Verify deviceApiKey is correct
- Check if device requires specific header format
- Try without API key first (leave blank)

### Issue: "No data returned"
**Solution:**
- Check device API response format
- View raw response in browser
- Ensure date range parameters are correct
- Check server logs for parsing errors

### Issue: "Employee not found"
**Solution:**
- Verify Device ID in employee records matches device
- Check RFID Card ID is correct
- See ATTENDANCE_LOGIC.md for employee matching details

---

## 📊 Expected API Response Format

Your device should return data in one of these formats:

### Format 1: Nested data property
```json
{
  "data": [
    {
      "deviceId": "EMP001",
      "timestamp": "2025-10-16T09:00:00Z",
      "type": "in",
      "method": "face"
    }
  ]
}
```

### Format 2: Direct array
```json
[
  {
    "userId": "EMP001",
    "timestamp": "2025-10-16T09:00:00Z",
    "checkType": "checkin",
    "verifyMode": "Face Recognition"
  }
]
```

### Format 3: Records property
```json
{
  "records": [
    {
      "empId": "EMP001",
      "timestamp": "2025-10-16T09:00:00Z",
      "direction": "entry",
      "method": "card"
    }
  ]
}
```

The system automatically detects and handles all these formats!

### API Request Details
The system sends **POST requests** with this body:
```json
{
  "from": "2025-10-15T00:00:00Z",  // Start date/time
  "to": "2025-10-16T23:59:59Z"      // End date/time
}
```

Your device API should:
- ✅ Accept POST requests (not GET)
- ✅ Accept `from` and `to` parameters in request body
- ✅ Return records within the specified date range
- ✅ Use ISO 8601 format for timestamps

---

## 🔐 Security Best Practices

1. **Use HTTPS URLs** (ngrok provides this automatically)
2. **Store API keys securely** in facility settings
3. **Use ngrok authentication** for production:
   ```powershell
   ngrok http 8080 --authtoken YOUR_NGROK_AUTH_TOKEN
   ```
4. **Restrict API access** to your server's IP if possible
5. **Monitor sync logs** for unauthorized access attempts

---

## 📞 Need Help?

- **Device Integration Guide:** See `FACE_RFID_DEVICE_SETUP.md`
- **Attendance Logic:** See `ATTENDANCE_LOGIC.md`
- **API Documentation:** See `API_DOCUMENTATION.md`
- **General Setup:** See `SETUP_GUIDE.md`

---

**Last Updated:** October 16, 2025
