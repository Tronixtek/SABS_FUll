# Quick Start: Configure Device URLs

## 🚀 2-Minute Setup

### Step 1: Open Facilities Page
```
http://localhost:3000/facilities
```

### Step 2: Click "Edit" on Your Facility

### Step 3: Scroll to "Device API Configuration"

You'll see **THREE URL fields**:

```
┌─────────────────────────────────────────────────────────┐
│ Device API Configuration                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Device API URL *                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ https://335461d15241.ngrok-free.app/api/device/atten│ │
│ └─────────────────────────────────────────────────────┘ │
│ For fetching attendance records from device             │
│                                                          │
│ Device API Key (Optional)                               │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Bearer your-token-here                              │ │
│ └─────────────────────────────────────────────────────┘ │
│ Leave empty if device doesn't require authentication    │
│                                                          │
│ User Sync API URL (Optional)                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ https://335461d15241.ngrok-free.app/api/device/users│ │
│ └─────────────────────────────────────────────────────┘ │
│ URL to fetch/sync registered users FROM device to       │
│ central database                                         │
│                                                          │
│ Add User API URL (Optional) ⭐ NEW                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ https://335461d15241.ngrok-free.app/api/device/users│ │
│ └─────────────────────────────────────────────────────┘ │
│ URL to register new employees TO device (required for   │
│ face capture)                                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Step 4: Fill in Your URLs

**Example Configuration:**

```yaml
Device API URL:       https://335461d15241.ngrok-free.app/api/device/attendance
Device API Key:       Bearer abc123xyz (optional)
User Sync API URL:    https://335461d15241.ngrok-free.app/api/device/users/list
Add User API URL:     https://335461d15241.ngrok-free.app/api/device/users/add
```

### Step 5: Click "Save Changes"

---

## 📊 URL Usage Matrix

| When You... | System Uses... | Example URL |
|-------------|----------------|-------------|
| Auto-sync runs (every 5 min) | **Device API URL** | `.../attendance` |
| Auto-sync fetches users | **User Sync API URL** | `.../users/list` |
| Create employee with face | **Add User API URL** | `.../users/add` |

---

## ✅ What Each URL Does

### 1️⃣ Device API URL (Required)
**When:** Every 5 minutes (auto-sync)  
**What:** Fetches attendance records  
**Direction:** Device → Database  

```
POST https://device.com/api/device/attendance
Body: { "from": "2025-10-15T00:00:00Z", "to": "2025-10-16T23:59:59Z" }
```

---

### 2️⃣ User Sync API URL (Optional)
**When:** Before each attendance sync  
**What:** Fetches registered users  
**Direction:** Device → Database  

```
POST https://device.com/api/device/users/list
Body: {}
```

**Skip if:** Your device doesn't maintain a user registry

---

### 3️⃣ Add User API URL (Optional) ⭐
**When:** Creating new employee with face capture  
**What:** Registers employee on device  
**Direction:** Database → Device  

```
POST https://device.com/api/device/users/add
Body: {
  "name": "John Doe",
  "person_uuid": "1729123-ABC",
  "pic_info": "base64-image...",
  ...
}
```

**Skip if:** You don't use face capture feature

---

## 🧪 Test Your Setup

### Test 1: Attendance Sync
1. Click "Sync Now" on facility
2. Check console logs
3. Verify attendance records appear

### Test 2: User Sync
1. Register someone on device manually
2. Click "Sync Now"
3. Check if they appear in Employees page

### Test 3: Face Capture
1. Go to Employees → "Add Employee"
2. Fill details and capture face
3. Click "Create"
4. Should succeed if Add User URL configured

---

## 🐛 Common Issues

### ❌ "Device Add User API URL not configured"
**Fix:** Configure Add User API URL in facility settings

### ❌ Face capture doesn't register to device
**Fix:** 
1. Check Add User API URL is configured
2. Verify URL is correct
3. Test URL in Postman first

### ⚠️ "No userApiUrl configured" (Warning)
**This is OK!** Just means user sync is skipped. Only needed if you want to sync users FROM device.

---

## 📚 More Info

See complete guides:
- `FACILITY_URL_SETUP_GUIDE.md` - Detailed setup
- `URL_SEPARATION_SUMMARY.md` - What changed
- `DEVICE_API_V2.md` - API reference
