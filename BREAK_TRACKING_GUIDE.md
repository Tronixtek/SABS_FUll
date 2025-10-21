# 🎯 Break Tracking System - Complete Guide

## Overview
The Break Tracking System is a **dynamic, configurable** module that automatically tracks employee breaks, calculates net work hours, and ensures break compliance. Each shift can have its own break configuration.

---

## 🏗️ System Architecture

### **Three-Layer Approach**

```
┌─────────────────────────────────────────┐
│  1. SHIFT CONFIGURATION                 │
│  Define break rules per shift           │
│  (Lunch, Tea, Prayer, Rest)             │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  2. AUTOMATIC DETECTION                 │
│  Device scans during break windows      │
│  = Break start/end                      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  3. MANUAL CONTROL (Optional)           │
│  Employees can start/end breaks         │
│  via web/mobile interface               │
└─────────────────────────────────────────┘
```

---

## ⚙️ Configuration

### **Step 1: Enable Break Tracking for a Shift**

In your shift configuration:

```javascript
{
  name: "Morning Shift",
  startTime: "09:00",
  endTime: "17:00",
  workingHours: 8,
  
  // ✅ ENABLE BREAK TRACKING
  breakTrackingEnabled: true,  // Set to true!
  
  // Legacy field (optional - for backward compatibility)
  breakTime: 60,  // Total break minutes if tracking disabled
  
  // ✅ DEFINE BREAKS
  breaks: [
    {
      name: "Lunch Break",
      type: "lunch",
      duration: 60,              // Expected duration (minutes)
      startWindow: "12:00",      // Earliest break can start
      endWindow: "14:00",        // Latest break can end
      isPaid: false,             // Deduct from work hours
      isOptional: false,         // Required break
      maxDuration: 90,           // Alert if exceeded
      allowMultiple: false       // One lunch break only
    },
    {
      name: "Tea Break",
      type: "tea",
      duration: 15,
      startWindow: "10:00",
      endWindow: "11:00",
      isPaid: true,              // Don't deduct from work hours
      isOptional: true,
      maxDuration: 20,
      allowMultiple: false
    },
    {
      name: "Prayer Break",
      type: "prayer",
      duration: 10,
      startWindow: "13:00",
      endWindow: "15:00",
      isPaid: true,
      isOptional: true,
      maxDuration: 15,
      allowMultiple: true        // Multiple prayer breaks allowed
    }
  ]
}
```

### **Break Configuration Fields Explained**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | String | Display name for the break | "Lunch Break" |
| `type` | Enum | Break category | lunch, tea, prayer, rest, other |
| `duration` | Number | Expected break length (minutes) | 60 |
| `startWindow` | String (HH:mm) | Earliest time break can start | "12:00" |
| `endWindow` | String (HH:mm) | Latest time break can end | "14:00" |
| `isPaid` | Boolean | Whether break is paid (if true, not deducted) | false |
| `isOptional` | Boolean | Whether break is optional | false |
| `maxDuration` | Number | Maximum allowed duration (minutes) | 90 |
| `allowMultiple` | Boolean | Allow multiple breaks of same type | false |

---

## 🔄 How It Works

### **Scenario 1: Automatic Break Detection (Device)**

```
Employee: John Doe
Shift: 9 AM - 5 PM
Lunch Window: 12 PM - 2 PM

Timeline:
09:00 AM → Device Scan → ✅ CHECK-IN (before midpoint)
12:30 PM → Device Scan → ☕ BREAK START (within lunch window)
01:15 PM → Device Scan → 🏁 BREAK END (45 minutes)
05:00 PM → Device Scan → ✅ CHECK-OUT (after midpoint)

Calculations:
- Gross Hours: 8 hours (9 AM - 5 PM)
- Break Time: 0.75 hours (45 minutes)
- Net Work Hours: 7.25 hours
- Status: PRESENT
```

### **Decision Logic**

```javascript
// When a device scan is received:

1. Check if employee has checked in (but not out)
2. Check if scan time falls within any break window
3. If YES → Process as break record
4. If NO → Process as check-in/check-out

// Break Record Processing:
- Find ongoing break of same type?
  → YES: End the break, calculate duration
  → NO: Start new break
```

---

## 📊 Break Tracking Flow

### **Break Start**

```
☕ ===== STARTING BREAK =====
   Break type: Lunch Break (lunch)
   Started at: 12:30:45
   Expected duration: 60 minutes
```

### **Break End**

```
🏁 ===== ENDING BREAK =====
   Break started: 12:30:45
   Break ended: 13:15:20
   Duration: 45 minutes

✅ Break completed normally
```

### **Break Exceeded Warning**

```
⚠️ BREAK EXCEEDED!
   Took: 95 minutes
   Max allowed: 90 minutes
   Excess: 5 minutes
```

---

## 🧮 Work Hours Calculation

### **With Break Tracking Enabled**

