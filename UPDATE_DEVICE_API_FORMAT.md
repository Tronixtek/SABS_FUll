# Device API Update Summary

## 🎯 What Changed

The device server now expects a **flat JSON structure** instead of a nested format for user registration.

## 📌 Important: Two Different URLs

The system now uses **TWO separate URLs** for different purposes:

### 1. **User Sync API URL** (`userApiUrl`)
- **Purpose**: Fetch/sync registered users **FROM** device **TO** central database
- **Direction**: Device → Central Database
- **Used by**: Background sync service (`dataSyncService.js`)
- **Example**: `https://device.com/api/users/list`

### 2. **Add User API URL** (`addUserApiUrl`) ⭐ NEW
- **Purpose**: Register/add new employees **TO** device
- **Direction**: Central Database → Device
- **Used by**: Employee registration form (`EmployeeModal.js`)
- **Example**: `https://device.com/api/users/add`

## ✅ Changes Made

### 1. Updated Device API Payload Format

**Before:**
```json
{
  "operator": "AddPerson",
  "info": {
    "Name": "John Doe",
    "personUUID": "123",
    "RFIDCard": "0",
    "RegPicinfo": "base64..."
  }
}
```

**After:**
```json
{
  "name": "John Doe",
  "facility": "Main Office",
  "department": "Engineering",
  "birth_date": "1990-05-15",
  "nation": "American",
  "id_card": "ABC123",
  "person_uuid": "123",
  "pic_info": "base64..."
}
```

### 2. Added New Employee Fields

**Database Model (Employee.js):**
- ✅ `dateOfBirth` - Date of birth
- ✅ `nationality` - Nationality/citizenship
- ✅ `nationalId` - National ID or passport number

**Form Fields (EmployeeModal.js):**
- ✅ Date of Birth picker (optional)
- ✅ Nationality text input (optional)
- ✅ National ID / Passport text input (optional)

### 3. Updated Registration Function

**File:** `client/src/components/EmployeeModal.js`

The `registerToDevice()` function now sends:
```javascript
const devicePayload = {
  name: `${firstName} ${lastName}`,
  facility: facility.name || null,
  department: department || null,
  birth_date: dateOfBirth || null,
  nation: nationality || null,
  id_card: nationalId || null,
  person_uuid: personUUID,
  pic_info: faceImage
};
```

## 📋 Field Mapping

| Device API Field | Employee Field | Required |
|-----------------|----------------|----------|
| `name` | firstName + lastName | ✅ Yes |
| `facility` | facility.name | ❌ No |
| `department` | department | ❌ No |
| `birth_date` | dateOfBirth | ❌ No |
| `nation` | nationality | ❌ No |
| `id_card` | nationalId | ❌ No |
| `person_uuid` | deviceId (auto-generated) | ❌ No |
| `pic_info` | profileImage (base64) | ❌ No |

## 🔧 Files Modified

1. **client/src/components/EmployeeModal.js**
   - Added 3 new fields to formData state
   - Updated `registerToDevice()` function
   - Added 3 new form input fields

2. **server/models/Employee.js**
   - Added `dateOfBirth` field
   - Added `nationality` field
   - Added `nationalId` field

3. **DEVICE_API_V2.md** (NEW)
   - Complete API documentation
   - Examples and field mapping
   - Migration guide

## 🧪 Testing

### Test the Changes

1. **Start the application:**
   ```powershell
   npm run dev:full
   ```

2. **Add New Employee:**
   - Go to Employees page
   - Click "Add Employee"
   - Fill in basic info (required fields)
   - Fill in new optional fields:
     - Date of Birth
     - Nationality (e.g., "American")
     - National ID (e.g., "ABC123456")
   - Capture face photo
   - Submit

3. **Verify Device API Call:**
   - Check browser console (Network tab)
   - Look for POST request to device API
   - Verify payload matches new format

4. **Verify Database:**
   - Check if employee saved with new fields
   - Verify deviceId (person_uuid) was saved

## 📚 Documentation

- **DEVICE_API_V2.md** - Complete API reference
- **CAMERA_FIX_NOTES.md** - Camera improvements
- **FACE_CAPTURE_GUIDE.md** - Face capture workflow
- **PERSON_UUID_UPDATE.md** - UUID system

## 🎉 Ready to Use

All changes are complete! The system now:
- ✅ Sends correct format to device API
- ✅ Includes all required and optional fields
- ✅ Captures and validates face photos properly
- ✅ Auto-generates person_uuid
- ✅ Saves all data to database

## 🐛 Troubleshooting

**If device registration fails:**

1. Check device API URL in facility configuration
2. Verify device server is running
3. Check network tab for error details
4. Verify field names match device expectations
5. Check if device requires authentication token

**Common errors:**

- `400 Bad Request` - Invalid data format
- `401 Unauthorized` - Missing/invalid auth token
- `409 Conflict` - User already exists
- `500 Server Error` - Device server error

## 📞 Support

See detailed guides:
- Device API format: `DEVICE_API_V2.md`
- Camera issues: `CAMERA_FIX_NOTES.md`
- Face capture: `FACE_CAPTURE_GUIDE.md`
