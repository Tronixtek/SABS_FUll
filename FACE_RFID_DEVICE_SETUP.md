# Face Recognition + RFID Device Setup Guide

This guide explains how to configure your **Face Recognition and RFID Card** enabled attendance device with the system.

## 🎯 Overview

Your attendance device supports:
- ✅ **Face Recognition** - Touchless attendance marking
- ✅ **RFID Card** - Backup method using proximity cards
- ✅ **User Registration** - Register users directly on the device
- ✅ **Two API Endpoints**:
  - User Data API - Fetch registered users from device
  - Attendance API - Fetch attendance records

## 📡 Device API Endpoints

### Required Information

You need **2 endpoints** from your device:

#### 1. **Attendance Records Endpoint**
Fetches check-in/check-out records from the device.

```
URL: https://your-ngrok-url.ngrok.io/api/attendance
Method: POST ✅ (Device requires POST requests)
```

**Request Body:**
```json
{
  "from": "2025-10-15T00:00:00Z",
  "to": "2025-10-16T23:59:59Z"
}
```

**Expected Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "12345",
      "employeeId": "EMP-001",
      "timestamp": "2025-10-16T09:05:23Z",
      "type": "in",
      "verifyMode": "face",
      "cardId": "CARD-12345"
    },
    {
      "userId": "12345",
      "employeeId": "EMP-001",
      "timestamp": "2025-10-16T17:02:45Z",
      "type": "out",
      "verifyMode": "card",
      "cardId": "CARD-12345"
    }
  ]
}
```

**Field Mapping:**
- `userId` or `deviceUserId` → User ID on the device
- `employeeId` or `empId` → Your employee ID
- `timestamp` → When the attendance was marked (ISO 8601 format)
- `type` → `in` for check-in, `out` for check-out
- `verifyMode` or `method` → `face`, `card`, `fingerprint`, `password`
- `cardId` or `rfidCard` → RFID card number

#### 2. **User Data Endpoint** (Optional but Recommended)
Fetches registered users from the device.

```
URL: https://your-ngrok-url.ngrok.io/api/users
Method: POST ✅ (Device requires POST requests)
```

**Request Body:**
```json
{
  "from": "2025-09-01T00:00:00Z",
  "to": "2025-10-16T23:59:59Z"
}
```

**Expected Response Format:**
```json
{
  "success": true,
  "users": [
    {
      "userId": "12345",
      "employeeId": "EMP-001",
      "name": "John Doe",
      "cardId": "CARD-12345",
      "faceId": "FACE-001",
      "faceData": "base64encodeddata...",
      "registeredAt": "2025-10-15T10:00:00Z"
    }
  ]
}
```

---

## 🚀 Setup Steps

### Step 1: Configure ngrok

Since you've already forwarded your device server using ngrok:

```powershell
# Your ngrok command (example)
ngrok http 80 --host-header=rewrite
```

This gives you a URL like: `https://abc123.ngrok.io`

**Copy this URL** - you'll need it for configuration.

### Step 2: Add Facility in System

1. **Login to your attendance system** at http://localhost:3000
2. **Go to Facilities page**
3. **Click "Add Facility"** button
4. **Fill in the form:**

```
Facility Name: Main Office
Facility Code: FAC-001
Address: [Your facility address]

Device Configuration:
├─ Device API URL (Attendance): https://abc123.ngrok.io/api/attendance
├─ User API URL (Optional): https://abc123.ngrok.io/api/users
├─ API Key: [If your device requires authentication]
└─ Timezone: Asia/Kolkata (or your timezone)

Settings:
├─ Enable Auto-Sync: ✅ ON
└─ Status: Active
```

5. **Click "Save"**

### Step 3: Register Users on Device

**On your Face Recognition + RFID Device:**

1. **Register Employee Face:**
   - Access device admin panel
   - Add new user
   - Enter Employee ID (e.g., EMP-001)
   - Capture face photo (multiple angles)
   - Device assigns User ID (e.g., 12345)

