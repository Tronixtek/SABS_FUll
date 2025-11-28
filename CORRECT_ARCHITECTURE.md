# 🏗️ SABS Correct Architecture

## ✅ **Correct Data Flow:**

```
┌─────────────────┐    HTTPS     ┌──────────────────────┐    HTTP     ┌─────────────────┐    HTTP     ┌──────────────┐
│  React Frontend │ ────────────► │ sabs-backend.hefrias │ ───────────► │   Node.js API   │ ───────────► │ Java Service │
│   (Your Domain) │              │  .ng (Nginx + SSL)   │             │   (Port 5000)   │             │ (Port 8081)  │
└─────────────────┘              └──────────────────────┘             └─────────────────┘             └──────────────┘
                                            │                                    │                             │
                                            │                                    │                             │
                                     ┌──────▼──────┐                    ┌───────▼────────┐             ┌──────▼──────┐
                                     │ SSL Termination │                │   MongoDB       │             │ XO5 Devices │
                                     │ (Let's Encrypt) │                │   Database      │             │ (TCP:10010) │
                                     └─────────────────┘                └────────────────┘             └─────────────┘
```

## 🔄 **Communication Pattern:**

### **Frontend → Node.js (HTTPS)**
```javascript
// React makes API calls to Node.js only
axios.get('https://sabs-backend.hefrias.ng/api/employees')
axios.post('https://sabs-backend.hefrias.ng/api/attendance')
```

### **Node.js → Java (HTTP - Internal)**
```javascript
// Node.js internally communicates with Java service
const javaResponse = await axios.post('http://127.0.0.1:8081/api/employee/enroll', data);
```

### **Java → XO5 Devices (TCP)**
```java
// Java service communicates with biometric devices
HfDeviceClient.enrollEmployee(hostInfo, deviceKey, employeeData);
```

### **XO5 → Node.js (HTTP Webhook)**
```
// Devices send attendance data directly to Node.js
POST http://127.0.0.1:5000/api/xo5/record
```

## 🌐 **Nginx Configuration (Simplified):**

```nginx
server {
    listen 443 ssl;
    server_name sabs-backend.hefrias.ng;
    
    # Only Node.js API proxy needed
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        # CORS and headers...
    }
    
    # No Java proxy needed - internal communication only
}
```

## 📱 **Environment Variables:**

### **React Frontend**
```env
# Only one API URL needed
REACT_APP_API_URL=https://sabs-backend.hefrias.ng/api
```

### **Node.js Backend**
```env
# Internal Java service communication
JAVA_SERVICE_URL=http://127.0.0.1:8081
XO5_WEBHOOK_URL=https://sabs-backend.hefrias.ng/api/xo5/record
```

### **Java Service**
```env
# Internal Node.js communication
MERN_BACKEND_URL=http://127.0.0.1:5000
```

## ✅ **Benefits of This Architecture:**

1. **🔒 Secure External Communication** - Frontend to backend over HTTPS
2. **⚡ Fast Internal Communication** - Backend services use HTTP locally
3. **🛡️ Security Isolation** - Java service not exposed to internet
4. **🎯 Single API Endpoint** - Frontend only needs one URL
5. **📡 Efficient Data Flow** - No unnecessary external Java calls

## 🚨 **Important Notes:**

- **Frontend NEVER calls Java directly** ❌
- **All Java operations go through Node.js** ✅
- **Only Node.js API is exposed via HTTPS** ✅
- **Java service runs internally for device communication** ✅

This is the correct and secure architecture! 🎉