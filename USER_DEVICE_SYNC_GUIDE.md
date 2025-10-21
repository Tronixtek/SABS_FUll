# 👥 User Device Sync Guide

## 🎯 Overview

The **User Sync** feature synchronizes user data from your face recognition + RFID device to update employee records in the system with their Device IDs, Card IDs, and Face IDs. This is **essential** for attendance tracking to work correctly.

---

## 🔄 How It Works

### Sync Flow

```
1. Click "Sync Now" on Facility
   ↓
2. 👥 USER SYNC (if userApiUrl configured)
   - Fetches all users from device
   - Matches with existing employees
   - Updates Device IDs and biometric data
   ↓
3. 📊 ATTENDANCE SYNC
   - Fetches attendance records
   - Matches records to employees using updated IDs
   - Saves attendance to database
```

---

## ⚙️ Configuration

### Step 1: Configure User API URL in Facility

1. Go to **Facilities** page
2. Click **Edit** on your facility
3. In the **Device API Configuration** section:
   - **Device API URL**: Your attendance endpoint (e.g., `https://your-device.ngrok.io/api/device/attendance`)
   - **User API URL**: Your user registry endpoint (e.g., `https://your-device.ngrok.io/api/device/users`)
4. Click **Save**

### Device Response Format

Your device should return users in one of these formats:

```json
// Format 1: Your device format (device_response)
{
  "device_response": {
    "info": {
      "SearchInfo": [
        {
          "userId": "123",
          "name": "John Doe",
          "cardId": "ABC123",
          "faceId": "face_001"
        }
      ]
    }
  }
}

// Format 2: Standard data array
{
  "data": [
    {
      "userId": "123",
      "name": "John Doe",
      "cardId": "ABC123"
    }
  ]
}

// Format 3: Direct array
[
  {
    "userId": "123",
    "name": "John Doe",
    "cardId": "ABC123"
  }
]
```

---

## 🔍 What Gets Synced

### User Fields Recognized

The system looks for these fields in device user data:

| Field Purpose | Device Field Names (Any) | Employee Field |
|--------------|-------------------------|----------------|
| Device ID | `deviceUserId`, `userId`, `id`, `userCode`, `pin` | `deviceId` |
| Employee ID | `employeeId`, `empId`, `empCode` | `employeeId` |
| Card ID | `cardId`, `rfidCard`, `cardNo` | `biometricData.cardId` |
| Face ID | `faceId`, `faceData` | `biometricData.faceId` |
| Fingerprint ID | `fingerprintId`, `fingerprintData` | `biometricData.fingerprintId` |
| Name | `name`, `userName`, `firstName + lastName` | (for display only) |

---

## 📊 Understanding the Logs

### Successful User Sync

```
👥 ===== USER SYNC STARTED =====
📥 Syncing users from Dala device...
   URL: https://your-device.ngrok.io/api/device/users
   
📤 Sending user sync request...
📥 Received user data response
   Status: 200
   Format: device_response.info.SearchInfo[]
   
📋 Found 10 users on device

📝 Sample user data structure: {
  "userId": "123",
  "name": "John Doe",
  "cardId": "ABC123"
}

🔍 Processing device user...
   Device User Info:
     Device ID: 123
     Employee ID: EMP001
     Card ID: ABC123
     Face ID: Yes
     Name: John Doe
     
   ✅ Found matching employee: John Doe
      📝 Updating deviceId: old_id → 123
      📝 Updating cardId: ABC123
      ✅ Employee updated successfully

✅ ===== USER SYNC COMPLETED =====
   Total users from device: 10
   ✅ Updated: 8
   ❌ Not found in system: 2
   📝 Created: 0
```

### User Not Found in System

```
🔍 Processing device user...
   Device User Info:
     Device ID: 456
     Card ID: XYZ789
     Name: Jane Smith
     
   ❌ No matching employee found in system
      💡 Create an employee with one of these IDs:
         - Device ID: 456
         - Card ID: XYZ789
```

---

## ✅ Step-by-Step: First Time Setup

### 1. Configure Facility with User API URL

```
Edit Facility → Add User API URL → Save
```

### 2. Click "Sync Now"

This will trigger:
- User sync to fetch device users
- Show which users were found/not found

### 3. Check Backend Logs

Look for:
- `👥 ===== USER SYNC STARTED =====`
- List of device users with their IDs
- Which employees were updated
- Which users were NOT FOUND

### 4. Add Missing Employees

For each user not found:

1. Go to **Employees** page
2. Click **Add Employee**
3. Fill in required fields:
   - First Name
   - Last Name
   - Email
   - Phone
   - **Device ID**: Use the ID shown in logs (e.g., `456`)
   - **Card ID** (in Biometric Data section): Use card ID from logs
   - Facility: Select your facility
   - Department
   - Designation
   - Shift: Assign a shift
