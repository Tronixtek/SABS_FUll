# Quick Reports Page Test Guide

## 🚀 Quick Start Test

### Prerequisites
- Server running (backend + frontend)
- Logged in to the application
- Have some attendance data in the system

### Step 1: Navigate to Reports
1. Click "Reports" in the sidebar
2. You should see the Reports page

## ✅ Quick Visual Checks

### 1. Header Section
You should see:
- 📄 **Reports** heading with icon
- **Export CSV** button (disabled initially)
- **Export PDF** button (disabled initially)

### 2. Report Type Buttons
Three buttons in a row:
- **Daily Report** (blue if selected)
- **Monthly Report** (outlined if not selected)
- **Custom Report** (outlined if not selected)

### 3. Filter Section
Changes based on report type:
- **Daily**: Date picker + Facility dropdown
- **Monthly**: Month + Year + Facility dropdown
- **Custom**: Start Date + End Date + Facility dropdown

### 4. Generate Report Button
- Blue "Generate Report" button
- Shows "Generating..." when loading

## 🧪 Test Scenarios

### Test 1: Generate Daily Report
1. ✅ Click "Daily Report" button
2. ✅ Select today's date
3. ✅ Select a facility (or leave "All Facilities")
4. ✅ Click "Generate Report"
5. ✅ Loading state shows
6. ✅ Statistics cards appear (4 cards)
7. ✅ Report table displays with data
8. ✅ Export buttons become enabled

**Expected Statistics:**
- 🔵 **Total Employees**: Shows total count
- 🟢 **Present**: Shows count + percentage
- 🟡 **Late**: Shows count + percentage
- 🔴 **Absent**: Shows count + percentage

### Test 2: Generate Monthly Report
1. ✅ Click "Monthly Report" button
2. ✅ Select month from dropdown
3. ✅ Enter year (e.g., 2024)
4. ✅ Select a facility (optional)
5. ✅ Click "Generate Report"
6. ✅ Statistics and table display
7. ✅ Report title shows "Monthly Report - January 2024"

### Test 3: Generate Custom Report
1. ✅ Click "Custom Report" button
2. ✅ Select start date (e.g., 7 days ago)
3. ✅ Select end date (today)
4. ✅ Select a facility (optional)
5. ✅ Click "Generate Report"
6. ✅ Statistics and table display
7. ✅ Report title shows date range

### Test 4: Statistics Cards
After generating a report:
- ✅ Total Employees card shows correct count with blue theme
- ✅ Present card shows count and percentage with green theme
- ✅ Late card shows count and percentage with yellow theme
- ✅ Absent card shows count and percentage with red theme
- ✅ All cards have gradient backgrounds
- ✅ Icons appear in each card

### Test 5: Report Table
Check the table display:
- ✅ Employee ID column populated
- ✅ Employee photos display (or avatar if no photo)
- ✅ Department and Designation shown
- ✅ Facility name displayed
- ✅ Check-in time with clock icon
- ✅ Check-out time with clock icon
- ✅ Work hours calculated and displayed
- ✅ Status badge color-coded:
  - Green = Present
  - Red = Absent
  - Yellow = Late
  - Blue = Half Day

### Test 6: Absent Employees Section
If there are absent employees:
- ✅ Section appears below main table
- ✅ Heading shows "Absent Employees (X)"
- ✅ Red-themed cards for each absent employee
- ✅ Employee photo or avatar displayed
- ✅ Employee name and ID shown
- ✅ Cards arranged in responsive grid

### Test 7: Export to CSV
1. Generate a report first
2. ✅ "Export CSV" button enabled
3. ✅ Click "Export CSV"
4. ✅ Success toast appears
5. ✅ CSV file downloads
6. ✅ Filename format: `report_daily_2024-01-15.csv`
7. ✅ Open file - verify data:
   - Employee ID
   - Name
   - Department
   - Designation
   - Facility
   - Status
   - Check In/Out times
   - Work Hours
   - Overtime

### Test 8: PDF Export
1. Generate a report first
2. ✅ "Export PDF" button enabled
3. ✅ Click "Export PDF"
4. ✅ Success toast appears
5. ✅ PDF file downloads
6. ✅ Filename format: `report_daily_2024-01-15.pdf`
7. ✅ Open PDF and verify:
   - Report title and date
   - Summary statistics table (4 rows)
   - Attendance records table with all columns
   - Absent employees section (if applicable)
   - Professional formatting with blue headers
   - Proper alignment and spacing
   - Multiple pages for large reports

### Test 9: Facility Filter
1. Select "Daily Report"
2. Choose a specific facility
3. Click "Generate Report"
4. ✅ Only records from selected facility shown
5. ✅ Statistics reflect filtered data
6. Change to "All Facilities"
7. Click "Generate Report"
8. ✅ All facilities' records shown

### Test 10: Empty State
1. Select a future date (no data)
2. Click "Generate Report"
3. ✅ Statistics show zeros
4. ✅ Table shows "No data available for the selected period"
5. ✅ Export buttons disabled

