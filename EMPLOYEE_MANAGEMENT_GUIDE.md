# Employee Management API Testing Guide

## 🚀 Service Status
✅ **Java Service Running**: `http://localhost:8081`  
✅ **Device Connected**: XO5 device with heartbeat active  
✅ **Employee Controller**: Full face enrollment functionality

## 📋 Available Employee Endpoints

### 1. Register Employee to Device (POST)
**Endpoint**: `POST http://localhost:8081/api/employee/register`  
**Description**: Register employee with face enrollment to physical device  
**Headers**: `Content-Type: application/json`

**Request Body**:
```json
{
  "personId": "EMP001",
  "name": "John Doe",
  "faceImages": ["data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."], 
  "deviceKey": "020e7096a03c670f63",
  "secret": "123456",
  "email": "john.doe@company.com",
  "department": "Engineering",
  "position": "Software Developer",
  "verificationStyle": 0
}
```

**Parameters**:
- `personId` (required): Unique employee ID
- `name` (required): Employee full name
- `faceImages` (required): Array of Base64 encoded face images
- `deviceKey` (required): Device authentication key
- `secret` (required): Device secret
- `email` (optional): Employee email
- `department` (optional): Employee department
- `position` (optional): Employee position
- `verificationStyle` (optional): 0=face only, 1=face+card, 2=any

**Success Response**:
```json
{
  "code": "000",
  "msg": "Employee successfully registered to device",
  "data": {
    "personId": "EMP001",
    "name": "John Doe",
    "enrollmentStatus": "success",
    "deviceResponse": {...}
  },
  "success": true
}
```

### 2. Get All Employees (POST)
**Endpoint**: `POST http://localhost:8081/api/employee/list`  
**Description**: Retrieve all employees from device  

**Request Body**:
```json
{
  "deviceKey": "020e7096a03c670f63",
  "secret": "123456"
}
```

### 3. Find Specific Employee (POST)
**Endpoint**: `POST http://localhost:8081/api/employee/find/{personId}`  
**Description**: Get specific employee details from device  

**Request Body**:
```json
{
  "deviceKey": "020e7096a03c670f63",
  "secret": "123456"
}
```

### 4. Delete Employee (POST)
**Endpoint**: `POST http://localhost:8081/api/employee/delete/{personId}`  
**Description**: Remove employee from device  

**Request Body**:
```json
{
  "deviceKey": "020e7096a03c670f63",
  "secret": "123456"
}
```

### 5. Clear All Employees (POST)
**Endpoint**: `POST http://localhost:8081/api/employee/clear-all`  
**Description**: Remove all employees from device (use with caution)  

**Request Body**:
```json
{
  "deviceKey": "020e7096a03c670f63",
  "secret": "123456"
}
```

## 🧪 Testing Steps

### Step 1: Test Device Connection
First verify device is connected:
```bash
curl -X POST http://localhost:8081/api/test \
  -H "Content-Type: application/json" \
  -d '{"deviceKey":"020e7096a03c670f63","secret":"123456"}'
```

### Step 2: Check Current Employee Count
```bash
curl -X POST http://localhost:8081/api/employee/list \
  -H "Content-Type: application/json" \
  -d '{"deviceKey":"020e7096a03c670f63","secret":"123456"}'
```

### Step 3: Register Test Employee
Create a test employee with face image:
```json
{
  "personId": "TEST001",
  "name": "Test Employee",
  "faceImages": ["iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="],
  "deviceKey": "020e7096a03c670f63",
  "secret": "123456",
  "email": "test@example.com",
  "department": "IT",
  "verificationStyle": 0
}
```

### Step 4: Verify Registration
Check the physical device to confirm the employee appears in the device interface.

### Step 5: Test Other Operations
- Find the employee
- Update employee (via register with same ID)  
- Delete employee

## 🔧 Face Image Requirements

### Image Format
- **Format**: JPEG, PNG supported
- **Encoding**: Base64 string
- **Size**: Recommended 150x150 to 400x400 pixels
- **Quality**: High quality, well-lit face image

### Base64 Encoding Examples
```javascript
// From file input in web app
const file = document.getElementById('faceImage').files[0];
const reader = new FileReader();
reader.onload = function(e) {
  const base64 = e.target.result; // includes data:image/jpeg;base64, prefix
  // Send this to API
};
reader.readAsDataURL(file);
```

### Sample Test Image (1x1 pixel for testing)
```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==
```

## 📱 MERN App Integration

### Frontend (React) Example
```javascript
const registerEmployee = async (employeeData) => {
  const response = await fetch('http://localhost:8081/api/employee/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personId: employeeData.id,
      name: employeeData.name,
      faceImages: [employeeData.faceImage], // Base64 string
      deviceKey: '020e7096a03c670f63',
      secret: '123456',
      email: employeeData.email,
      department: employeeData.department,
      position: employeeData.position,
      verificationStyle: 0
    })
  });
  
  const result = await response.json();
  return result;
};
```

### Backend (Node.js) Example
```javascript
app.post('/api/employees/register-to-device', async (req, res) => {
  try {
    const { employeeId, name, faceImage, email, department } = req.body;
    
    // Call Java service
    const response = await axios.post('http://localhost:8081/api/employee/register', {
      personId: employeeId,
      name: name,
      faceImages: [faceImage],
      deviceKey: '020e7096a03c670f63',
      secret: '123456',
      email: email,
      department: department,
      verificationStyle: 0
    });
    
    if (response.data.success) {
      // Save to MongoDB
      const employee = new Employee({
        employeeId,
        name,
        email,
        department,
        deviceEnrolled: true,
        enrolledAt: new Date()
      });
      await employee.save();
      
      res.json({ success: true, message: 'Employee registered successfully' });
    } else {
      res.status(400).json({ success: false, message: response.data.msg });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

## ⚠️ Error Codes

| Code | Description |
|------|-------------|
| 000  | Success |
| 1001 | Invalid request parameters |
| 1002 | Device connectivity failed |
| 1003 | Device operation failed |
| 1004 | Employee creation/update failed |
| 1200 | Employee not found |
| 1201 | Employee already exists |
| 1404 | Employee not found |

## 📝 Notes

1. **Device Credentials**: Use your actual device key and secret
2. **Face Images**: Ensure good quality, well-lit face images
3. **Person ID**: Must be unique across all employees
4. **Verification**: Always check the physical device after registration
5. **Error Handling**: Implement proper error handling in your MERN app

## 🔄 Integration Flow

1. **MERN App** → Employee registration form
2. **React Frontend** → Capture face image, convert to Base64
3. **Node.js Backend** → Validate data, call Java API
4. **Java Service** → Register to XO5 device
5. **Device Response** → Confirm enrollment success
6. **MongoDB** → Save employee record
7. **Frontend** → Show success/error message

The employee will now appear on the physical XO5 device and can be used for face recognition attendance!