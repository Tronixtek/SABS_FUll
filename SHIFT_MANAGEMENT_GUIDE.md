# Shift Management System - Complete Guide

## Overview
Comprehensive shift management system with support for multiple shift types, working days, grace periods, overtime calculations, and more.

---

## Features

### ✅ Shift Creation & Management
- **Add new shifts** with complete configuration
- **Edit existing shifts** with full details
- **Delete shifts** with confirmation
- **Visual shift cards** with color coding
- **Default shift** marking for new employees

### ✅ Shift Timing
- **Start and End times** (24-hour format)
- **Overnight shift support** (crosses midnight)
- **Auto-calculated working hours**
- **Break time configuration**
- **Grace periods** for check-in and check-out

### ✅ Working Days Configuration
- **Select specific days** (Monday-Sunday)
- **Visual day selection** with toggle buttons
- **Flexible schedules** (5-day, 6-day, custom)

### ✅ Shift Customization
- **8 color options** for visual identification
- **Custom shift codes** (e.g., MS-001, ES-001)
- **Status management** (Active/Inactive)
- **Facility assignment** (per-facility shifts)

### ✅ Allowances & Rates
- **Overtime rate** (multiplier, e.g., 1.5x)
- **Night shift allowance** (percentage)
- **Weekend allowance** (percentage)

---

## Shift Types

### 1. **Morning Shift** 🌅
```javascript
{
  name: "Morning Shift",
  code: "MS-001",
  startTime: "06:00",
  endTime: "14:00",
  workingHours: 8,
  isOvernight: false,
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  color: "#3498db"
}
```

### 2. **Evening Shift** 🌆
```javascript
{
  name: "Evening Shift",
  code: "ES-001",
  startTime: "14:00",
  endTime: "22:00",
  workingHours: 8,
  isOvernight: false,
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  color: "#f39c12"
}
```

### 3. **Night Shift** 🌙
```javascript
{
  name: "Night Shift",
  code: "NS-001",
  startTime: "22:00",
  endTime: "06:00",
  workingHours: 8,
  isOvernight: true, // ← Important!
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  color: "#34495e",
  allowances: {
    nightShiftAllowance: 20 // 20% extra
  }
}
```

### 4. **Weekend Shift** 🎯
```javascript
{
  name: "Weekend Shift",
  code: "WS-001",
  startTime: "09:00",
  endTime: "17:00",
  workingHours: 8,
  isOvernight: false,
  workingDays: ["Saturday", "Sunday"],
  color: "#9b59b6",
  allowances: {
    weekendAllowance: 15 // 15% extra
  }
}
```

### 5. **Flexible Shift** 🔄
```javascript
{
  name: "Flexible Shift",
  code: "FS-001",
  startTime: "08:00",
  endTime: "16:00",
  workingHours: 8,
  graceTime: {
    checkIn: 30, // 30 minutes grace
    checkOut: 30
  },
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  color: "#2ecc71"
}
```

---

## Configuration Options

### Basic Information
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **Name** | String | Yes | Display name (e.g., "Morning Shift") |
| **Code** | String | Yes | Unique identifier (e.g., "MS-001") |
| **Facility** | Reference | Yes | Associated facility |
| **Status** | Enum | Yes | active / inactive |
| **Is Default** | Boolean | No | Default shift for new employees |

### Timing Configuration
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **Start Time** | String (HH:mm) | Yes | Shift start (e.g., "09:00") |
| **End Time** | String (HH:mm) | Yes | Shift end (e.g., "17:00") |
| **Working Hours** | Number | Auto | Calculated from start/end |
| **Break Time** | Number (minutes) | No | Default: 60 minutes |
| **Is Overnight** | Boolean | No | Crosses midnight? |

### Grace Periods
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| **Check-In Grace** | Number (minutes) | 15 | Late arrival tolerance |
| **Check-Out Grace** | Number (minutes) | 15 | Early departure tolerance |

### Working Days
- **Select Multiple Days**: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- **Visual Toggle**: Click to select/deselect days
- **Common Patterns**:
  - 5-day week: Mon-Fri
  - 6-day week: Mon-Sat
  - Weekend: Sat-Sun
  - Custom: Any combination