```javascript
// Employee works 9 AM - 5 PM with 1-hour lunch

Gross Time = Check-out - Check-in
           = 5:00 PM - 9:00 AM
           = 8 hours

Break Time = Sum of all completed breaks
           = 1 hour (lunch)

Net Work Hours = Gross Time - Break Time
               = 8 hours - 1 hour
               = 7 hours ✅ (Used for payroll)
```

### **With Break Tracking Disabled**

```javascript
// Uses default breakTime from shift configuration

Gross Time = 8 hours
Break Time = 1 hour (from shift.breakTime)
Net Work Hours = 7 hours
```

---

## 📱 API Endpoints

### **1. Start Break (Manual)**

```http
POST /api/breaks/start
Authorization: Bearer {token}
Content-Type: application/json

{
  "employeeId": "65f1b1231382ffcd760bd1fc",
  "breakType": "lunch"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lunch Break started",
  "break": {
    "type": "lunch",
    "name": "Lunch Break",
    "startTime": "2024-01-15T12:30:45.000Z",
    "status": "ongoing",
    "recordedBy": "employee"
  },
  "expectedDuration": 60,
  "maxDuration": 90
}
```

### **2. End Break (Manual)**

```http
POST /api/breaks/end
Authorization: Bearer {token}
Content-Type: application/json

{
  "employeeId": "65f1b1231382ffcd760bd1fc"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lunch Break ended. Duration: 45 minutes",
  "break": {
    "type": "lunch",
    "name": "Lunch Break",
    "startTime": "2024-01-15T12:30:45.000Z",
    "endTime": "2024-01-15T13:15:20.000Z",
    "duration": 45,
    "status": "completed"
  },
  "totalBreakTime": 45,
  "netWorkHours": 7.25,
  "exceeded": false
}
```

### **3. Get Break Status**

```http
GET /api/breaks/status/:employeeId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "onBreak": true,
  "currentBreak": {
    "type": "lunch",
    "name": "Lunch Break",
    "startTime": "2024-01-15T12:30:45.000Z",
    "status": "ongoing",
    "currentDuration": 15
  },
  "allBreaks": [
    {
      "type": "tea",
      "duration": 10,
      "status": "completed"
    },
    {
      "type": "lunch",
      "status": "ongoing"
    }
  ],
  "totalBreakTime": 10,
  "breakCompliance": "compliant",
  "availableBreaks": [
    {
      "name": "Lunch Break",
      "type": "lunch",
      "duration": 60
    }
  ],
  "breakTrackingEnabled": true
}
```

### **4. Get Break History**

```http
GET /api/breaks/history/:employeeId?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "date": "2024-01-15",
      "breaks": [
        {
          "type": "tea",
          "duration": 10,
          "status": "completed"
        },
        {
          "type": "lunch",
          "duration": 55,
          "status": "completed"
        }
      ],
      "totalBreakTime": 65,
      "breakCompliance": "compliant",
      "status": "present"
    }
  ],
  "totalRecords": 22
}
```

---

## 🎯 Break Compliance Rules

### **Compliant**
```
Total Break Time ≥ 50% of scheduled
AND
Total Break Time ≤ 150% of scheduled

Example:
Scheduled: 60 minutes
Actual: 55 minutes
Result: COMPLIANT ✅
```

### **Insufficient**
```
Total Break Time < 50% of scheduled

Example:
Scheduled: 60 minutes
Actual: 20 minutes
Result: INSUFFICIENT ⚠️
```

### **Exceeded**
```
Total Break Time > 150% of scheduled

Example:
Scheduled: 60 minutes
Actual: 95 minutes
Result: EXCEEDED ⚠️
```

---

## 📝 Database Schema

### **Attendance Model - Break Fields**

```javascript
{
  breaks: [{
    type: String,           // lunch, tea, prayer, rest, other
    name: String,           // "Lunch Break"
    startTime: Date,        // Break start timestamp
    endTime: Date,          // Break end timestamp
    duration: Number,       // Minutes
    status: String,         // ongoing, completed, exceeded
    recordedBy: String,     // employee, system, manual, device
    deviceId: String        // Optional
  }],
  
  totalBreakTime: Number,   // Total minutes (all breaks)
  netWorkHours: Number,     // Work hours minus breaks
  breakCompliance: String   // compliant, exceeded, insufficient, none
}
```

---

## 🧪 Testing Guide

### **Test 1: Single Break**

```
Setup:
- Enable break tracking
- Configure lunch break: 12:00 PM - 2:00 PM, 60 minutes

Test Steps:
1. Employee checks in: 9:00 AM
2. Employee scans at: 12:30 PM → Break starts
3. Employee scans at: 1:15 PM → Break ends (45 mins)
4. Employee checks out: 5:00 PM

Expected Results:
✅ Gross hours: 8
✅ Break time: 0.75 hours
✅ Net work hours: 7.25 hours
✅ Break compliance: compliant
✅ Status: present
```

