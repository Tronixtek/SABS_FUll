# 🧪 Frontend Testing Guide: Two-Way Communication Integration

## 📋 Pre-Testing Setup

### **1. Start All Services**

#### **Terminal 1: Java XO5 Service**
```bash
cd "C:\Users\PC\Desktop\attendance tracking system - Copy\java-attendance-service"
mvn spring-boot:run
```
**Expected Output:**
```
Started DemoApplication in X.xxx seconds
XO5 Device connection: SUCCESS
Server running on port: 8081
```

#### **Terminal 2: Node.js Backend**
```bash
cd "C:\Users\PC\Desktop\attendance tracking system - Copy\server"
npm install  # If not already done
npm start
```
**Expected Output:**
```
✅ MongoDB Connected Successfully
🚀 Server running on port 3001
Java Integration Endpoints Ready
```

#### **Terminal 3: React Frontend**
```bash
cd "C:\Users\PC\Desktop\attendance tracking system - Copy\client"
npm install  # If not already done
npm start
```
**Expected Output:**
```
Compiled successfully!
Local:            http://localhost:3000
```

### **2. Verify Service Health**

**Check Java Service:**
```bash
curl http://localhost:8081/api/device/health
```

**Check Node.js Backend:**
```bash
curl http://localhost:3001/api/health
```

---

## 🔬 Test Cases

### **Test Case 1: Successful Employee Registration with Two-Way Sync**

#### **Steps:**
1. **Open Frontend**: Navigate to `http://localhost:3000/employees`
2. **Check Integration Mode**: Ensure dropdown shows "Java XO5 (Two-way)"
3. **Click "Add Employee"**
4. **Fill Form:**
   - Employee ID: `TEST_001`
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `john.doe@test.com`
   - Department: `IT`
5. **Capture Face:**
   - Click "Start Camera"
   - Allow camera permissions
   - Position face in circle guide
   - Click "Capture Photo"
6. **Submit Registration:**
   - Click "Register to XO5 & Database"
   - Watch status indicators in real-time

#### **Expected Results:**
- **Registration Status Panel Appears**
- **XO5 Device Sync: ✅ Success** (green checkmark)
- **Database Save: ✅ Success** (green checkmark)
- **Message: "Employee successfully registered to device and database!"**
- **Toast: "Employee registration complete!"**
- **Modal Closes Automatically**

#### **Backend Logs to Verify:**

**Java Service Console:**
```
=== EMPLOYEE SYNC REQUEST ===
Request: EmployeeSyncRequest{employeeId='TEST_001', fullName='John Doe'...}
DEBUG - Device sync successful, notifying MERN backend for database save
DEBUG - MERN backend confirmed employee saved to database
```

**Node.js Backend Console:**
```
=== DEVICE SYNC SUCCESS ===
Employee Data: { employeeId: 'TEST_001', fullName: 'John Doe'... }
Employee saved to database: 674abc123def456789
```

---

### **Test Case 2: Device Sync Failure (Bad Credentials)**

#### **Steps:**
1. **Temporarily Stop XO5 Device** (disconnect network or stop device)
2. **Add New Employee:**
   - Employee ID: `TEST_FAIL_001`
   - Name: `Jane Smith`
   - Capture face photo
3. **Submit Registration**
4. **Observe Failure Handling**

#### **Expected Results:**
- **Registration Status Panel Appears**
- **XO5 Device Sync: ❌ Error** (red X)
- **Database Save: Not Attempted** (no indicator)
- **Error Message: "Device sync failed - database save prevented"**
- **Toast: "Registration failed: Device sync error"**

---

### **Test Case 3: Compare Legacy vs Java Integration**

#### **Steps:**
1. **Switch to Legacy Mode:**
   - Change dropdown to "Legacy (Direct)"
   - Add employee with same process
2. **Switch to Java Integration:**
   - Change dropdown to "Java XO5 (Two-way)"
   - Add employee with new process