### Test 11: Report Titles
Check contextual titles:
- ✅ Daily: "Daily Report - Jan 15, 2024"
- ✅ Monthly: "Monthly Report - January 2024"
- ✅ Custom: "Custom Report - 2024-01-01 to 2024-01-31"
- ✅ Record count displayed (e.g., "45 records found")

### Test 12: Responsive Design
1. Resize browser to mobile size
2. ✅ Report type buttons stack vertically
3. ✅ Statistics cards stack vertically
4. ✅ Filter inputs stack vertically
5. ✅ Table scrolls horizontally
6. ✅ Absent employee cards stack vertically

## 🐛 Common Issues & Solutions

### Issue 1: No Data After Generating Report
**Solution**:
- Verify attendance records exist for selected date/period
- Check if facility has attendance data
- Ensure backend API is running
- Check browser console for errors

### Issue 2: Facility Dropdown Empty
**Solution**:
- Verify facilities exist in database
- Check API endpoint `/api/facilities`
- Refresh the page
- Check browser console for errors

### Issue 3: Export Buttons Stay Disabled
**Solution**:
- Generate a report first
- Ensure report has data
- Check if `reportData` state is populated
- Look for JavaScript errors in console

### Issue 4: Statistics Show Zeros
**Solution**:
- Verify attendance data exists for the period
- Check if employees are marked with correct status
- Try a different date range
- Check backend response in Network tab

### Issue 5: Photos Not Displaying
**Solution**:
- Verify employees have `profileImage` field
- Check if image URLs are valid
- Fallback avatar should still show
- Check browser console for image load errors

## 📊 Sample Data Structure

### Expected API Response
```json
{
  "success": true,
  "data": {
    "date": "2024-01-15T00:00:00.000Z",
    "totalEmployees": 50,
    "present": 45,
    "absent": 5,
    "late": 3,
    "halfDay": 2,
    "records": [
      {
        "employee": {
          "employeeId": "EMP001",
          "firstName": "John",
          "lastName": "Doe",
          "department": "IT",
          "designation": "Developer",
          "profileImage": "..."
        },
        "facility": {
          "name": "Main Office",
          "code": "MO01"
        },
        "checkIn": {
          "time": "2024-01-15T09:00:00.000Z"
        },
        "checkOut": {
          "time": "2024-01-15T18:00:00.000Z"
        },
        "workHours": 8.5,
        "overtime": 0.5,
        "status": "present"
      }
    ],
    "absentEmployees": [
      {
        "employeeId": "EMP002",
        "firstName": "Jane",
        "lastName": "Smith",
        "profileImage": "..."
      }
    ]
  }
}
```

## ✨ Expected Behavior

| Action | Expected Result |
|--------|-----------------|
| Load Page | Report type buttons and filters shown |
| Select Report Type | Appropriate filters displayed |
| Generate Report | Statistics + table + absent list shown |
| Export CSV | File downloads with correct data |
| Export PDF | "Coming soon" message displayed |
| Change Facility | Filtered data shown |
| Empty Data | Zero stats + empty message |

## 🎯 Success Criteria

✅ **PASS**: All three report types generate successfully  
✅ **PASS**: Statistics cards show correct numbers and percentages  
✅ **PASS**: Report table displays all data correctly  
✅ **PASS**: Employee photos/avatars render  
✅ **PASS**: Absent employees section appears when applicable  
✅ **PASS**: CSV export downloads valid file  
✅ **PASS**: Facility filter works  
✅ **PASS**: Status badges are color-coded  
✅ **PASS**: Responsive on mobile  

## 🚨 Quick Troubleshooting

### Backend Check
```bash
# Test daily report endpoint
curl "http://localhost:5000/api/reports/daily?date=2024-01-15"

# Expected: JSON response with report data
```

### Frontend Check
```
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors
4. Go to Network tab
5. Generate report
6. Check API request/response
```

### Database Check
```javascript
// Check if attendance records exist
db.attendances.find({
  date: ISODate("2024-01-15")
}).limit(5)
```

## 📋 CSV Export Verification

### CSV Should Contain:
- Header row with column names
- One row per attendance record
- Properly formatted dates and times
- All employee information
- Work hours and overtime

### Sample CSV Output:
```csv
Employee ID,Name,Department,Designation,Facility,Status,Check In,Check Out,Work Hours,Overtime
EMP001,John Doe,IT,Developer,Main Office,present,09:00 AM,06:00 PM,8.50,0.50
EMP002,Jane Smith,HR,Manager,Main Office,late,09:15 AM,06:00 PM,8.25,0.25
```

---

**Ready to Test?** Follow the scenarios above and verify each feature works correctly!

## 💡 Pro Tips

1. **Test with Real Data**: Use actual attendance data for realistic results
2. **Try Different Periods**: Test daily, weekly, monthly ranges
3. **Check Edge Cases**: Test with no data, single record, large datasets
4. **Verify Calculations**: Ensure percentages add up correctly
5. **Test All Facilities**: Check single facility vs all facilities
6. **Mobile Testing**: Always test on mobile view
7. **Export Verification**: Open CSV files to verify data accuracy

---

**Status**: ✅ Ready for comprehensive testing!