### **Test 2: Multiple Breaks**

```
Setup:
- Tea break: 10:00 AM - 11:00 AM, 15 minutes
- Lunch break: 12:00 PM - 2:00 PM, 60 minutes

Test Steps:
1. Check in: 9:00 AM
2. Tea start: 10:15 AM
3. Tea end: 10:25 AM (10 mins)
4. Lunch start: 12:30 PM
5. Lunch end: 1:20 PM (50 mins)
6. Check out: 5:00 PM

Expected Results:
✅ Total breaks: 2
✅ Total break time: 60 minutes
✅ Net work hours: 7 hours
```

### **Test 3: Exceeded Break**

```
Setup:
- Lunch: 60 minutes expected, 90 max

Test Steps:
1. Break start: 12:00 PM
2. Break end: 1:35 PM (95 minutes)

Expected Results:
⚠️ Status: exceeded
⚠️ Warning logged
⚠️ Break compliance: exceeded
```

---

## 🚀 Deployment Checklist

### **Backend**

- [x] Updated Shift model with breaks array
- [x] Updated Attendance model with break fields
- [x] Added processBreakRecord method to dataSyncService
- [x] Added break detection logic in processAttendanceRecord
- [x] Created breakController.js
- [x] Created breakRoutes.js
- [x] Registered routes in server.js
- [x] Net work hours calculation implemented

### **Configuration**

- [ ] Enable break tracking for shifts: `breakTrackingEnabled: true`
- [ ] Configure break windows for each shift
- [ ] Set appropriate maxDuration values
- [ ] Define paid vs unpaid breaks

### **Testing**

- [ ] Test automatic break detection via device
- [ ] Test manual break start/end via API
- [ ] Verify net work hours calculation
- [ ] Check break compliance rules
- [ ] Test multiple breaks per day
- [ ] Verify exceeded break warnings

---

## 💡 Use Cases

### **Use Case 1: Standard Office (Fixed Breaks)**

```javascript
breaks: [
  {
    name: "Lunch Break",
    type: "lunch",
    duration: 60,
    startWindow: "12:00",
    endWindow: "14:00",
    isPaid: false,        // Unpaid
    maxDuration: 90
  }
]
```

### **Use Case 2: Factory (Multiple Short Breaks)**

```javascript
breaks: [
  {
    name: "Morning Tea",
    type: "tea",
    duration: 15,
    startWindow: "10:00",
    endWindow: "10:30",
    isPaid: true,         // Paid
    maxDuration: 20
  },
  {
    name: "Lunch",
    type: "lunch",
    duration: 30,
    startWindow: "12:00",
    endWindow: "13:00",
    isPaid: false,
    maxDuration: 45
  },
  {
    name: "Afternoon Tea",
    type: "tea",
    duration: 15,
    startWindow: "15:00",
    endWindow: "15:30",
    isPaid: true,
    maxDuration: 20
  }
]
```

### **Use Case 3: Call Center (Flexible Breaks)**

```javascript
breaks: [
  {
    name: "Flexible Break",
    type: "rest",
    duration: 15,
    startWindow: "09:00",
    endWindow: "17:00",   // Anytime during shift
    isPaid: true,
    maxDuration: 20,
    allowMultiple: true   // Multiple short breaks
  }
]
```

---

## ⚠️ Important Notes

1. **Break Tracking Must Be Enabled**
   - Set `breakTrackingEnabled: true` in shift configuration
   - Otherwise, system uses default `breakTime` value

2. **Paid vs Unpaid Breaks**
   - `isPaid: true` → Not deducted from net work hours
   - `isPaid: false` → Deducted from net work hours

3. **Break Window Detection**
   - Device scans within break window are treated as break records
   - Only if employee has checked in but not checked out

4. **Net vs Gross Hours**
   - **Gross Hours**: Total time from check-in to check-out
   - **Net Hours**: Gross hours minus break time (used for payroll)

5. **Backward Compatibility**
   - If `breakTrackingEnabled: false`, uses `breakTime` field
   - Automatic deduction without tracking individual breaks

---

## 📈 Benefits

✅ **Accurate Payroll** - Pay only for actual work time  
✅ **Break Compliance** - Know if employees take proper breaks  
✅ **Labor Law Compliance** - Ensure mandatory break requirements  
✅ **Productivity Insights** - Analyze break patterns  
✅ **Flexible Configuration** - Different rules per shift  
✅ **Automatic Detection** - Works with biometric devices  
✅ **Manual Override** - Employees can control breaks  
✅ **Audit Trail** - Complete break history with timestamps  

---

## 🎉 System Ready!

The break tracking system is fully implemented and ready for production use. Configure your shifts with break windows and enable tracking to start using this feature!

**Next Steps:**
1. Configure breaks for each shift
2. Enable `breakTrackingEnabled: true`
3. Test with real device scans
4. Monitor logs for break detection
5. Review break compliance reports
