# Mathematical Formulas - SABS Attendance Tracking System

**Project**: Smart Attendance & Biometric System (SABS)  
**Date**: January 13, 2026  
**Document Type**: Technical Reference - Mathematical Calculations  

---

## Table of Contents
1. [Time Calculations](#time-calculations)
2. [Attendance Metrics](#attendance-metrics)
3. [Leave Calculations](#leave-calculations)
4. [Analytics & Statistics](#analytics--statistics)
5. [Performance Indicators](#performance-indicators)

---

## 1. TIME CALCULATIONS

### 1.1 Work Hours Calculation

**Formula:**
```
Work Hours = (Check-Out Time - Check-In Time) / 60
```

**Where:**
- Check-In Time = Timestamp when employee clocks in (in minutes)
- Check-Out Time = Timestamp when employee clocks out (in minutes)
- Result is in hours (decimal format)

**Example:**
```
Check-In: 08:00 AM (480 minutes from midnight)
Check-Out: 05:00 PM (1020 minutes from midnight)
Work Hours = (1020 - 480) / 60 = 540 / 60 = 9.0 hours
```

**JavaScript Implementation:**
```javascript
const workMinutes = moment(checkOutTime).diff(moment(checkInTime), 'minutes');
const workHours = Math.max(0, workMinutes / 60);
```

**Rounding:**
```
Work Hours (Rounded) = Math.round(workHours * 100) / 100
```
This rounds to 2 decimal places (e.g., 8.75 hours)

---

### 1.2 Net Work Hours (After Break Deductions)

**Formula:**
```
Total Minutes = (Check-Out Time - Check-In Time) [in milliseconds]
Total Break Time = Σ(Break Duration) for all breaks
Net Work Minutes = Total Minutes - Total Break Time
Net Work Hours = Net Work Minutes / 60
```

**Where:**
- Total Minutes = Time difference in milliseconds converted to minutes
- Break Duration = Duration of each break in minutes
- Σ = Summation symbol (sum of all breaks)

**Example:**
```
Total Work Minutes = 540 minutes (9 hours)
Break 1 = 30 minutes (lunch)
Break 2 = 15 minutes (tea break)
Total Break Time = 30 + 15 = 45 minutes
Net Work Hours = (540 - 45) / 60 = 495 / 60 = 8.25 hours
```

**JavaScript Implementation:**
```javascript
let totalMinutes = (checkOutTime - checkInTime) / (1000 * 60);

if (breaks && breaks.length > 0) {
  const totalBreakTime = breaks.reduce((acc, brk) => acc + (brk.duration || 0), 0);
  totalMinutes -= totalBreakTime;
}

const netWorkHours = parseFloat((totalMinutes / 60).toFixed(2));
```

---

### 1.3 Late Arrival Calculation

**Formula:**
```
Late Minutes = Actual Check-In Time - Scheduled Check-In Time
Late Arrival (minutes) = Max(0, Late Minutes)
```

**Where:**
- Actual Check-In Time = Timestamp when employee actually checked in
- Scheduled Check-In Time = Expected shift start time
- Max(0, x) ensures negative values (early arrivals) are set to 0

**Classification:**
```
On-Time: Late Minutes ≤ 0
Late: Late Minutes > 0
```

**Example:**
```
Scheduled Check-In: 08:00 AM
Actual Check-In: 08:25 AM
Late Minutes = 25 minutes

Late Arrival = 25 minutes
Status = "Late"
```

**JavaScript Implementation:**
```javascript
const scheduledTime = new Date(scheduledCheckIn);
const actualTime = new Date(checkIn.time);
const lateMinutes = (actualTime - scheduledTime) / (1000 * 60);
const lateArrival = Math.max(0, lateMinutes);
```

---

### 1.4 Overtime Calculation

**Formula:**
```
Overtime = Work Hours - Expected Hours (if Work Hours > Expected Hours)
Overtime = 0 (if Work Hours ≤ Expected Hours)
```

**Alternative (Conditional):**
```
Overtime = {
  Work Hours - Expected Hours,  if Work Hours > Expected Hours
  0,                            otherwise
}
```

**Where:**
- Work Hours = Calculated work duration
- Expected Hours = Standard shift duration (usually 8 hours for PHC)

**Example:**
```
Work Hours = 10.5 hours
Expected Hours = 8 hours
Overtime = 10.5 - 8 = 2.5 hours
```

**JavaScript Implementation:**
```javascript
const expectedHours = shift?.workingHours || 8;

if (workHours > expectedHours) {
  overtime = workHours - expectedHours;
} else {
  overtime = 0;
}
```

---

### 1.5 Undertime Calculation

**Formula:**
```
Undertime = Expected Hours - Work Hours (if Work Hours < Expected Hours - Grace Period)
Undertime = 0 (if Work Hours ≥ Expected Hours - Grace Period)
```

**Where:**
- Grace Period = Tolerance threshold (typically 1 hour)
- Expected Hours = Standard shift duration

**Example:**
```
Work Hours = 6.5 hours
Expected Hours = 8 hours
Grace Period = 1 hour
Undertime = 8 - 6.5 = 1.5 hours
```

**JavaScript Implementation:**
```javascript
const expectedHours = shift?.workingHours || 8;
const gracePeriod = 1;

if (workHours < (expectedHours - gracePeriod)) {
  undertime = expectedHours - workHours;
} else {
  undertime = 0;
}
```

---

## 2. ATTENDANCE METRICS

### 2.1 Attendance Rate

**Formula:**
```
Attendance Rate = (Present Days / Total Working Days) × 100%
```

**Where:**
- Present Days = Number of days employee was present
- Total Working Days = Total number of expected working days in period

**Example:**
```
Present Days = 22
Total Working Days = 26
Attendance Rate = (22 / 26) × 100 = 84.62%
```

**JavaScript Implementation:**
```javascript
const attendanceRate = Math.round((presentDays / totalWorkingDays) * 100);
```

---

### 2.2 Punctuality Rate

**Formula:**
```
Punctuality Rate = (On-Time Arrivals / Total Arrivals) × 100%
```

**Where:**
- On-Time Arrivals = Number of times employee arrived on time or early
- Total Arrivals = Total number of check-ins in the period

**Example:**
```
On-Time Arrivals = 20
Total Arrivals = 25
Punctuality Rate = (20 / 25) × 100 = 80%
```

**JavaScript Implementation:**
```javascript
const totalArrivals = todayStats.present + todayStats.late;
const punctualityRate = totalArrivals > 0
  ? Math.round((todayStats.present / totalArrivals) * 100)
  : 0;
```

---

### 2.3 Absence Rate

**Formula:**
```
Absence Rate = (Absent Days / Total Working Days) × 100%
```

**Where:**
- Absent Days = Number of days employee was absent
- Total Working Days = Total number of expected working days

**Example:**
```
Absent Days = 4
Total Working Days = 26
Absence Rate = (4 / 26) × 100 = 15.38%
```

**Calculation of Absent Count:**
```
Total Employees = Count of all active employees
Employees Present = Count of employees with attendance records
Absent = Total Employees - Employees Present
```

**JavaScript Implementation:**
```javascript
const totalEmployees = await Employee.countDocuments({ 
  facility: facilityFilter, 
  status: 'active' 
});

const employeesPresent = new Set(
  todayAggregated.map(a => a.employee._id.toString())
).size;

const absent = totalEmployees - employeesPresent;
```

---

### 2.4 Average Work Hours

**Formula:**
```
Average Work Hours = Σ(Work Hours) / Number of Employees
```

**Where:**
- Σ(Work Hours) = Sum of all work hours for all employees
- Number of Employees = Total count of employees who worked

**Example:**
```
Employee 1: 8.5 hours
Employee 2: 9.0 hours
Employee 3: 7.5 hours
Average = (8.5 + 9.0 + 7.5) / 3 = 25.0 / 3 = 8.33 hours
```

**JavaScript Implementation:**
```javascript
const totalWorkHours = Math.round(
  aggregatedRecords.reduce((sum, a) => sum + (a.workHours || 0), 0) * 100
) / 100;

const averageWorkHours = totalWorkHours / employeeCount;
```

---

### 2.5 Total Overtime (Facility Level)

**Formula:**
```
Total Overtime = Σ(Individual Overtime) for all employees
```

**Where:**
- Individual Overtime = Overtime hours for each employee
- Σ = Summation across all employees

**Example:**
```
Employee 1 Overtime: 1.5 hours
Employee 2 Overtime: 0 hours
Employee 3 Overtime: 2.0 hours
Total Overtime = 1.5 + 0 + 2.0 = 3.5 hours
```

**JavaScript Implementation:**
```javascript
const totalOvertime = Math.round(
  aggregatedRecords.reduce((sum, a) => sum + (a.overtime || 0), 0) * 100
) / 100;
```

---

## 3. LEAVE CALCULATIONS

### 3.1 Leave Duration (Full Days)

**Formula:**
```
Leave Duration = (End Date - Start Date) + 1 day
```

**Where:**
- End Date = Last day of leave
- Start Date = First day of leave
- +1 is added to include both start and end dates

**Example:**
```
Start Date: January 10, 2026
End Date: January 15, 2026
Duration = (15 - 10) + 1 = 6 days
```

**JavaScript Implementation:**
```javascript
const startDate = moment(leaveRequest.startDate);
const endDate = moment(leaveRequest.endDate);
const duration = endDate.diff(startDate, 'days') + 1;
```

---

### 3.2 Leave Duration (Time-Based)

**Formula:**
```
Leave Duration = (End Time - Start Time) / 60 minutes
```

**Where:**
- End Time = Leave end time (in minutes from midnight)
- Start Time = Leave start time (in minutes from midnight)
- Result is in hours

**Example:**
```
Start Time: 09:00 AM (540 minutes)
End Time: 02:00 PM (840 minutes)
Duration = (840 - 540) / 60 = 300 / 60 = 5 hours
```

**JavaScript Implementation:**
```javascript
const startTime = moment(leaveRequest.startTime);
const endTime = moment(leaveRequest.endTime);
const durationHours = endTime.diff(startTime, 'hours', true);
```

---

### 3.3 Leave Balance

**Formula:**
```
Remaining Balance = Annual Entitlement - Used Leave Days
```

**Where:**
- Annual Entitlement = Total leave days allocated per year (e.g., 21 days)
- Used Leave Days = Sum of all approved leave days in current year

**Example:**
```
Annual Entitlement: 21 days
Used Leave (Jan-Jun): 8 days
Remaining Balance = 21 - 8 = 13 days
```

**JavaScript Implementation:**
```javascript
const usedLeaveDays = await LeaveRequest.aggregate([
  {
    $match: {
      employee: employeeId,
      status: 'approved',
      startDate: { $gte: yearStart, $lte: yearEnd }
    }
  },
  {
    $group: {
      _id: null,
      totalDays: { $sum: '$duration' }
    }
  }
]);

const remainingBalance = annualEntitlement - (usedLeaveDays[0]?.totalDays || 0);
```

---

## 4. ANALYTICS & STATISTICS

### 4.1 Percentage Calculation (General)

**Formula:**
```
Percentage = (Part / Whole) × 100%
```

**Where:**
- Part = Subset count
- Whole = Total count

**Example:**
```
Late Arrivals = 5
Total Employees = 25
Late Percentage = (5 / 25) × 100 = 20%
```

---

### 4.2 Attendance Distribution

**Formula:**
```
Present % = (Present / Total Employees) × 100
Late % = (Late / Total Employees) × 100
Absent % = (Absent / Total Employees) × 100
```

**Verification:**
```
Present % + Late % + Absent % = 100%
```

**Example:**
```
Total Employees = 50
Present = 35 → 35/50 × 100 = 70%
Late = 10 → 10/50 × 100 = 20%
Absent = 5 → 5/50 × 100 = 10%
Total = 70% + 20% + 10% = 100% ✓
```

---

### 4.3 Trend Analysis (Daily Average)

**Formula:**
```
Daily Average = Σ(Daily Values) / Number of Days
```

**Where:**
- Daily Values = Metric value for each day
- Number of Days = Total days in analysis period

**Example (Average Daily Attendance):**
```
Day 1: 45 employees
Day 2: 48 employees
Day 3: 42 employees
Day 4: 47 employees
Day 5: 43 employees
Average = (45 + 48 + 42 + 47 + 43) / 5 = 225 / 5 = 45 employees/day
```

---

### 4.4 Growth Rate

**Formula:**
```
Growth Rate = ((New Value - Old Value) / Old Value) × 100%
```

**Where:**
- New Value = Metric in current period
- Old Value = Metric in previous period

**Example:**
```
Previous Month Attendance: 85%
Current Month Attendance: 92%
Growth = ((92 - 85) / 85) × 100 = (7 / 85) × 100 = 8.24%
```

---

## 5. PERFORMANCE INDICATORS

### 5.1 Employee Performance Score

**Formula:**
```
Performance Score = (w₁ × Attendance) + (w₂ × Punctuality) + (w₃ × Work Hours)
```

**Where:**
- w₁, w₂, w₃ = Weights (must sum to 1.0)
- Attendance = Attendance rate (0-100)
- Punctuality = Punctuality rate (0-100)
- Work Hours = Work hours compliance (0-100)

**Example (Equal Weights):**
```
w₁ = w₂ = w₃ = 0.333
Attendance = 95%
Punctuality = 80%
Work Hours Compliance = 90%
Performance = (0.333 × 95) + (0.333 × 80) + (0.333 × 90)
           = 31.64 + 26.64 + 29.97
           = 88.25%
```

---

### 5.2 Facility Efficiency Index

**Formula:**
```
Efficiency Index = (Actual Work Hours / Expected Work Hours) × 100%
```

**Where:**
- Actual Work Hours = Total work hours logged by all employees
- Expected Work Hours = Total employees × Expected hours per employee

**Example:**
```
Total Employees = 30
Expected Hours per Employee = 8
Expected Total = 30 × 8 = 240 hours
Actual Total = 228 hours
Efficiency = (228 / 240) × 100 = 95%
```

---

### 5.3 Late Arrival Severity Index

**Formula:**
```
Severity Index = Σ(Late Minutes) / (Late Count × 60)
```

**Where:**
- Σ(Late Minutes) = Sum of all late arrival minutes
- Late Count = Number of late arrivals
- 60 = Conversion factor to hours

**Example:**
```
Late Arrival 1: 15 minutes
Late Arrival 2: 30 minutes
Late Arrival 3: 45 minutes
Sum = 90 minutes
Count = 3
Severity = 90 / (3 × 60) = 90 / 180 = 0.5 hours average lateness
```

---

## 6. SPECIALIZED CALCULATIONS

### 6.1 Break Time Accumulation

**Formula:**
```
Total Break Time = Σ Break Duration for all breaks
```

**JavaScript Implementation:**
```javascript
const totalBreakTime = breaks.reduce((acc, brk) => {
  return acc + (brk.duration || 0);
}, 0);
```

---

### 6.2 Scheduled Hours Calculation

**Formula:**
```
Scheduled Minutes = (Scheduled Check-Out - Scheduled Check-In) / 1000 / 60
Scheduled Hours = Scheduled Minutes / 60
```

**JavaScript Implementation:**
```javascript
const scheduledMinutes = (new Date(scheduledCheckOut) - new Date(scheduledCheckIn)) / (1000 * 60);
const scheduledHours = scheduledMinutes / 60;
```

---

### 6.3 Rounding Functions

**Two Decimal Places:**
```
Value (2dp) = Math.round(value × 100) / 100
```

**Example:**
```
8.756 → Math.round(8.756 × 100) / 100 = Math.round(875.6) / 100 = 876 / 100 = 8.76
```

**JavaScript Implementation:**
```javascript
const rounded = parseFloat(value.toFixed(2));
// or
const rounded = Math.round(value * 100) / 100;
```

---

## 7. STATISTICAL AGGREGATIONS

### 7.1 Sum (Σ)

**Formula:**
```
Sum = x₁ + x₂ + x₃ + ... + xₙ
    = Σxᵢ for i=1 to n
```

**JavaScript Implementation:**
```javascript
const sum = array.reduce((total, current) => total + current, 0);
```

---

### 7.2 Count

**Formula:**
```
Count = Number of elements in set
```

**JavaScript Implementation:**
```javascript
const count = array.length;
// or for unique count
const uniqueCount = new Set(array).size;
```

---

### 7.3 Average (Mean)

**Formula:**
```
Average = Σxᵢ / n
```

**Where:**
- n = Count of elements
- Σxᵢ = Sum of all elements

**JavaScript Implementation:**
```javascript
const average = array.reduce((sum, val) => sum + val, 0) / array.length;
```

---

### 7.4 Maximum and Minimum

**Formulas:**
```
Maximum = Max(x₁, x₂, x₃, ..., xₙ)
Minimum = Min(x₁, x₂, x₃, ..., xₙ)
```

**JavaScript Implementation:**
```javascript
const maximum = Math.max(...array);
const minimum = Math.min(...array);
```

---

## 8. TIME CONVERSION FORMULAS

### 8.1 Milliseconds to Minutes

**Formula:**
```
Minutes = Milliseconds / (1000 × 60)
```

**Example:**
```
1,800,000 milliseconds = 1,800,000 / 60,000 = 30 minutes
```

---

### 8.2 Milliseconds to Hours

**Formula:**
```
Hours = Milliseconds / (1000 × 60 × 60)
```

**Example:**
```
14,400,000 milliseconds = 14,400,000 / 3,600,000 = 4 hours
```

---

### 8.3 Minutes to Hours

**Formula:**
```
Hours = Minutes / 60
```

**Example:**
```
150 minutes = 150 / 60 = 2.5 hours
```

---

## 9. VALIDATION FORMULAS

### 9.1 Non-Negative Constraint

**Formula:**
```
Value = Max(0, Calculated Value)
```

This ensures values like late arrivals are never negative.

---

### 9.2 Percentage Bounds

**Formula:**
```
Percentage = Min(100, Max(0, (Part / Whole) × 100))
```

This ensures percentages are always between 0% and 100%.

---

## 10. CONSTANTS USED

| Constant | Value | Description |
|----------|-------|-------------|
| MINUTES_PER_HOUR | 60 | Minutes in one hour |
| MS_PER_MINUTE | 60,000 | Milliseconds in one minute |
| MS_PER_HOUR | 3,600,000 | Milliseconds in one hour |
| EXPECTED_WORK_HOURS | 8 | Standard PHC work hours |
| GRACE_PERIOD | 1 | Undertime grace period (hours) |
| DECIMAL_PLACES | 2 | Rounding precision for hours |
| ANNUAL_LEAVE_DAYS | 21 | Standard annual leave entitlement |

---

## 11. FORMULA SUMMARY TABLE

| Metric | Formula | Unit |
|--------|---------|------|
| Work Hours | (Check-Out - Check-In) / 60 | Hours |
| Late Arrival | Max(0, Actual - Scheduled) | Minutes |
| Overtime | Max(0, Work Hours - Expected) | Hours |
| Undertime | Max(0, Expected - Work Hours) | Hours |
| Attendance Rate | (Present / Total Days) × 100 | Percentage |
| Punctuality Rate | (On-Time / Total) × 100 | Percentage |
| Leave Duration | (End Date - Start Date) + 1 | Days |
| Average Work Hours | Σ(Work Hours) / Count | Hours |
| Total Break Time | Σ(Break Durations) | Minutes |

---

## 12. IMPLEMENTATION NOTES

### Precision
- All time calculations use 2 decimal places for hours
- Percentages are rounded to whole numbers
- Minutes are stored as integers

### Edge Cases
- Negative values are prevented using `Math.max(0, value)`
- Division by zero is handled with ternary operators
- Missing data defaults to 0

### Performance
- Aggregations use JavaScript `reduce()` for efficiency
- Database queries use MongoDB aggregation pipeline
- Indexing on employee and date fields for faster queries

---

## APPENDIX A: JavaScript Helper Functions

### roundToTwoDecimals
```javascript
function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}
```

### calculateWorkHours
```javascript
function calculateWorkHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const minutes = moment(checkOut).diff(moment(checkIn), 'minutes');
  return Math.max(0, minutes / 60);
}
```

### calculatePercentage
```javascript
function calculatePercentage(part, whole) {
  if (!whole || whole === 0) return 0;
  return Math.round((part / whole) * 100);
}
```

---

## APPENDIX B: Formula Verification Examples

### Example 1: Full Day Work Calculation
```
Input:
- Check-In: 08:00 AM
- Check-Out: 05:00 PM (17:00)
- Lunch Break: 30 minutes

Calculation:
Total Minutes = (17:00 - 08:00) × 60 = 9 × 60 = 540 minutes
Net Minutes = 540 - 30 = 510 minutes
Work Hours = 510 / 60 = 8.5 hours

Result: 8.50 hours
```

### Example 2: Late Arrival with Overtime
```
Input:
- Scheduled: 08:00 AM
- Actual Check-In: 08:25 AM
- Check-Out: 06:00 PM (18:00)
- Expected Hours: 8

Calculations:
Late Minutes = 25 minutes
Work Hours = (18:00 - 08:25) = 9.583 hours
Overtime = 9.583 - 8 = 1.583 hours

Results:
- Late Arrival: 25 minutes
- Work Hours: 9.58 hours
- Overtime: 1.58 hours
```

### Example 3: Monthly Attendance Rate
```
Input:
- Working Days in Month: 26
- Present: 22 days
- Late: 2 days
- Absent: 2 days

Calculations:
Total Attendance = Present + Late = 22 + 2 = 24 days
Attendance Rate = (24 / 26) × 100 = 92.31%
Punctuality Rate = (22 / 24) × 100 = 91.67%

Results:
- Attendance Rate: 92%
- Punctuality Rate: 92%
```

---

**Document End**

*This document contains all mathematical formulas used in the SABS Attendance Tracking System. For implementation details, refer to the source code in the controllers and models directories.*

**Note**: To convert this document to Microsoft Word format:
1. Save this file as .md
2. Use Pandoc: `pandoc MATHEMATICAL_FORMULAS.md -o MATHEMATICAL_FORMULAS.docx`
3. Or open in Microsoft Word and save as .docx
