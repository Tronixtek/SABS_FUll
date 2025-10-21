# Facility URL Configuration Guide

## 📋 Overview

When setting up a facility with a biometric device, you need to configure **THREE URLs**:

1. **Attendance API URL** (Required) - Main device URL
2. **User Sync API URL** (Optional) - Fetch users from device
3. **Add User API URL** (Optional) - Register new users to device

---

## 🔗 URL Configuration

### 1. Attendance API URL (Required)
**Field:** Device API URL  
**Purpose:** Fetch attendance records from device  
**Direction:** Device → Central Database  
**Used by:** `dataSyncService.js` - Automatic sync every 5 minutes

**Example:**
```
https://335461d15241.ngrok-free.app/api/device/attendance
```

**What it does:**
- Fetches clock-in/clock-out records
- Runs automatically every 5 minutes (if auto-sync enabled)
- Processes attendance data and saves to database

---

### 2. User Sync API URL (Optional)
**Field:** User Sync API URL  
**Purpose:** Fetch list of registered users from device  
**Direction:** Device → Central Database  
**Used by:** `dataSyncService.js` - Runs before attendance sync

**Example:**
```
https://335461d15241.ngrok-free.app/api/device/users/list
```

**What it does:**
- Fetches all users registered on the device
- Creates new employees in central database if not exists
- Updates existing employee data (deviceId, RFID, profile image)
- Runs automatically before each attendance sync

**When to use:**
- ✅ Your device has face recognition + RFID
- ✅ Device maintains its own user registry
- ✅ You want to sync device users to central database
- ❌ Skip if device only records attendance without user registry

---

### 3. Add User API URL (Optional but Recommended)
**Field:** Add User API URL  
**Purpose:** Register new employees TO the device  
**Direction:** Central Database → Device  
**Used by:** `EmployeeModal.js` - When creating new employee with face capture

**Example:**
```
https://335461d15241.ngrok-free.app/api/device/users/add
```

**What it does:**
- Sends new employee data to device
- Includes face photo (base64)
- Includes personal info (name, department, DOB, etc.)
- Registers employee on device for biometric recognition

**When to use:**
- ✅ Required for face capture feature
- ✅ Device supports face recognition
- ✅ You want to register employees from central system
- ❌ Skip if you register users directly on device

---

## 🚀 How to Configure

### Step 1: Go to Facilities Page
Navigate to: `http://localhost:3000/facilities`

### Step 2: Edit Your Facility
Click **"Edit"** button on your facility (e.g., Dala)

### Step 3: Fill in Device API Configuration

**Required Field:**
```
Device API URL: https://335461d15241.ngrok-free.app/api/device/attendance
```

**Optional Fields:**
```
User Sync API URL: https://335461d15241.ngrok-free.app/api/device/users/list
Add User API URL:  https://335461d15241.ngrok-free.app/api/device/users/add
```

### Step 4: Save
Click **"Save Changes"**

---

## 📊 Configuration Examples

### Example 1: Full Integration (Recommended)
**Use case:** Face recognition device with full integration

```
✅ Device API URL:      https://device.com/api/device/attendance
✅ User Sync API URL:   https://device.com/api/device/users/list
✅ Add User API URL:    https://device.com/api/device/users/add
✅ Device API Key:      Bearer abc123xyz (optional)
```

**Features:**
- ✅ Auto-sync attendance
- ✅ Auto-sync users from device
- ✅ Register new employees with face capture

---

### Example 2: Attendance Only
**Use case:** Simple fingerprint/RFID device, no user registry

```
✅ Device API URL:      https://device.com/api/attendance
❌ User Sync API URL:   (Leave empty)
❌ Add User API URL:    (Leave empty)
```

**Features:**
- ✅ Auto-sync attendance only
- ❌ Cannot sync users from device
- ❌ Cannot register employees with face capture

---

### Example 3: User Sync Only (One-way)
**Use case:** Sync existing users from device, but register manually on device

```
✅ Device API URL:      https://device.com/api/attendance
✅ User Sync API URL:   https://device.com/api/users/list
❌ Add User API URL:    (Leave empty)
```

**Features:**
- ✅ Auto-sync attendance
- ✅ Auto-sync users from device to database
- ❌ Cannot register new employees from central system

---

## 🔄 How the Sync Process Works

### Automatic Sync Flow (Every 5 minutes)

```
1. Sync Service Starts
   ↓
2. For each facility with autoSync enabled:
   ↓
3. Step 1: Sync Users (if userApiUrl configured)
   ├── POST to userApiUrl
   ├── Fetch device_response.info.SearchInfo[]
   ├── Create/update employees in database
   └── Log results
   ↓
4. Step 2: Sync Attendance
   ├── POST to deviceApiUrl
   ├── Fetch device_response.info.SearchInfo[]
   ├── Match to employees
   ├── Create/update attendance records
   └── Calculate late/early/overtime
   ↓
5. Mark facility sync status as success/failed
```

### Employee Registration Flow

