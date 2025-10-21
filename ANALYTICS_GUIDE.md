# 📊 Analytics & Insights - Complete Guide

## Overview

The **Analytics** page provides comprehensive insights into attendance patterns, employee performance, and facility-wide statistics. It's designed to help administrators make data-driven decisions about workforce management.

---

## 🎯 Key Features

### 1. **Real-time Dashboard**
- Today's attendance summary
- Total employees and facilities
- Live attendance rate calculation

### 2. **Performance Analytics**
- Top performers ranking
- Attendance rate tracking
- Punctuality scoring
- Work hours analysis

### 3. **Trend Analysis**
- Monthly attendance patterns
- Late arrival tracking
- Overtime reports
- Facility-wise comparisons

### 4. **Employee Insights**
- Individual performance metrics
- Department-wise analysis
- Detailed attendance records

---

## 🖥️ Page Layout

```
┌────────────────────────────────────────────────────────────┐
│ 📊 Analytics & Insights        [Facility▼] [Start] [End] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │ 👥   │  │ ✅   │  │ ⏰   │  │ ❌   │  │ 🎯   │      │
│  │ 150  │  │ 135  │  │  8   │  │  7   │  │ 90%  │      │
│  │Total │  │Pres. │  │Late  │  │Abs.  │  │Rate  │      │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘      │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 📅 Month Statistics                              │    │
│  ├──────────────────────────────────────────────────┤    │
│  │ Present: 2,850 | Late: 150 | Absent: 100        │    │
│  │ Work Hours: 22,800 | Overtime: 450              │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  ┌──────────────────────┐  ┌──────────────────────┐     │
│  │ 🏆 Top Performers    │  │ ⚠️ Late Arrivals     │     │
│  ├──────────────────────┤  ├──────────────────────┤     │
│  │ 1. John Doe    98.5% │  │ 1. Jane S.     12x   │     │
│  │ 2. Jane Smith  97.2% │  │ 2. Bob J.      8x    │     │
│  │ 3. Bob Johnson 96.8% │  │ 3. Alice M.    6x    │     │
│  └──────────────────────┘  └──────────────────────┘     │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 🏢 Facility-wise Performance                     │    │
│  ├──────────────────────────────────────────────────┤    │
│  │ Main Office    | 95.2% | ████████████░░░░  │    │
│  │ Warehouse      | 92.8% | ████████████░░░░  │    │
│  │ Branch A       | 89.5% | ███████████░░░░░  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │ ⏱️ Overtime Report                                │    │
│  ├──────────────────────────────────────────────────┤    │
│  │ [Detailed overtime table]                        │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 📈 Employee Performance Details                  │    │
│  ├──────────────────────────────────────────────────┤    │
│  │ [Comprehensive performance table]                │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 Summary Cards

### 1. Total Employees
- **Metric**: Total active employees
- **Icon**: 👥 Users
- **Color**: Blue gradient
- **Source**: All facilities or selected facility

### 2. Today Present
- **Metric**: Employees who checked in today
- **Icon**: ✅ Check Circle
- **Color**: Green gradient
- **Calculation**: Present + Late status

### 3. Today Late
- **Metric**: Employees who arrived late today
- **Icon**: ⏰ Clock
- **Color**: Orange gradient
- **Trigger**: Check-in after scheduled time + threshold

### 4. Today Absent
- **Metric**: Employees with no check-in today
- **Icon**: ❌ X Circle
- **Color**: Red gradient
- **Status**: Marked absent

### 5. Attendance Rate
- **Metric**: Percentage of employees present
- **Icon**: 🎯 Target
- **Color**: Purple gradient
- **Formula**: `(Present / Total) × 100`

---

## 📅 Month Statistics

Shows aggregated data for the selected date range:

```
┌──────────────────────────────────────────────────┐
│  Present Days     │  Late Days       │  Absent   │
│      2,850        │      150         │    100    │
├──────────────────────────────────────────────────┤
│  Total Work Hours │  Total Overtime             │
│      22,800       │      450 hrs                │
└──────────────────────────────────────────────────┘
```

### Metrics:
- **Present Days**: Total present attendance records
- **Late Days**: Total late arrival records
- **Absent Days**: Total absent records
- **Total Work Hours**: Sum of all work hours
- **Total Overtime**: Sum of all overtime hours

---

## 🏆 Top Performers

Displays the top 5 employees with highest attendance rates.

### Display Format:
```
🥇 1. John Doe          98.5%
         EMP001         25/26 days

🥈 2. Jane Smith        97.2%
         EMP002         24/26 days

🥉 3. Bob Johnson       96.8%
         EMP003         24/26 days