3. **Compare Behaviors**

#### **Expected Differences:**

**Legacy Mode:**
- Direct API call to device
- No transaction integrity
- Immediate database save regardless of device status
- Single success/failure response

**Java XO5 Mode:**
- Two-way communication flow
- Transaction integrity maintained
- Real-time status updates
- Database save only after device confirmation

---

### **Test Case 4: Network Connectivity Testing**

#### **Test Scenario A: Java Service Unavailable**
```bash
# Stop Java service
# Try to register employee
# Expected: Clear error message about service unavailability
```

#### **Test Scenario B: Database Unavailable**
```bash
# Stop MongoDB
# Try to register employee
# Expected: Device sync succeeds, database save fails, rollback triggered
```

---

## 🔍 Debugging & Monitoring

### **Browser Developer Tools**

**1. Open Network Tab:**
- Monitor API calls to both Java and Node.js services
- Check request/response payloads
- Verify correct endpoints are called

**2. Console Logs:**
- Watch for integration flow messages
- Check for any JavaScript errors
- Monitor real-time status updates

### **API Call Sequence Verification**

**Expected Network Requests:**
1. `POST /api/employee/sync` → Java Service (Port 8081)
2. `POST /api/employees/device-sync-success` → Node.js (Port 3001)
3. Modal refresh → Employee list updated

---

## 🚨 Troubleshooting

### **Issue: Camera Not Working**
**Solution:**
- Check browser permissions
- Ensure HTTPS or localhost
- Try different browsers (Chrome/Firefox)

### **Issue: Java Service Connection Failed**
**Solution:**
```bash
# Check if Java service is running
curl http://localhost:8081/api/device/health

# Check port conflicts
netstat -an | findstr 8081

# Restart Java service
mvn spring-boot:run
```

### **Issue: Database Connection Failed**
**Solution:**
```bash
# Check MongoDB status
# Verify connection string in Node.js
# Check server logs for DB errors
```

### **Issue: Device Sync Always Fails**
**Solutions:**
- Verify XO5 device IP address (192.168.0.169)
- Check device credentials in code
- Ensure device is powered on and connected
- Test device connectivity manually

---

## 📊 Success Metrics

### **✅ System Working Correctly When:**
1. **Registration Status Updates in Real-Time**
2. **Database Only Saves After Device Success**
3. **Error Messages Are Clear and Actionable**
4. **Camera Capture Works Smoothly**
5. **Both Services Communicate Properly**

### **📈 Performance Benchmarks:**
- **Camera Start**: < 2 seconds
- **Face Capture**: Instant
- **Device Sync**: < 3 seconds
- **Database Save**: < 1 second
- **Total Registration**: < 6 seconds

---

## 🎯 Testing Checklist

- [ ] Java service starts successfully
- [ ] Node.js backend starts successfully
- [ ] React frontend loads correctly
- [ ] Health check endpoints respond
- [ ] Camera permissions work
- [ ] Face capture functions properly
- [ ] Integration toggle works
- [ ] Successful registration flows correctly
- [ ] Device failure is handled gracefully
- [ ] Database errors are caught and rolled back
- [ ] Network issues are handled properly
- [ ] Status indicators update in real-time
- [ ] Error messages are user-friendly
- [ ] System logs provide debugging info

---

## 📝 Test Data Templates

### **Valid Test Employee:**
```json
{
  "employeeId": "EMP_TEST_001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@company.com",
  "phone": "+1234567890",
  "department": "Engineering",
  "designation": "Software Developer"
}
```

### **Edge Case Test Employee:**
```json
{
  "employeeId": "EMP_SPECIAL_ÄÖÜ", 
  "firstName": "José",
  "lastName": "García-López",
  "email": "jose.garcia@company.com"
}
```

This comprehensive testing approach ensures the two-way communication system works correctly across all scenarios and provides a solid foundation for production deployment.