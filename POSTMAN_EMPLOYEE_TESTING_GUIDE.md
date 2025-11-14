# 🧪 XO5 Employee Management API Testing Guide

## 📋 **Setup Instructions**

### 1. Import Postman Collection
1. Open Postman
2. Click **Import** button
3. Select **File** tab
4. Choose: `XO5_Employee_Management_Postman.json`
5. Click **Import**

### 2. Environment Setup
The collection includes these variables:
- **baseUrl**: `http://localhost:8081`
- **deviceKey**: `020e7096a03c670f63`
- **secret**: `123456`

---

## 🚀 **Testing Sequence**

### **Step 1: Verify Server Health**

#### **Health Check**
```
GET http://localhost:8081/api/health
```
**Expected Response:**
```json
{
    "code": "0000",
    "msg": "Successful",
    "data": null
}
```

#### **Server Info**
```
GET http://localhost:8081/api/info
```
**Expected Response:**
```json
{
    "code": "0000",
    "msg": "Successful",
    "data": "Gateway Host: 192.168.0.169, SDK Port: 10011, API Server: Cloud Ready"
}
```

---

### **Step 2: Device Connection Tests**

#### **Test Device Connection**
```
POST http://localhost:8081/api/test
Content-Type: application/json

{
  "deviceKey": "020e7096a03c670f63",
  "secret": "123456"
}
```
**Expected Response:**
```json
{
    "code": "0000",
    "msg": "Successful",
    "data": {...}
}
```

#### **Get Device Information**
```
POST http://localhost:8081/api/get
Content-Type: application/json

{
  "deviceKey": "020e7096a03c670f63",
  "secret": "123456"
}
```
**Expected Response:**
```json
{
    "code": "0000",
    "msg": "Successful", 
    "data": {
        "channel": "00XA0",
        "cpu": "[arm64-v8a, armeabi-v7a, armeabi]",
        "deviceKey": "020e7096a03c670f63",
        "faceAlgorithmVersion": "V3.8.2",
        "fingerCount": 11,
        "firmwareVersion": "v1.1.0-20250220",
        "personCount": 4,
        "photoCount": 2,
        ...
    }
}
```

#### **Device Status**
```
GET http://localhost:8081/api/status?deviceKey=020e7096a03c670f63&secret=123456
```
**Expected Response:**
```json
{
    "code": "0000",
    "msg": "Successful",
    "data": {
        "deviceKey": "020e7096a03c670f63",
        "connected": true,
        "status": "Connected",
        "timestamp": 1699477200000,
        "responseCode": "0000",
        "responseMessage": "Successful"
    }
}
```

---

### **Step 3: Employee Management Tests**

#### **List Current Employees**
```
POST http://localhost:8081/api/device/list
Content-Type: application/json

{
  "deviceKey": "020e7096a03c670f63",
  "secret": "123456"
}
```
**Expected Response:**
```json
{
    "code": "0000",
    "msg": "Successful",
    "data": {
        "personCount": 4,
        "deviceInfo": {...}
    }
}
```

#### **Add New Employee (Without Face)**
```
POST http://localhost:8081/api/employee/sync
Content-Type: application/json

{
  "employeeId": "EMP001",
  "fullName": "John Doe",
  "deviceKey": "020e7096a03c670f63",
  "secret": "123456",
  "faceImage": null
}
```

#### **Add New Employee (With Face)**
```
POST http://localhost:8081/api/employee/sync
Content-Type: application/json

{
  "employeeId": "EMP002",
  "fullName": "Jane Smith",
  "deviceKey": "020e7096a03c670f63",
  "secret": "123456",
  "faceImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
}
```
*Note: Replace with actual base64 encoded face image*

#### **Update Employee**
```
PUT http://localhost:8081/api/employee/update
Content-Type: application/json

{
  "employeeId": "EMP001",
  "fullName": "John Doe Updated",
  "deviceKey": "020e7096a03c670f63",
  "secret": "123456",
  "faceImage": null
}
```

#### **Remove Employee**
```
DELETE http://localhost:8081/api/employee/remove
Content-Type: application/json

{
  "employeeId": "EMP001",
  "deviceKey": "020e7096a03c670f63",
  "secret": "123456"
}
```

---

## 🔍 **Expected Success Responses**

### **Successful Employee Operations:**
```json
{
    "code": "0000",
    "msg": "Successful",
    "data": {
        "employeeId": "EMP001",
        "operation": "sync/update/remove",
        "status": "completed",
        "deviceResponse": {...}
    }
}
```

### **Device Communication Success:**
```json
{
    "code": "0000",
    "msg": "Successful", 
    "data": {...}
}
```

---

## ❌ **Common Error Responses**

### **Validation Errors:**
```json
{
    "code": "1000",
    "msg": "Validation failed: deviceKey must be at least 16 characters and secret cannot be empty",
    "data": null
}
```

### **Device Communication Errors:**
```json
{
    "code": "1002",
    "msg": "Device communication error: Connection refused",
    "data": null
}
```

### **Employee Operation Errors:**
```json
{
    "code": "2001", 
    "msg": "Employee sync failed: Invalid employee data",
    "data": null
}
```

---

## 📊 **Testing Checklist**

- [ ] ✅ Health check passes
- [ ] ✅ Server info retrieved
- [ ] ✅ Device connection test successful
- [ ] ✅ Device information retrieved
- [ ] ✅ Device status shows connected
- [ ] ✅ Current employees listed
- [ ] ✅ New employee added without face
- [ ] ✅ New employee added with face
- [ ] ✅ Employee information updated
- [ ] ✅ Employee removed from device
- [ ] ✅ Employee count reflects changes

---

## 🛠️ **Troubleshooting**

### **Connection Issues:**
1. Verify server is running on port 8081
2. Check device heartbeat in server logs
3. Ensure device key and secret are correct

### **Employee Operation Issues:**
1. Check employee ID format (no spaces, valid characters)
2. Verify face image is valid base64 encoding
3. Ensure device has sufficient storage

### **Server Logs:**
Monitor the Java application console for detailed error messages and device communication logs.

---

## 📝 **Notes**

- **Device Key**: `020e7096a03c670f63` (your specific XO5 device)
- **Secret**: `123456` (default secret)
- **Face Images**: Must be base64 encoded JPEG format
- **Employee IDs**: Should be unique and alphanumeric
- **Real-time Updates**: Check server console for immediate feedback

This testing guide covers all the employee management functionality we've built. Start with the health checks and work your way through the employee operations!