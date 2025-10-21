# Work Time Settings - Quick Guide

## 🕐 Work Start & End Time Settings

### Overview
You can now set the default work start and end times in the Settings page. These times are used to:
- Calculate late arrivals
- Calculate overtime
- Determine work hours
- Validate attendance records

## 📍 Location
**Settings → Attendance Tab → Work Start/End Time**

## 🎨 Visual Layout

```
┌──────────────────────────────────────────────┐
│ Attendance Settings                          │
├──────────────────────────────────────────────┤
│                                              │
│ Work Start Time         Work End Time       │
│ ┌──────────┐            ┌──────────┐        │
│ │ 09:00    │            │ 17:00    │        │
│ └──────────┘            └──────────┘        │
│ Default time employees  Default time        │
│ should start work       employees finish    │
│                                              │
│ Working Hours/Day       Late Threshold      │
│ ┌──────────┐            ┌──────────┐        │
│ │    8     │            │    15    │        │
│ └──────────┘            └──────────┘        │
│                                              │
└──────────────────────────────────────────────┘
```

## ⚙️ Settings Details

### Work Start Time
- **Type**: Time picker (HH:MM format)
- **Default**: 09:00 (9:00 AM)
- **Purpose**: When work day begins
- **Example**: Set to 08:30 for 8:30 AM start

### Work End Time
- **Type**: Time picker (HH:MM format)
- **Default**: 17:00 (5:00 PM)
- **Purpose**: When work day ends
- **Example**: Set to 18:00 for 6:00 PM end

## 💡 How It Works

### Late Arrival Calculation
```
Work Start Time: 09:00
Late Threshold: 15 minutes
Employee checks in: 09:20

Result: LATE (20 minutes after start)
```

### Overtime Calculation
```
Work End Time: 17:00
Employee checks out: 19:00

Result: 2 hours OVERTIME
```

### Work Hours Calculation
```
Work Start Time: 09:00
Work End Time: 17:00

Expected Work Hours: 8 hours
```

## 🧪 Testing Guide

### Test 1: Set Work Times
1. Navigate to Settings → Attendance
2. ✅ Click on Work Start Time field
3. ✅ Select time (e.g., 09:00)
4. ✅ Click on Work End Time field
5. ✅ Select time (e.g., 17:00)
6. ✅ Click "Save Changes"
7. ✅ Verify success toast

### Test 2: Verify Time Picker
1. ✅ Time picker opens on click
2. ✅ Can select hours and minutes
3. ✅ Displays in 24-hour format
4. ✅ Value updates in field

### Test 3: Validate Times
1. Set start time: 09:00
2. Set end time: 08:00 (before start)
3. ✅ Should show validation (optional)
4. Or allow and let backend validate

### Test 4: Persistence
1. Set work times
2. Save changes
3. Refresh page
4. ✅ Times persist correctly

## 📊 Use Cases

### Standard Office Hours
```
Work Start: 09:00
Work End: 17:00
Working Hours: 8
Break: (handled separately)
```

### Early Morning Shift
```
Work Start: 06:00
Work End: 14:00
Working Hours: 8
```

### Evening Shift
```
Work Start: 15:00
Work End: 23:00
Working Hours: 8
```

### Night Shift (Overnight)
```
Work Start: 22:00
Work End: 06:00 (next day)
Working Hours: 8
Note: System should handle midnight crossing
```

## 🔄 Integration with Other Settings

### Late Arrival Threshold
```
Work Start: 09:00
Late Threshold: 15 minutes

Employee checks in at:
- 09:00 - 09:14 → ON TIME
- 09:15 - 09:29 → LATE (within grace)
- 09:30+       → LATE
```

### Overtime Threshold
```
Work End: 17:00
Overtime After: 8 hours

Employee checks out at:
- 17:00 → No overtime
- 18:00 → 1 hour overtime
- 19:00 → 2 hours overtime
```

### Half Day Threshold
```
Work Start: 09:00
Work End: 17:00
Half Day Threshold: 4 hours

If employee works:
- < 4 hours → Absent/Partial
- 4-7 hours → Half Day
- 8+ hours  → Full Day
```

## 💾 Database Storage

Settings are stored as:
```json
{
  "key": "workStartTime",
  "value": "09:00",
  "category": "attendance",
  "description": "Default work start time"
}
```

```json
{
  "key": "workEndTime",
  "value": "17:00",
  "category": "attendance",
  "description": "Default work end time"
}
```

## 🎯 Best Practices

1. **Consistent Across Organization**
   - Set standard times for all employees
   - Use shifts for different schedules

2. **Consider Timezone**
   - Set times in local timezone
   - Ensure timezone setting is correct

3. **Account for Breaks**
   - Working hours should exclude breaks
   - Or include breaks in total hours

4. **Communicate Changes**
   - Notify employees of time changes
   - Update company policies

5. **Test Before Production**
   - Verify calculations are correct
   - Check late/overtime logic

## 🔧 Advanced Configuration

### Per-Facility Times
In the future, you could extend to:
- Different times per facility
- Different times per shift
- Custom schedules per employee

### Flexible Schedules
Could support:
- Flex time (core hours only)
- Compressed work weeks
- Part-time schedules

## 📋 Quick Reference

| Setting | Default | Purpose |
|---------|---------|---------|
| Work Start Time | 09:00 | When work begins |
| Work End Time | 17:00 | When work ends |
| Working Hours | 8 | Expected hours per day |
| Late Threshold | 15 min | Grace period for late |
| Overtime Threshold | 8 hrs | When OT starts |

## ✅ Benefits

1. **Standardized Times**: Consistent across system
2. **Automatic Calculations**: Late/OT calculated automatically
3. **Easy Updates**: Change times in one place
4. **Audit Trail**: Track when times are changed
5. **Flexible**: Different times for different needs

---

## 🚀 Quick Setup

```
1. Go to Settings
2. Click "Attendance" tab
3. Set Work Start Time: 09:00
4. Set Work End Time: 17:00
5. Click "Save Changes"
6. Done! ✅
```

---

**Status**: ✅ **Feature Added and Ready**

Work start and end time settings are now available in the Attendance Settings tab. These times will be used throughout the system for calculating attendance metrics.