2. **Assign RFID Card:**
   - Place RFID card on reader
   - Card ID is automatically captured
   - Link to the same user

3. **Repeat for all employees**

### Step 4: Add Employees in System

1. **Go to Employees page** in your system
2. **Click "Add Employee"**
3. **Fill in details:**

```
Personal Information:
├─ Employee ID: EMP-001 (MUST match device registration)
├─ First Name: John
├─ Last Name: Doe
├─ Email: john.doe@company.com
└─ Phone: +1234567890

Work Information:
├─ Facility: Main Office
├─ Shift: Morning Shift
├─ Department: Operations
└─ Designation: Manager

Device Information (CRITICAL):
├─ Device ID: 12345 (User ID from device)
└─ Biometric Data:
    ├─ Face ID: FACE-001 (if device provides)
    ├─ Card ID: CARD-12345 (RFID card number)
    └─ Fingerprint ID: [Leave empty if not used]

Status: Active
```

4. **Save Employee**

### Step 5: Test Sync

#### Manual Sync Test:

1. **Go to Facilities page**
2. **Click "Sync Now"** button next to your facility
3. **Watch for:**
   - Sync status changes to "In Progress"
   - Then to "Success" or "Failed"
   - "Last Synced" timestamp updates
   - Error message if failed

#### Verify Attendance:

1. **Have an employee mark attendance** on the device
2. **Wait 1-2 minutes** for sync
3. **Go to Attendance page**
4. **Filter by today's date**
5. **Check if record appears**

---

## 🔍 Verification Method Detection

The system automatically detects which method was used:

| Device Method | System Records As |
|--------------|-------------------|
| `face`, `Face`, `FACE` | `face-recognition` |
| `card`, `CARD`, `rfid`, `RFID` | `rfid-card` |
| `finger`, `Fingerprint`, `FP` | `fingerprint` |
| `password`, `PIN`, `pwd` | `password` |

You can see the method used in attendance records!

---

## 🔄 Auto-Sync Behavior

Once configured, the system:

1. **Every 5 minutes** (configurable in `.env`)
2. **Fetches user data** from User API (optional)
3. **Updates biometric data** for existing employees
4. **Fetches attendance records** from Attendance API
5. **Matches employees** by:
   - Device User ID
   - Employee ID
   - RFID Card ID
   - Face ID
6. **Creates attendance records** automatically
7. **Calculates** work hours, overtime, late arrival

---

## 📋 Complete Configuration Checklist

### Device Configuration
- [ ] Device is online and accessible
- [ ] ngrok is running and forwarding device server
- [ ] ngrok URL is stable (use auth token for persistent URLs)
- [ ] Device APIs return data in correct format
- [ ] Test APIs using browser or Postman

### System Configuration
- [ ] Facility added with correct ngrok URL
- [ ] User API URL configured (optional)
- [ ] API Key set if device requires authentication
- [ ] Timezone matches device location
- [ ] Auto-sync is enabled

### User Setup
- [ ] Users registered on device (face + card)
- [ ] Device User IDs noted down
- [ ] Employees added in system
- [ ] Device IDs match between device and system
- [ ] RFID Card IDs recorded correctly

### Testing
- [ ] Manual sync works without errors
- [ ] User data syncs correctly (if enabled)
- [ ] Test attendance marking on device
- [ ] Attendance record appears in system
- [ ] Verification method is detected correctly
- [ ] Auto-sync runs every 5 minutes
- [ ] No errors in sync status

---

## 🛠️ Troubleshooting

### Issue: "Employee not found for device ID"

**Cause:** Device User ID doesn't match any employee in system.

**Solution:**
1. Check employee's **Device ID** field in system
2. Check **User ID** on device for that employee
3. Make sure they match exactly
4. Also check RFID **Card ID** matches

### Issue: "Invalid response format from device API"

**Cause:** Device API returns data in unexpected format.