### Visual Customization
**8 Color Options:**
- 🔵 Blue (#3498db) - Default
- 🟢 Green (#2ecc71)
- 🟠 Orange (#f39c12)
- 🔴 Red (#e74c3c)
- 🟣 Purple (#9b59b6)
- 🔷 Teal (#1abc9c)
- ⚫ Dark Gray (#34495e)
- 🟤 Dark Orange (#e67e22)

### Allowances & Rates
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| **Overtime Rate** | Number (multiplier) | 1.5 | 1.5 = 150% of regular rate |
| **Night Shift Allowance** | Number (%) | 0 | Additional % for night shifts |
| **Weekend Allowance** | Number (%) | 0 | Additional % for weekends |

---

## Working Hours Calculation

### Formula
```javascript
const calculateWorkingHours = (startTime, endTime, isOvernight) => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let startInMinutes = startHour * 60 + startMin;
  let endInMinutes = endHour * 60 + endMin;
  
  // Handle overnight shifts
  if (isOvernight && endInMinutes <= startInMinutes) {
    endInMinutes += 24 * 60; // Add 24 hours
  }
  
  const totalMinutes = endInMinutes - startInMinutes;
  return (totalMinutes / 60).toFixed(1);
}
```

### Examples

**Regular Shift (9:00 - 17:00):**
```
Start: 09:00 → 540 minutes
End: 17:00 → 1020 minutes
Difference: 1020 - 540 = 480 minutes
Working Hours: 480 / 60 = 8.0 hours
```

**Overnight Shift (22:00 - 06:00):**
```
Start: 22:00 → 1320 minutes
End: 06:00 → 360 minutes (+ 1440 for overnight) = 1800 minutes
Difference: 1800 - 1320 = 480 minutes
Working Hours: 480 / 60 = 8.0 hours
```

---

## Grace Period Logic

### Check-In Grace
```javascript
// Example: Shift starts at 09:00, grace = 15 minutes
shiftStartTime = "09:00"
graceCheckIn = 15 // minutes

// Employee can arrive up to 09:15 without being marked late
latestArrivalTime = "09:15"

// Arrivals:
08:50 → ✅ On time
09:10 → ✅ Within grace (not late)
09:20 → ❌ Late (5 minutes late)
```

### Check-Out Grace
```javascript
// Example: Shift ends at 17:00, grace = 15 minutes
shiftEndTime = "17:00"
graceCheckOut = 15 // minutes

// Employee can leave from 16:45 onwards without early departure penalty
earliestDepartureTime = "16:45"

// Departures:
17:30 → ✅ On time
16:50 → ✅ Within grace (not early)
16:40 → ❌ Early departure (5 minutes early)
```

---

## Default Shift

### Purpose
- **Automatically assigned** to new employees
- **One per facility** (only one can be default)
- **Visual indicator** (⭐ badge)

### Behavior
```javascript
// When creating a new employee without specifying shift
const newEmployee = {
  name: "John Doe",
  facility: facilityId,
  // shift: not specified
};

// System automatically assigns default shift
const defaultShift = await Shift.findOne({ 
  facility: facilityId, 
  isDefault: true 
});

newEmployee.shift = defaultShift._id;
```

### Setting Default Shift
1. Open shift edit modal
2. Check "⭐ Set as Default Shift"
3. Save shift
4. System automatically unmarks previous default (if any)

---

## UI Components

### Shift Card
```
┌────────────────────────────────┐
│ ● Morning Shift  ⭐ Default    │
│   MS-001            [Active]   │
├────────────────────────────────┤
│ 🕐 Time: 09:00 - 17:00        │
│ Work Hours: 8.0 hrs            │
│ Break Time: 60 min             │
│ Grace Period: 15 / 15 min      │
│ Facility: Main Office          │
│                                │
│ Working Days:                  │
│ [Mon] [Tue] [Wed] [Thu] [Fri] │
│                                │
│ [Edit] [Delete]                │
└────────────────────────────────┘
```

### Modal Form
```
┌──────────────────────────────────────┐
│ Add New Shift                    [✕] │
├──────────────────────────────────────┤
│ Basic Information                    │
│ Shift Name: [____________]           │
│ Shift Code: [____________]           │
│ Facility: [Select Facility ▼]       │
│ Status: [Active ▼]                   │
│ ☑ Set as Default Shift               │
│                                      │
│ Shift Timing                         │
│ Start Time: [09:00]                  │
│ End Time: [17:00]                    │
│ Working Hours: [8.0] (Auto)          │
│ Break Time: [60] minutes             │
│ ☑ Overnight Shift 🌙                 │
│                                      │
│ Grace Period                         │
│ Check-In Grace: [15] minutes         │
│ Check-Out Grace: [15] minutes        │
│                                      │
│ Working Days                         │
│ [Mon] [Tue] [Wed] [Thu] [Fri]       │
│ [Sat] [Sun]                          │
│                                      │
│ Shift Color                          │
│ ● ● ● ● ● ● ● ●                     │
│                                      │
│ Allowances & Rates                   │
│ Overtime Rate: [1.5]                 │
│ Night Shift Allowance: [0] %         │
│ Weekend Allowance: [0] %             │
│                                      │
│ Description                          │
│ [_____________________________]      │
│                                      │
│ [Cancel] [Create Shift]              │
└──────────────────────────────────────┘
```

---

## API Endpoints

### GET /api/shifts
**Fetch all shifts**
```javascript
const response = await axios.get('/api/shifts');
// Returns: { success: true, data: [shifts] }
```

### POST /api/shifts
**Create new shift**
```javascript
const newShift = {
  name: "Morning Shift",
  code: "MS-001",
  facility: facilityId,
  startTime: "09:00",
  endTime: "17:00",
  workingHours: 8,
  graceTime: { checkIn: 15, checkOut: 15 },
  breakTime: 60,
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  isOvernight: false,
  isDefault: true,
  color: "#3498db",
  status: "active"
};

const response = await axios.post('/api/shifts', newShift);
```

### PUT /api/shifts/:id
**Update shift**
```javascript
const updatedShift = {
  name: "Updated Morning Shift",
  startTime: "08:00"
};

const response = await axios.put(`/api/shifts/${shiftId}`, updatedShift);
```

### DELETE /api/shifts/:id
**Delete shift**
```javascript
const response = await axios.delete(`/api/shifts/${shiftId}`);
```

---

## Database Model

```javascript
{
  name: String,                    // "Morning Shift"
  code: String,                    // "MS-001" (unique, uppercase)
  facility: ObjectId,              // ref: 'Facility'
  startTime: String,               // "09:00" (HH:mm format)
  endTime: String,                 // "17:00" (HH:mm format)
  workingHours: Number,            // 8 (hours)
  graceTime: {
    checkIn: Number,               // 15 (minutes)
    checkOut: Number               // 15 (minutes)
  },
  breakTime: Number,               // 60 (minutes)
  workingDays: [String],           // ["Monday", "Tuesday", ...]
  isOvernight: Boolean,            // false
  isDefault: Boolean,              // false
  color: String,                   // "#3498db"
  status: String,                  // "active" | "inactive"
  allowances: {
    overtimeRate: Number,          // 1.5 (multiplier)
    nightShiftAllowance: Number,   // 0 (percentage)
    weekendAllowance: Number       // 0 (percentage)
  },
  description: String,             // Optional notes
  createdAt: Date,
  updatedAt: Date
}
```

---

## Usage Examples

### Example 1: Create 24/7 Operation Shifts
```javascript
// Morning Shift (6 AM - 2 PM)
{
  name: "Morning Shift",
  code: "MS-001",
  startTime: "06:00",
  endTime: "14:00",
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  color: "#3498db"
}

// Evening Shift (2 PM - 10 PM)
{
  name: "Evening Shift",
  code: "ES-001",
  startTime: "14:00",
  endTime: "22:00",
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  color: "#f39c12"
}

// Night Shift (10 PM - 6 AM)
{
  name: "Night Shift",
  code: "NS-001",
  startTime: "22:00",
  endTime: "06:00",
  isOvernight: true,
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  color: "#34495e",
  allowances: { nightShiftAllowance: 20 }
}
```

### Example 2: Flexible Work Arrangements
```javascript
// Flexible Shift with large grace period
{
  name: "Flexible Hours",
  code: "FH-001",
  startTime: "08:00",
  endTime: "16:00",
  graceTime: {
    checkIn: 60,  // 1 hour grace
    checkOut: 60
  },
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday"],
  color: "#2ecc71"
}
```

### Example 3: Weekend-Only Shift
```javascript
{
  name: "Weekend Crew",
  code: "WE-001",
  startTime: "09:00",
  endTime: "17:00",
  workingDays: ["Saturday", "Sunday"],
  allowances: {
    weekendAllowance: 25 // 25% weekend bonus
  },
  color: "#9b59b6"
}
```

---

## Best Practices

### 1. **Shift Codes**
- Use consistent format: `XX-###`
- Examples: `MS-001`, `ES-001`, `NS-001`
- Keep codes unique and meaningful

### 2. **Grace Periods**
- **Standard**: 15 minutes
- **Strict**: 5 minutes
- **Flexible**: 30-60 minutes

### 3. **Overnight Shifts**
- Always check "Overnight Shift" if crosses midnight
- Ensure working hours calculate correctly

### 4. **Default Shift**
- Set one default per facility
- Use most common shift as default

### 5. **Color Coding**
- Blue: Day shifts
- Orange: Evening shifts
- Dark Gray: Night shifts
- Purple: Weekend shifts
- Green: Flexible shifts

---

## Status

✅ **Shift Creation** - Complete  
✅ **Shift Editing** - Complete  
✅ **Shift Deletion** - Complete  
✅ **Working Days Selection** - Complete  
✅ **Grace Period Configuration** - Complete  
✅ **Overnight Shift Support** - Complete  
✅ **Default Shift** - Complete  
✅ **Color Customization** - Complete  
✅ **Allowances Configuration** - Complete  
✅ **Auto Working Hours Calculation** - Complete  

**Ready for production use!** 🚀
