# Device User Registration API - v2.0

## 📋 Overview
Updated device API format for user/employee registration with biometric data.

## 🔄 API Endpoint

```
POST {facility.configuration.userApiUrl}
Content-Type: application/json
Authorization: Bearer {optional-token}
```

## 📦 Request Body

### Required Format
```json
{
  "name": "required|string",
  "facility": "nullable|string",
  "department": "nullable|string",
  "birth_date": "nullable|date",
  "nation": "nullable|string",
  "id_card": "nullable|string",
  "person_uuid": "nullable|string",
  "pic_info": "nullable|string"
}
```

### Field Details

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | string | ✅ Yes | Full name | "John Doe" |
| `facility` | string | ❌ No | Facility/location | "Main Office" |
| `department` | string | ❌ No | Department | "Engineering" |
| `birth_date` | date | ❌ No | DOB (YYYY-MM-DD) | "1990-05-15" |
| `nation` | string | ❌ No | Nationality | "American" |
| `id_card` | string | ❌ No | National ID/Passport | "ABC123456" |
| `person_uuid` | string | ❌ No | Unique identifier | "1729123-A7B9D" |
| `pic_info` | string | ❌ No | Base64 face image | "data:image/jpeg..." |

## 🔗 Field Mapping

**Employee Model → Device API**

```javascript
{
  name: firstName + " " + lastName,
  facility: facility.name,
  department: department,
  birth_date: dateOfBirth,
  nation: nationality,
  id_card: nationalId,
  person_uuid: deviceId (auto-generated),
  pic_info: profileImage (base64)
}
```

## 💻 Implementation

### Frontend (EmployeeModal.js)

```javascript
const registerToDevice = async (employeeData, faceImage) => {
  const facility = facilities.find(f => f._id === employeeData.facility);
  const personUUID = employeeData.deviceId || generatePersonUUID();

  const devicePayload = {
    name: `${employeeData.firstName} ${employeeData.lastName}`,
    facility: facility.name || null,
    department: employeeData.department || null,
    birth_date: employeeData.dateOfBirth || null,
    nation: employeeData.nationality || null,
    id_card: employeeData.nationalId || null,
    person_uuid: personUUID,
    pic_info: faceImage
  };

  const response = await axios.post(
    facility.configuration.userApiUrl,
    devicePayload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  return { ...response.data, personUUID };
};
```

### Backend (Employee Model)

```javascript
// New fields added
dateOfBirth: { type: Date, required: false },
nationality: { type: String, required: false },
nationalId: { type: String, required: false }
```

## 📝 Example Request

```http
POST https://device.example.com/api/users
Content-Type: application/json

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

## ✅ Example Response

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

## 🔀 Migration from v1.0

### Old Format ❌
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

### New Format ✅
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

## 🆕 Form Fields Added

1. **Date of Birth**
   - Optional date picker
   - Format: YYYY-MM-DD

2. **Nationality**
   - Optional text input
   - Example: "American", "British"

3. **National ID / Passport**
   - Optional text input
   - Example: "ABC123456789"

## 🔐 Security

- Use HTTPS for all API calls
- Optional Bearer token authentication
- Base64 encode face images
- Validate all input data

## 📚 Related Docs

- `FACE_CAPTURE_GUIDE.md` - Face capture workflow
- `CAMERA_FIX_NOTES.md` - Camera troubleshooting
- `PERSON_UUID_UPDATE.md` - UUID generation
- `DEVICE_INTEGRATION.md` - Full device integration guide

## 📅 Updated: October 2025