4. Click **Save**

### 5. Run Sync Again

Click "Sync Now" again to:
- Update newly added employees
- Verify all users are now matched

---

## 🎯 Matching Logic

The system matches device users to employees using **ANY** of these criteria:

1. **Device ID Match**
   ```
   device.userId === employee.deviceId
   ```

2. **Employee ID Match**
   ```
   device.employeeId === employee.employeeId
   ```

3. **Card ID Match**
   ```
   device.cardId === employee.biometricData.cardId
   ```

**If ANY match is found**, the employee is updated with all biometric data from the device.

---

## 🔄 What Gets Updated

When a match is found, the system updates:

1. **Device ID** → Always updated if present in device data
2. **Card ID** → Updated in `biometricData.cardId`
3. **Face ID** → Updated in `biometricData.faceId`
4. **Fingerprint ID** → Updated in `biometricData.fingerprintId`

The system only saves if data actually changed (prevents unnecessary DB writes).

---

## 🚨 Common Issues & Solutions

### Issue 1: No Users Synced (updatedCount = 0)

**Possible Causes:**
- No matching employees in system
- Device IDs don't match
- Wrong facility assigned to employees

**Solution:**
1. Check logs for device user IDs
2. Add employees with matching Device IDs
3. Ensure employees are assigned to correct facility

---

### Issue 2: User API URL Returns Error

**What You'll See:**
```
❌ Failed to sync users from Dala:
   Error: Request failed with status code 404
```

**Solution:**
- Verify User API URL is correct
- Test URL with PowerShell:
  ```powershell
  $body = @{} | ConvertTo-Json
  Invoke-RestMethod -Uri "YOUR_USER_API_URL" -Method Post -Body $body -ContentType "application/json"
  ```
- Check if device requires authentication (add API Key)

---

### Issue 3: Users Synced but Attendance Still Not Working

**This means:**
- Users were updated successfully
- But attendance records don't match

**Check:**
1. Are Device IDs now set on employees? (Check Employees page)
2. Do attendance records use the same ID format?
3. Run attendance sync and check logs

---

## 💡 Pro Tips

### 1. Run User Sync First
Always configure and test User Sync **before** expecting attendance to work.

### 2. Use Card IDs for Backup Matching
If Device IDs change, Card IDs (RFID) usually stay the same and provide reliable matching.

### 3. Check Sample Data First
The logs show a sample user structure - verify it matches your expectations before adding employees.

### 4. Bulk Import Employees
If you have many users:
1. Run user sync to see all device users
2. Copy the IDs from logs
3. Create employees in bulk (or use CSV import if available)

### 5. Sync Frequency
- First time: Run manually to verify
- After setup: Enable auto-sync (runs every 5 minutes)
- User data doesn't change often, so daily syncs are usually enough

---

## 📋 Checklist: Verify User Sync Working

- [ ] Facility has User API URL configured
- [ ] Click "Sync Now" triggers user sync logs
- [ ] Backend shows `👥 USER SYNC STARTED`
- [ ] Device returns users (count > 0)
- [ ] Sample user data structure looks correct
- [ ] Some employees show `✅ Found matching employee`
- [ ] Updated count > 0
- [ ] Employees now have Device IDs set (check Employees page)
- [ ] Ready to test attendance sync

---

## 🔗 Next Steps

After user sync is working:

1. ✅ Verify employees have Device IDs
2. ✅ Ensure employees have shifts assigned
3. ✅ Test attendance sync
4. ✅ Verify attendance appears on Attendance page
5. ✅ Check calculations (late, overtime) are correct

---

## 📞 Testing Commands

### Test User API Directly

```powershell
# Replace with your actual URL
$body = @{
    from = (Get-Date).AddDays(-30).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    to = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://your-device.ngrok.io/api/device/users" `
    -Method Post -Body $body -ContentType "application/json"
```

### Check Employees Have Device IDs

```javascript
// In MongoDB Compass or mongosh
db.employees.find(
  { facility: ObjectId("YOUR_FACILITY_ID") },
  { firstName: 1, lastName: 1, deviceId: 1, "biometricData.cardId": 1 }
)
```

---

## 🎯 Success Criteria

**User sync is working correctly when:**

1. ✅ Logs show "USER SYNC COMPLETED"
2. ✅ Updated count > 0
3. ✅ Employees in system now have Device IDs
4. ✅ Device IDs match what device sends
5. ✅ Attendance sync can now match records to employees

---

**Need Help?** Share your user sync logs showing the device user structure and I'll help you match them to employees! 🚀