```

### Sorting:
- Ordered by **Attendance Rate** (descending)
- Shows top 5 only
- Includes employee ID
- Shows present days / total days

### Badge Colors:
- 🥇 **1st Place**: Gold (Yellow-400)
- 🥈 **2nd Place**: Silver (Gray-300)
- 🥉 **3rd Place**: Bronze (Orange-400)
- Others: Gray-200

---

## ⚠️ Frequent Late Arrivals

Tracks employees with most late arrivals.

### Display Format:
```
1. Jane Smith           12x
   EMP002              Avg: 25 min

2. Bob Johnson          8x
   EMP003              Avg: 15 min

3. Alice Martinez       6x
   EMP004              Avg: 20 min
```

### Metrics:
- **Late Count**: Total late arrivals
- **Average Late Minutes**: Mean lateness per occurrence
- **Ranking**: Most to least late arrivals
- **Max Display**: Top 5

### Empty State:
```
No late arrivals this period! 🎉
```

---

## 🏢 Facility-wise Performance

Compares performance across all facilities.

### Table Columns:
1. **Facility**: Facility name
2. **Code**: Facility code
3. **Present**: Present count (green badge)
4. **Absent**: Absent count (red badge)
5. **Total Hours**: Sum of work hours
6. **Attendance Rate**: Visual progress bar + percentage

### Visual Progress Bar:
```
Main Office    95.2%  ████████████████████░░░░
Warehouse      92.8%  ██████████████████░░░░░░
Branch A       89.5%  ████████████████░░░░░░░░
```

### Calculations:
- **Attendance Rate**: `(Present / (Present + Absent)) × 100`
- **Color Coding**:
  - ≥ 90%: Green
  - 75-89%: Orange
  - < 75%: Red

---

## ⏱️ Overtime Report

Shows employees with overtime hours.

### Table Columns:
1. **Employee**: Full name
2. **Employee ID**: Unique identifier
3. **Facility**: Assigned facility
4. **Total Overtime**: Sum of overtime hours
5. **Overtime Days**: Days with overtime
6. **Avg/Day**: Average overtime per day

### Display:
- Top 10 employees by total overtime
- Sorted by total overtime (descending)
- Purple color scheme
- Only shown if overtime data exists

### Example:
```
┌────────────────┬──────┬──────────┬──────────┬──────┬─────────┐
│ Employee       │ ID   │ Facility │ Total OT │ Days │ Avg/Day │
├────────────────┼──────┼──────────┼──────────┼──────┼─────────┤
│ John Doe       │ E001 │ Main Off │ 45 hrs   │ 15   │ 3.0 hrs │
│ Jane Smith     │ E002 │ Branch A │ 38 hrs   │ 12   │ 3.2 hrs │
└────────────────┴──────┴──────────┴──────────┴──────┴─────────┘
```

---

## 📈 Employee Performance Details

Comprehensive table with all performance metrics.

### Columns:
1. **Employee**: Full name
2. **ID**: Employee ID
3. **Department**: Department name
4. **Total Days**: Attendance record count
5. **Present**: Present days (green badge)
6. **Late**: Late arrivals (orange badge)
7. **Absent**: Absent days (red badge)
8. **Work Hours**: Total work hours
9. **Overtime**: Total overtime hours (purple)
10. **Attendance Rate**: Percentage with color coding
11. **Punctuality**: Punctuality score with color coding

### Color Coding:
- **Attendance Rate**:
  - ≥ 90%: Green
  - 75-89%: Orange
  - < 75%: Red

- **Punctuality Score**:
  - ≥ 90%: Green
  - 75-89%: Orange
  - < 75%: Red

### Formulas:
```javascript
Attendance Rate = (Present Days / Total Days) × 100
Punctuality Score = (1 - (Late Days / Total Days)) × 100
```

---

## 🔍 Filters

### Date Range Filter
```
[Start Date] [End Date]
```
- Default: Current month (1st to last day)
- Format: YYYY-MM-DD
- Updates all metrics on change

### Facility Filter
```
[All Facilities ▼]
├── Main Office
├── Warehouse
├── Branch A
└── ...
```
- Default: "All Facilities"
- Filters all data by selected facility
- Updates in real-time

---

## 🔄 Data Flow

### 1. Initial Load
```
Component Mount
    ↓
Fetch Facilities
    ↓
Fetch Analytics Data
    ↓
Display Results
```

### 2. Filter Change
```
User Changes Filter
    ↓
Update State
    ↓
Trigger useEffect
    ↓
Fetch New Data
    ↓
Update Display
```

### 3. API Calls
Three parallel requests:
1. **Dashboard Analytics**: `/api/analytics/dashboard`
2. **Employee Performance**: `/api/analytics/employee-performance`
3. **Overtime Report**: `/api/analytics/overtime`

---

## 📡 API Endpoints

### 1. Dashboard Analytics
```
GET /api/analytics/dashboard
```

**Query Parameters**:
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `facility`: Facility ID (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalEmployees": 150,
      "totalFacilities": 6,
      "todayPresent": 135,
      "todayAbsent": 7,
      "todayLate": 8
    },
    "monthAttendance": [...],
    "attendanceTrend": [...],
    "topLateComers": [...],
    "facilityWiseAttendance": [...]
  }
}
```

