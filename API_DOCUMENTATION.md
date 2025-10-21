# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "super-admin|admin|manager|hr|viewer"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "username": "string",
      "email": "string",
      "role": "string",
      "permissions": ["array"]
    },
    "token": "jwt_token_here"
  }
}
```

## Employees

### Get All Employees
```http
GET /employees?page=1&limit=20&search=keyword&facility=id&status=active
```

### Create Employee
```http
POST /employees
Content-Type: application/json

{
  "employeeId": "EMP001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "facility": "facility_id",
  "department": "IT",
  "designation": "Developer",
  "shift": "shift_id",
  "deviceId": "DEVICE001",
  "joiningDate": "2025-01-01",
  "status": "active"
}
```

## Attendance

### Get Attendance Records
```http
GET /attendance?startDate=2025-01-01&endDate=2025-01-31&facility=id&status=present
```

### Create Manual Attendance
```http
POST /attendance
Content-Type: application/json

{
  "employee": "employee_id",
  "facility": "facility_id",
  "date": "2025-01-01",
  "shift": "shift_id",
  "scheduledCheckIn": "2025-01-01T09:00:00Z",
  "scheduledCheckOut": "2025-01-01T17:00:00Z",
  "checkIn": {
    "time": "2025-01-01T09:05:00Z",
    "method": "fingerprint"
  },
  "checkOut": {
    "time": "2025-01-01T17:00:00Z",
    "method": "fingerprint"
  },
  "status": "present"
}
```

## Facilities

### Create Facility
```http
POST /facilities
Content-Type: application/json

{
  "name": "Facility 1",
  "code": "FAC001",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "deviceApiUrl": "http://device-server.com/api/attendance",
  "deviceApiKey": "optional_api_key",
  "timezone": "America/New_York",
  "status": "active",
  "configuration": {
    "autoSync": true,
    "syncInterval": 5,
    "maxRetries": 3
  }
}
```

### Trigger Manual Sync
```http
POST /facilities/:id/sync
```

## Shifts

### Create Shift
```http
POST /shifts
Content-Type: application/json

{
  "name": "Morning Shift",
  "code": "MORN",
  "facility": "facility_id",
  "startTime": "09:00",
  "endTime": "17:00",
  "workingHours": 8,
  "graceTime": {
    "checkIn": 15,
    "checkOut": 15
  },
  "breakTime": 60,
  "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "isOvernight": false,
  "color": "#3498db",
  "status": "active"
}
```

## Reports

### Daily Report
```http
GET /reports/daily?date=2025-01-01&facility=id
```

### Monthly Report
```http
GET /reports/monthly?month=1&year=2025&facility=id
```

### Custom Report
```http
GET /reports/custom?startDate=2025-01-01&endDate=2025-01-31&facility=id&department=IT
```

## Analytics

### Dashboard Analytics
```http
GET /analytics/dashboard?facility=id&startDate=2025-01-01&endDate=2025-01-31
```

Response includes:
- Summary statistics
- Monthly attendance breakdown
- 7-day attendance trend
- Top late comers
- Facility-wise attendance

### Employee Performance
```http
GET /analytics/employee-performance?facility=id&startDate=2025-01-01&endDate=2025-01-31&limit=10
```

### Overtime Report
```http
GET /analytics/overtime?facility=id&startDate=2025-01-01&endDate=2025-01-31
```

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Rate Limiting

API endpoints are rate-limited to 100 requests per 15 minutes per IP address.

## Data Sync Process

The system automatically syncs with device servers. Device servers should return data in this format:

```json
[
  {
    "employeeId": "EMP001",
    "deviceId": "DEVICE001",
    "timestamp": "2025-01-01T09:05:00Z",
    "type": "in|out",
    "method": "fingerprint|face|card",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  }
]
```

The sync service will:
1. Fetch data from the device API
2. Match records to employees by deviceId or employeeId
3. Create/update attendance records
4. Calculate work hours, overtime, and late arrivals
5. Update facility sync status
