# Device Management API Testing Guide

## Service Information
- **Base URL**: `http://localhost:8081`
- **Service Status**: ✅ Running on port 8081
- **Available Controllers**: DeviceManagementController, TestController

## Available Endpoints

### DeviceManagementController (`/api/device`)

### 1. Get Device Methods (GET)
**Endpoint**: `GET http://localhost:8081/api/device/methods`
**Description**: Returns all available SDK methods for the device
**Headers**: None required
**Body**: None

### 2. Device Information (POST)
**Endpoint**: `POST http://localhost:8081/api/device/info`
**Description**: Get device information
**Headers**: `Content-Type: application/json`
**Body**:
```json
{
  "deviceKey": "your_device_key",
  "secret": "your_device_secret"
}
```

### 3. Device Status (POST)
**Endpoint**: `POST http://localhost:8081/api/device/status`
**Description**: Get device status
**Headers**: `Content-Type: application/json`
**Body**:
```json
{
  "deviceKey": "your_device_key",
  "secret": "your_device_secret"
}
```

### 4. Device Reboot (POST)
**Endpoint**: `POST http://localhost:8081/api/device/reboot`
**Description**: Reboot the device
**Headers**: `Content-Type: application/json`
**Body**:
```json
{
  "deviceKey": "your_device_key",
  "secret": "your_device_secret"
}
```

### 5. Device Configuration (POST)
**Endpoint**: `POST http://localhost:8081/api/device/config`
**Description**: Configure device settings
**Headers**: `Content-Type: application/json`
**Body**:
```json
{
  "deviceKey": "your_device_key",
  "secret": "your_device_secret",
  "config": {
    "setting1": "value1",
    "setting2": "value2"
  }
}
```

### 6. Sync Device Time (POST)
**Endpoint**: `POST http://localhost:8081/api/device/sync-time`
**Description**: Synchronize device time with server
**Headers**: `Content-Type: application/json`
**Body**:
```json
{
  "deviceKey": "your_device_key",
  "secret": "your_device_secret"
}
```

### 7. Device Details (POST)
**Endpoint**: `POST http://localhost:8081/api/device/details`
**Description**: Get detailed device information
**Headers**: `Content-Type: application/json`
**Body**:
```json
{
  "deviceKey": "your_device_key",
  "secret": "your_device_secret"
}
```

## TestController Endpoints (`/api`)

### 8. Health Check (GET)
**Endpoint**: `GET http://localhost:8081/api/health`
**Description**: Check service health
**Headers**: None required
**Body**: None

### 9. Service Info (GET)
**Endpoint**: `GET http://localhost:8081/api/info`
**Description**: Get service information
**Headers**: None required
**Body**: None

### 10. Test Device Connection (POST)
**Endpoint**: `POST http://localhost:8081/api/test`
**Description**: Test device connectivity
**Headers**: `Content-Type: application/json`
**Body**:
```json
{
  "deviceKey": "your_device_key",
  "secret": "your_device_secret"
}
```

### 11. Get Device Info (POST)
**Endpoint**: `POST http://localhost:8081/api/get`
**Description**: Get device information via test controller
**Headers**: `Content-Type: application/json`
**Body**:
```json
{
  "deviceKey": "your_device_key",
  "secret": "your_device_secret"
}
```

### 12. Reboot Device (POST)
**Endpoint**: `POST http://localhost:8081/api/reboot`
**Description**: Reboot device via test controller
**Headers**: `Content-Type: application/json`
**Body**:
```json
{
  "deviceKey": "your_device_key",
  "secret": "your_device_secret"
}
```

### 13. Device Status (GET)
**Endpoint**: `GET http://localhost:8081/api/status`
**Description**: Get device status via test controller
**Headers**: None required
**Body**: None

## Sample Device Credentials
Based on previous configurations:
```json
{
  "deviceKey": "your_actual_device_key",
  "secret": "your_actual_device_secret"
}
```

## Testing Steps in Postman

1. **Start with simple GET endpoints** (no auth required):
   - `GET http://localhost:8081/api/device/methods` - Shows SDK methods
   - `GET http://localhost:8081/api/health` - Service health check
   - `GET http://localhost:8081/api/info` - Service information
   - `GET http://localhost:8081/api/status` - Device status (test controller)

2. **Test device connectivity** with credentials:
   - `POST http://localhost:8081/api/test` - Basic connectivity test
   - Use your actual device credentials

3. **Get device information**:
   - `POST http://localhost:8081/api/device/info` - Full device info
   - `POST http://localhost:8081/api/get` - Device info via test controller

4. **Test other device operations** progressively:
   - `POST http://localhost:8081/api/device/status` - Device status
   - `POST http://localhost:8081/api/device/sync-time` - Time sync
   - `POST http://localhost:8081/api/device/config` - Configuration
   - `POST http://localhost:8081/api/device/details` - Detailed info

5. **Be careful with reboot endpoints** (these restart the device):
   - `POST http://localhost:8081/api/device/reboot` - Main reboot
   - `POST http://localhost:8081/api/reboot` - Test controller reboot

## Expected Response Format
All endpoints return responses in this format:
```json
{
  "code": "000",
  "msg": "Success message",
  "data": {
    // Response data here
  }
}
```

## Error Responses
```json
{
  "code": "error_code",
  "msg": "Error message description",
  "data": null
}
```

## Notes
- Replace `your_device_key` and `your_device_secret` with actual credentials
- The device IP is configured as `192.168.11.201:8090`
- Success response code is "000"
- The service logs will show detailed information about each request