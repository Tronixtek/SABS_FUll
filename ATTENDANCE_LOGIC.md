# Attendance Tracking Logic Documentation

## Overview
This document explains how the system handles incoming attendance data from face recognition and RFID devices, including clock-in/out detection, late/early/overtime calculations.

---

## 🔄 Data Flow

```
Device (Face/RFID) → Device API → Data Sync Service → Attendance Processing → Database
                                         ↓
                                  Smart Detection
                                  - Check-in vs Check-out
                                  - Late Arrival
                                  - Early Departure
                                  - Overtime/Undertime
```

---

## 📥 Incoming Data Processing

### Step 1: Employee Matching
The system matches attendance records to employees using **multiple identifiers**:

- **Device ID** (`deviceId`, `deviceUserId`, `userId`)
- **Employee ID** (`employeeId`, `empId`)
- **RFID Card ID** (`cardId`, `rfidCard`)
- **Face ID** (`faceId`)

**Query Logic:**
```javascript
{
  facility: facilityId,
  status: 'active',
  $or: [
    { deviceId: record.deviceId },
    { employeeId: record.employeeId },
    { 'biometricData.cardId': record.cardId },
    { 'biometricData.faceId': record.faceId }
  ]
}
```

### Step 2: Verification Method Detection
The system normalizes different verification methods:

| Device Method | Normalized Method |
|--------------|------------------|
| `face`, `Face Recognition`, `facial` | `face` |
| `card`, `RFID`, `rfid-card`, `Card Reader` | `card` |
| `finger`, `fingerprint`, `Fingerprint Scanner` | `fingerprint` |
| `manual`, `admin`, `password`, `PIN` | `manual` |

---

## 🕐 Check-In Detection

The system uses **smart detection** to determine if a record is check-in or check-out:

### 1. Explicit Type (if provided)
```javascript
record.type = "in" | "checkin" | "check-in" | "entry"  → Check-In
record.type = "out" | "checkout" | "check-out" | "exit" → Check-Out
```

### 2. Auto-Detection Logic (if no type specified)
```
IF no check-in time exists → This is CHECK-IN
ELSE IF check-in exists but no check-out → This is CHECK-OUT
ELSE IF both exist → Compare timestamp to scheduled times
  - Closer to scheduled check-in time → CHECK-IN (update)
  - Closer to scheduled check-out time → CHECK-OUT (update)
```

---

## ⏰ Check-In Processing

### Actions Performed:
1. **Record check-in time** with verification method
2. **Calculate late arrival** with grace period
3. **Update attendance status** if late

### Late Arrival Logic:
```javascript
scheduledCheckIn = 09:00 AM
graceTime = 15 minutes (from shift settings)
actualCheckIn = 09:25 AM

lateMinutes = actualCheckIn - scheduledCheckIn = 25 minutes

IF lateMinutes > graceTime (25 > 15):
  ✅ Mark as LATE
  ✅ Record lateArrival = 25 minutes
  ✅ Set status = "late"
ELSE IF lateMinutes > 0 AND lateMinutes <= graceTime:
  ✅ Record lateArrival = 10 minutes
  ⚠️ Within grace period (no penalty)
ELSE:
  ✅ ON TIME or EARLY
```

### Console Logging:
```
✅ Check-in: John Doe (ON TIME or EARLY by 5 mins) via face
✅ Check-in: Jane Smith (10 mins after start, within grace period) via card
⏰ LATE: Bob Wilson arrived 25 mins late (grace: 15 mins) via fingerprint
```

---

## 🚪 Check-Out Processing

### Actions Performed:
1. **Record check-out time** with verification method
2. **Calculate total work hours** (check-out - check-in - break time)
3. **Calculate overtime or undertime**
4. **Detect early departure** with grace period

### Work Hours Calculation:
```javascript
checkInTime = 09:00 AM
checkOutTime = 06:30 PM
breakTime = 60 minutes (from shift settings)

totalMinutes = (checkOutTime - checkInTime) - breakTime
totalMinutes = (9.5 hours * 60) - 60 = 510 minutes
workHours = 510 / 60 = 8.5 hours
```

### Overtime/Undertime Logic:
```javascript
workHours = 8.5 hours
scheduledHours = 8.0 hours

IF workHours > scheduledHours:
  overtime = workHours - scheduledHours = 0.5 hours
  undertime = 0
  💪 Employee worked OVERTIME

ELSE IF workHours < scheduledHours:
  undertime = scheduledHours - workHours = 0.5 hours
  overtime = 0
  ⚠️ Employee has UNDERTIME

ELSE:
  overtime = 0
  undertime = 0
  ✅ Completed scheduled hours
```