**Solution:**
1. Test API manually: `curl https://your-ngrok-url.ngrok.io/api/attendance`
2. Check response structure
3. System accepts these formats:
   - `{ "data": [...] }`
   - `{ "records": [...] }`
   - `[...]` (direct array)

### Issue: "Sync fails with timeout error"

**Cause:** Device or ngrok connection slow/unstable.

**Solution:**
1. Check if device is online
2. Check if ngrok is running
3. Try accessing ngrok URL in browser
4. Increase timeout in sync service (currently 30 seconds)

### Issue: "Attendance records not appearing"

**Cause:** Multiple possible reasons.

**Solutions:**
1. **Check sync status** in Facilities page
2. **Verify employee exists** with correct Device ID
3. **Check timezone** - timestamp might be in future/past
4. **Look at server logs** for detailed errors
5. **Check date filter** in Attendance page

### Issue: "Face recognition works but RFID doesn't"

**Cause:** Card ID not properly mapped.

**Solution:**
1. Get RFID card number from device
2. Update employee's **Biometric Data → Card ID**
3. Test again with card
4. Check sync logs to see what Card ID device sends

---

## 📊 Expected Data Flow

```
┌─────────────────────────────────────────────────┐
│  Face Recognition + RFID Device                 │
│  - User registers face + card                   │
│  - Employee marks attendance                    │
│  - Device stores record                         │
└────────────────┬────────────────────────────────┘
                 │
                 │ ngrok forwards
                 ▼
┌─────────────────────────────────────────────────┐
│  Device Server APIs                             │
│  GET /api/users     → Returns registered users  │
│  GET /api/attendance → Returns attendance logs  │
└────────────────┬────────────────────────────────┘
                 │
                 │ Every 5 minutes
                 ▼
┌─────────────────────────────────────────────────┐
│  Data Sync Service                              │
│  1. Fetch users (optional)                      │
│  2. Update biometric data                       │
│  3. Fetch attendance records                    │
│  4. Match with employees                        │
│  5. Create/update attendance                    │
└────────────────┬────────────────────────────────┘
                 │
                 │ Stores in
                 ▼
┌─────────────────────────────────────────────────┐
│  MongoDB Database                               │
│  - Employees (with device IDs)                  │
│  - Attendance records                           │
│  - Verification methods tracked                 │
└────────────────┬────────────────────────────────┘
                 │
                 │ Displays in
                 ▼
┌─────────────────────────────────────────────────┐
│  Frontend Dashboard                             │
│  - Real-time attendance                         │
│  - Reports and analytics                        │
│  - Employee management                          │
└─────────────────────────────────────────────────┘
```

---

## 🔐 Security Best Practices

### 1. ngrok Security
```powershell
# Use ngrok auth token for persistent URLs
ngrok config add-authtoken YOUR_AUTH_TOKEN

# Use password protection
ngrok http 80 --basic-auth="username:password"
```

### 2. API Key Authentication
If your device supports it:
- Generate strong API key
- Add to facility configuration
- System will send in `Authorization: Bearer YOUR_KEY` header

### 3. IP Whitelisting
Configure your device to only accept requests from:
- Your attendance system server IP
- ngrok IP ranges

### 4. HTTPS Only
- ngrok provides HTTPS by default ✅
- Always use `https://` URLs
- Never use plain HTTP in production

---

## 🎯 Next Steps

1. ✅ **Configure your first facility** with ngrok URL
2. ✅ **Register 1-2 test employees** on device
3. ✅ **Add them in system** with correct Device IDs
4. ✅ **Test manual sync**
5. ✅ **Mark attendance** on device
6. ✅ **Verify records appear** in system
7. ✅ **Enable auto-sync**
8. ✅ **Repeat for all 6 facilities**

---

## 📞 Need Help?

Check these files for more information:
- `DEVICE_INTEGRATION.md` - General device integration
- `API_DOCUMENTATION.md` - All API endpoints
- `SETUP_GUIDE.md` - Complete setup instructions
- `README.md` - Full documentation

---

**Your system is now ready to work with Face Recognition + RFID devices! 🎉**