### 2. Employee Performance
```
GET /api/analytics/employee-performance
```

**Query Parameters**:
- `startDate`: Start date
- `endDate`: End date
- `facility`: Facility ID (optional)
- `limit`: Number of results (default: 10)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "employee": {...},
      "metrics": {
        "totalDays": 26,
        "presentDays": 25,
        "lateDays": 2,
        "absentDays": 1,
        "totalWorkHours": 200,
        "totalOvertime": 15,
        "attendanceRate": 96.15,
        "punctualityScore": 92.31
      }
    }
  ]
}
```

### 3. Overtime Report
```
GET /api/analytics/overtime
```

**Query Parameters**:
- `startDate`: Start date
- `endDate`: End date
- `facility`: Facility ID (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "employee": {...},
      "facility": {...},
      "totalOvertime": 45.5,
      "overtimeDays": 15,
      "avgOvertimePerDay": 3.03
    }
  ]
}
```

---

## 🧪 Testing Guide

### Test 1: Load Analytics
1. ✅ Navigate to Analytics page
2. ✅ Verify 5 summary cards display
3. ✅ Check month statistics load
4. ✅ Verify all sections render

### Test 2: Date Range Filter
1. ✅ Select start date
2. ✅ Select end date
3. ✅ Verify data updates
4. ✅ Check calculations change

### Test 3: Facility Filter
1. ✅ Select "All Facilities"
2. ✅ Select specific facility
3. ✅ Verify filtered results
4. ✅ Check facility-wise section

### Test 4: Performance Rankings
1. ✅ Verify top 5 performers display
2. ✅ Check attendance rates correct
3. ✅ Verify badge colors
4. ✅ Test sorting order

### Test 5: Late Comers
1. ✅ Verify late arrivals list
2. ✅ Check late count accuracy
3. ✅ Verify average calculation
4. ✅ Test empty state

### Test 6: Facility Performance
1. ✅ All facilities displayed
2. ✅ Progress bars render
3. ✅ Percentages accurate
4. ✅ Color coding correct

### Test 7: Overtime Report
1. ✅ Overtime data displays
2. ✅ Sorting by total overtime
3. ✅ Calculations accurate
4. ✅ Top 10 shown

### Test 8: Performance Details
1. ✅ All employees listed
2. ✅ Metrics accurate
3. ✅ Color coding correct
4. ✅ Badges display properly

---

## 💡 Key Insights

### What to Look For:

1. **Low Attendance Rate** (< 75%)
   - Investigate facility issues
   - Check employee satisfaction
   - Review policies

2. **High Late Arrivals**
   - Review shift timings
   - Check transportation issues
   - Consider flexible timing

3. **Consistent Top Performers**
   - Recognition programs
   - Best practice sharing
   - Mentorship opportunities

4. **High Overtime**
   - Workload distribution
   - Hiring needs
   - Process efficiency

5. **Facility Disparities**
   - Compare conditions
   - Resource allocation
   - Management effectiveness

---

## 🎨 Visual Design

### Color Palette:
- **Blue**: Primary, analytics
- **Green**: Success, present
- **Orange**: Warning, late
- **Red**: Error, absent
- **Purple**: Special, overtime

### Card Gradients:
- Total Employees: Blue (500-600)
- Today Present: Green (500-600)
- Today Late: Orange (500-600)
- Today Absent: Red (500-600)
- Attendance Rate: Purple (500-600)

### Badges:
- Success: Green background
- Warning: Orange background
- Error: Red background

---

## 📊 Calculations Reference

### Attendance Rate
```
(Present + Late) / (Present + Late + Absent) × 100
```

### Punctuality Score
```
(Total Days - Late Days) / Total Days × 100
```

### Facility Attendance Rate
```
Present / (Present + Absent) × 100
```

### Average Late Minutes
```
Total Late Minutes / Late Count
```

### Average Overtime Per Day
```
Total Overtime / Overtime Days
```

---

## 🚀 Performance Tips

1. **Use Date Filters**: Limit data range for faster loading
2. **Filter by Facility**: Reduce dataset size
3. **Monitor Loading State**: Shows spinner during fetch
4. **Responsive Design**: Works on all screen sizes

---

## ✅ Summary

The Analytics page provides:
- ✅ Real-time attendance insights
- ✅ Performance rankings and comparisons
- ✅ Facility-wise analysis
- ✅ Overtime tracking
- ✅ Comprehensive employee metrics
- ✅ Interactive filters
- ✅ Visual data representation
- ✅ Actionable insights

**Status**: ✅ **PRODUCTION READY**

---

**Documentation Version**: 1.0.0
**Last Updated**: October 17, 2025
**Feature**: Analytics & Insights