### Early Departure Logic:
```javascript
scheduledCheckOut = 06:00 PM
graceTime = 15 minutes (from shift settings)
actualCheckOut = 05:30 PM

earlyMinutes = scheduledCheckOut - actualCheckOut = 30 minutes

IF earlyMinutes > graceTime (30 > 15):
  🚨 EARLY DEPARTURE detected
  ✅ Record earlyDeparture = 30 minutes
ELSE IF earlyMinutes > 0 AND earlyMinutes <= graceTime:
  ⚠️ Left slightly early but within grace period
ELSE:
  ✅ Left ON TIME or worked LATE
```

### Console Logging:
```
✅ Check-out: John Doe - COMPLETED SHIFT (8.0 hrs) via face
💪 Check-out: Jane Smith - OVERTIME 1.5 hrs (worked: 9.5hrs, scheduled: 8hrs) via card
⚠️ Check-out: Bob Wilson - UNDERTIME 0.5 hrs (worked: 7.5hrs, scheduled: 8hrs) via fingerprint
🚨 EARLY DEPARTURE: Alice Brown left 30 mins early (grace: 15 mins)
```

---

## 📊 Attendance Record Structure

After processing, each attendance record contains:

```javascript
{
  employee: ObjectId,
  facility: ObjectId,
  date: "2025-10-16",
  shift: ObjectId,
  
  // Check-in Details
  checkIn: {
    time: "2025-10-16T09:05:00Z",
    deviceId: "EMP001",
    method: "face",
    recordedBy: "system"
  },
  
  // Check-out Details
  checkOut: {
    time: "2025-10-16T18:30:00Z",
    deviceId: "EMP001",
    method: "card",
    recordedBy: "system"
  },
  
  // Scheduled Times
  scheduledCheckIn: "2025-10-16T09:00:00Z",
  scheduledCheckOut: "2025-10-16T18:00:00Z",
  
  // Calculated Metrics
  workHours: 8.5,          // Total hours worked
  overtime: 0.5,           // Overtime hours
  undertime: 0,            // Undertime hours
  lateArrival: 5,          // Minutes late
  earlyDeparture: 0,       // Minutes left early
  
  // Status
  status: "present",       // present | late | absent | half-day
  
  // Device Data
  deviceData: {
    raw: [...],           // Original device records
    synced: true,
    syncedAt: "2025-10-16T18:35:00Z"
  }
}
```

---

## 🔍 Edge Cases Handled

### 1. Duplicate Records
**Scenario:** Employee scans twice at check-in

**Logic:**
```
IF check-in already exists:
  ℹ️ Ignore duplicate check-in
  Log: "Duplicate check-in ignored"
```

### 2. Late Check-Out Update
**Scenario:** Employee scans out again after initial check-out

**Logic:**
```
IF new timestamp > existing check-out time:
  🔄 Update check-out time to later timestamp
  🔄 Recalculate work hours and overtime
  Log: "Updated check-out from 18:00 to 19:30 - New work hours: 9.5hrs"
```

### 3. Missing Shift Assignment
**Scenario:** Employee has no shift assigned

**Logic:**
```
IF employee.shift is null:
  ⚠️ Log warning: "No shift assigned to employee"
  ⛔ Skip processing (cannot calculate scheduled times)
```

### 4. Unknown Device Record Type
**Scenario:** Device sends record without type field

**Logic:**
```
IF no type field in record:
  ✅ Use smart auto-detection
  - Check existing check-in/out
  - Compare timestamp to scheduled times
  - Determine most likely action
```

---

## ⚙️ Configuration Settings

### Shift Settings (Per Shift)
```javascript
{
  startTime: "09:00",           // Scheduled start time
  endTime: "18:00",             // Scheduled end time
  workingHours: 8,              // Expected work hours
  breakTime: 60,                // Break minutes (deducted from work hours)
  graceTime: {
    checkIn: 15,                // Late arrival grace (minutes)
    checkOut: 15                // Early departure grace (minutes)
  }
}
```

### Facility Settings
```javascript
{
  timezone: "Asia/Kolkata",     // For timestamp conversion
  deviceApiUrl: "https://...",  // Attendance records endpoint
  userApiUrl: "https://...",    // User registry endpoint (optional)
  deviceApiKey: "secret-key"    // API authentication
}
```

---

## 📈 Status Determination

The system automatically sets attendance status:

| Condition | Status | Description |
|-----------|--------|-------------|
| Late > grace period | `late` | Arrived late beyond grace time |
| Has check-in & check-out | `present` | Completed shift |
| No check-in (end of day) | `absent` | Did not show up |
| Undertime > 4 hours | `half-day` | Worked less than half shift |
| Approved leave | `on-leave` | Pre-approved absence |
| Facility holiday | `holiday` | Scheduled holiday |

