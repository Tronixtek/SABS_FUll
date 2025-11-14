# Face Merge Testing with Postman

## Setup Instructions

1. **Start the Service**: Ensure your Spring Boot service is running on `http://localhost:8081`
2. **Open Postman**: Create a new collection called "Enhanced Face Merge Testing"

## Test Cases

### 1. Test Enhanced Face Merge - New Employee (Face Only)

**Method**: `POST`  
**URL**: `http://localhost:8081/api/employee/register`  
**Headers**:
```
Content-Type: application/json
Accept: application/json
```

**Body** (JSON):
```json
{
    "employeeId": "EP0025",
    "fullName": "Test Enhanced User",
    "email": "enhanced@test.com",
    "department": "Engineering",
    "position": "Test Engineer", 
    "deviceKey": "020e7096a03c670f63",
    "secret": "123456",
    "verificationStyle": 1,
    "faceImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/gA",
    "forceUpdate": false
}
```

**Expected**: Should test face-only verification (verificationStyle: 1)

---

### 1b. Test Enhanced Face Merge - New Employee (Face + Password)

**Method**: `POST`  
**URL**: `http://localhost:8081/api/employee/register`  
**Headers**:
```
Content-Type: application/json
Accept: application/json
```

**Body** (JSON):
```json
{
    "employeeId": "EP0030",
    "fullName": "Test Face+Password User",
    "email": "facepass@test.com",
    "department": "Security",
    "position": "Security Officer", 
    "deviceKey": "020e7096a03c670f63",
    "secret": "123456",
    "verificationStyle": 8,
    "faceImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/gA",
    "forceUpdate": false
}
```

**Expected**: Should test face+password verification (verificationStyle: 8)

---

### 1c. Test Enhanced Face Merge - New Employee (Face Recognition)

**Method**: `POST`  
**URL**: `http://localhost:8081/api/employee/register`  
**Headers**:
```
Content-Type: application/json
Accept: application/json
```

**Body** (JSON):
```json
{
    "employeeId": "EP0031",
    "fullName": "Test Face Recognition User",
    "email": "facerec@test.com",
    "department": "Operations",
    "position": "Operations Manager", 
    "deviceKey": "020e7096a03c670f63",
    "secret": "123456",
    "verificationStyle": 3,
    "faceImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/gA",
    "forceUpdate": false
}
```

**Expected**: Should test face recognition verification (verificationStyle: 3)

---

### 2. Test Force Update - Existing Employee

**Method**: `POST`  
**URL**: `http://localhost:8081/api/employee/register`  
**Headers**:
```
Content-Type: application/json
Accept: application/json
```

**Body** (JSON):
```json
{
    "employeeId": "EP0025",
    "fullName": "Test Enhanced User Updated",
    "email": "enhanced.updated@test.com", 
    "department": "Engineering",
    "position": "Senior Test Engineer",
    "deviceKey": "020e7096a03c670f63",
    "secret": "123456",
    "verificationStyle": 8,
    "faceImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/gA",
    "forceUpdate": true
}
```

**Expected**: Should update existing employee with new verification style (face+password)

---

### 3. Test Invalid Base64 Image

**Method**: `POST`  
**URL**: `http://localhost:8081/api/employee/register`  
**Headers**:
```
Content-Type: application/json
Accept: application/json
```

**Body** (JSON):
```json
{
    "employeeId": "EP0026",
    "fullName": "Test Invalid Image User",
    "email": "invalid@test.com",
    "department": "QA",
    "position": "QA Engineer",
    "deviceKey": "020e7096a03c670f63", 
    "secret": "123456",
    "verificationStyle": 3,
    "faceImage": "invalid-base64-data-here",
    "forceUpdate": false
}
```

**Expected**: Should return validation error for invalid Base64

---

### 4. Test Missing Face Image

**Method**: `POST`  
**URL**: `http://localhost:8081/api/employee/register`  
**Headers**:
```
Content-Type: application/json
Accept: application/json
```

**Body** (JSON):
```json
{
    "employeeId": "EP0027",
    "fullName": "Test No Image User", 
    "email": "noimage@test.com",
    "department": "Marketing",
    "position": "Marketing Specialist",
    "deviceKey": "020e7096a03c670f63",
    "secret": "123456",
    "verificationStyle": 3,
    "forceUpdate": false
}
```

**Expected**: Should return error about missing face image

---

### 5. Test Wrong Device Credentials

**Method**: `POST`  
**URL**: `http://localhost:8081/api/employee/register`  
**Headers**:
```
Content-Type: application/json
Accept: application/json
```

**Body** (JSON):
```json
{
    "employeeId": "EP0028",
    "fullName": "Test Wrong Creds User",
    "email": "wrongcreds@test.com", 
    "department": "IT",
    "position": "IT Specialist",
    "deviceKey": "wrong-device-key",
    "secret": "wrong-secret",
    "verificationStyle": 3,
    "faceImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/gA",
    "forceUpdate": false
}
```

**Expected**: Should return device authentication error

---

## What to Look For

### Success Indicators:
- ✅ HTTP 200 status
- ✅ Response contains `"success": true`
- ✅ Response includes `personSn` from device
- ✅ Face merge completed without errors

### Enhanced Features Being Tested:
- 🔍 **Image Processing**: Base64 validation and cleanup
- 🔄 **Retry Logic**: 3 attempts with exponential backoff  
- 📏 **Size Validation**: 1KB - 2MB image size limits
- 🖼️ **Format Detection**: JPEG/PNG compatibility checks
- ⚡ **Error Handling**: Enhanced diagnostics for codes 101007, 101010, 1500
- 👤 **Validation**: Employee duplicate detection with forceUpdate
- 🔐 **Verification Styles**: 
  - 1 = Face only
  - 3 = Face recognition  
  - 8 = Face + password
  - Custom values supported

### Common Error Responses:
- `400 Bad Request`: Invalid input data
- `500 Internal Server Error`: Device communication issues
- Custom validation errors from enhanced processing

## Quick Start:
1. Start service: `mvn spring-boot:run` in java-attendance-service folder
2. Import these requests into Postman
3. Run Test Case #1 first to verify basic functionality
4. Then test other scenarios to verify enhancements