```
1. User opens "Add Employee" form
   ↓
2. User fills employee details
   ↓
3. User clicks "Start Camera"
   ↓
4. User captures face photo
   ↓
5. User clicks "Create"
   ↓
6. System checks if addUserApiUrl configured
   ↓
7. If configured:
   ├── POST to addUserApiUrl with:
   │   ├── name (required)
   │   ├── facility, department (optional)
   │   ├── birth_date, nation, id_card (optional)
   │   ├── person_uuid (auto-generated)
   │   └── pic_info (base64 face image)
   ↓
8. If device registration succeeds:
   ├── Save employee to central database
   ├── Use person_uuid as deviceId
   └── Show success message
   ↓
9. If device registration fails:
   └── Show error, don't save to database
```

---

## 🛠️ API Payload Formats

### 1. Attendance API Request
```http
POST https://device.com/api/device/attendance
Content-Type: application/json
Authorization: Bearer abc123xyz (if configured)

{
  "from": "2025-10-15T00:00:00Z",
  "to": "2025-10-16T23:59:59Z"
}
```

**Expected Response:**
```json
{
  "device_response": {
    "info": {
      "DeviceID": "12345",
      "SearchInfo": [
        {
          "personUUID": "1729123-ABC123",
          "Name": "John Doe",
          "Time": "2025-10-16T09:05:00Z",
          "RFIDCard": "0001234567"
        }
      ]
    }
  }
}
```

---

### 2. User Sync API Request
```http
POST https://device.com/api/device/users/list
Content-Type: application/json
Authorization: Bearer abc123xyz (if configured)

{}
```

**Expected Response:**
```json
{
  "device_response": {
    "info": {
      "DeviceID": "12345",
      "DeviceModel": "FaceX100",
      "SearchInfo": [
        {
          "personUUID": "1729123-ABC123",
          "Name": "John Doe",
          "RFIDCard": "0001234567",
          "RegPicinfo": "data:image/jpeg;base64,..."
        }
      ]
    }
  }
}
```

---

### 3. Add User API Request
```http
POST https://device.com/api/device/users/add
Content-Type: application/json
Authorization: Bearer abc123xyz (if configured)

{
  "name": "John Doe",
  "facility": "Main Office",
  "department": "Engineering",
  "birth_date": "1990-05-15",
  "nation": "American",
  "id_card": "ABC123456789",
  "person_uuid": "1729123456789-A7B9D2E",
  "pic_info": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "person_uuid": "1729123456789-A7B9D2E",
    "device_user_id": "12345"
  }
}
```

---

## ✅ Testing Your Configuration

### Test 1: Attendance Sync
1. Go to Facilities page
2. Click "Sync Now" button
3. Check logs: `logs/sync.log`
4. Verify attendance records created

### Test 2: User Sync
1. Register a user on the device manually
2. Go to Facilities page
3. Click "Sync Now"
4. Check logs: `logs/sync.log`
5. Verify employee created in Employees page

### Test 3: Add User
1. Go to Employees page
2. Click "Add Employee"
3. Fill in details
4. Capture face photo
5. Click "Create"
6. Check if device registration succeeds
7. Verify employee appears in list

---

## 🐛 Troubleshooting

### Error: "Device Add User API URL not configured"
**Solution:** Go to Facilities → Edit → Add User API URL field

### Error: "Failed to register face to device"
**Possible causes:**
1. ❌ Add User API URL not configured
2. ❌ Device server not running
3. ❌ Wrong URL format
4. ❌ Network connectivity issues
5. ❌ Invalid authentication token

**Solutions:**
1. ✅ Configure Add User API URL in facility
2. ✅ Verify device server is running
3. ✅ Check URL format (must start with http:// or https://)
4. ✅ Test URL in Postman first
5. ✅ Check Device API Key if authentication is required

### Error: "No userApiUrl configured"
**This is just a warning** - Only appears if:
- User Sync API URL is empty
- Auto-sync tries to sync users

**Solution:** If you want user sync, configure User Sync API URL

---

## 📚 Related Documentation

- **DEVICE_API_V2.md** - Complete API format reference
- **CAMERA_FIX_NOTES.md** - Camera troubleshooting
- **FACE_CAPTURE_GUIDE.md** - Face capture workflow
- **USER_DEVICE_SYNC_GUIDE.md** - Detailed sync process

---

## 📝 Quick Reference

| Feature | Required URL | Optional URLs |
|---------|-------------|---------------|
| Attendance tracking | Device API URL | - |
| User sync from device | Device API URL | User Sync API URL |
| Face capture registration | Device API URL, Add User API URL | User Sync API URL |
| Full integration | All 3 URLs | - |

---

## 🎯 Recommended Setup

For best experience, configure all three URLs:

```yaml
Facility Configuration:
  Device API URL: https://your-device.com/api/device/attendance
  User Sync API URL: https://your-device.com/api/device/users/list
  Add User API URL: https://your-device.com/api/device/users/add
  Device API Key: Bearer your-token-here (optional)
  Auto-Sync: Enabled
  Sync Interval: 5 minutes
```

This enables:
- ✅ Automatic attendance sync
- ✅ Automatic user sync
- ✅ Face capture for new employees
- ✅ Complete bidirectional integration