---

## 🎯 Example Scenarios

### Scenario 1: Perfect Attendance
```
Scheduled: 09:00 - 18:00 (8 hours + 1 hour break)
Check-in: 08:55 AM via face recognition
Check-out: 06:05 PM via RFID card

Result:
✅ Status: present
✅ Work Hours: 8.17 hours
✅ Late Arrival: 0 minutes
✅ Early Departure: 0 minutes
✅ Overtime: 0.17 hours (10 mins)
✅ Undertime: 0 hours
```

### Scenario 2: Late Arrival
```
Scheduled: 09:00 - 18:00
Grace: 15 minutes
Check-in: 09:30 AM via RFID card
Check-out: 06:00 PM via face recognition

Result:
⏰ Status: late
✅ Work Hours: 8.0 hours
⚠️ Late Arrival: 30 minutes (15 beyond grace)
✅ Early Departure: 0 minutes
✅ Overtime: 0 hours
✅ Undertime: 0 hours
```

### Scenario 3: Overtime Work
```
Scheduled: 09:00 - 18:00 (8 hours)
Check-in: 08:50 AM via fingerprint
Check-out: 08:00 PM via face recognition

Result:
✅ Status: present
💪 Work Hours: 10.17 hours
✅ Late Arrival: 0 minutes
✅ Early Departure: 0 minutes
✅ Overtime: 2.17 hours
✅ Undertime: 0 hours
```

### Scenario 4: Early Departure
```
Scheduled: 09:00 - 18:00
Grace: 15 minutes
Check-in: 09:00 AM via face recognition
Check-out: 05:30 PM via RFID card

Result:
✅ Status: present
⚠️ Work Hours: 7.5 hours
✅ Late Arrival: 0 minutes
🚨 Early Departure: 30 minutes (15 beyond grace)
✅ Overtime: 0 hours
⚠️ Undertime: 0.5 hours
```

### Scenario 5: Half Day
```
Scheduled: 09:00 - 18:00 (8 hours)
Check-in: 09:00 AM via face recognition
Check-out: 01:00 PM via RFID card

Result:
⚠️ Status: half-day
⚠️ Work Hours: 3.0 hours
✅ Late Arrival: 0 minutes
✅ Early Departure: 0 minutes
✅ Overtime: 0 hours
⚠️ Undertime: 5.0 hours
```

---

## 🔒 Data Integrity

### Validation Rules:
1. ✅ Each employee can have only **one attendance record per date** (unique index)
2. ✅ Check-out time must be **after check-in time**
3. ✅ Attendance date must match **check-in date** (timezone-aware)
4. ✅ All calculations use **facility timezone**
5. ✅ Device data is **preserved in raw format** for audit

### Automatic Calculations:
- Work hours = (Check-out - Check-in) - Break time
- Overtime = Work hours - Scheduled hours (if positive)
- Undertime = Scheduled hours - Work hours (if positive)
- Late arrival = Check-in - Scheduled check-in (if positive)
- Early departure = Scheduled check-out - Check-out (if positive)

---

## 🛠️ Troubleshooting

### Problem: Employee not found
**Symptoms:** `⚠️ Employee not found for record` in logs

**Solutions:**
1. Check Device ID matches employee record
2. Verify RFID Card ID is correct
3. Ensure employee status is 'active'
4. Confirm facility assignment matches

### Problem: No check-out recorded
**Symptoms:** Check-in exists but no check-out

**Solutions:**
1. Check if device is sending type="out" correctly
2. Verify timestamp is after check-in time
3. Look for error logs during sync
4. Manual check-out via admin panel

### Problem: Wrong overtime calculation
**Symptoms:** Overtime not matching expected

**Solutions:**
1. Verify shift break time settings
2. Check scheduled work hours
3. Confirm timezone settings
4. Review device timestamps

### Problem: Status not updating to "late"
**Symptoms:** Employee late but status shows "present"

**Solutions:**
1. Check shift grace time settings
2. Verify late minutes > grace period
3. Ensure calculations running in sync service
4. Check attendance record after sync

---

## 📞 Support

For issues with attendance tracking:
1. Check server logs for emoji indicators (✅, ⏰, 💪, 🚨)
2. Review device data in attendance.deviceData.raw
3. Verify shift and facility configurations
4. Use manual sync to test individual facilities

---

**Last Updated:** October 16, 2025
**Version:** 2.0 - Enhanced Smart Detection
