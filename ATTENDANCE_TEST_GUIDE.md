# Quick Attendance Page Test Guide

## 🚀 Quick Start Test

### Step 1: Start the Application
```bash
# Terminal 1 - Start Backend
cd server
npm start

# Terminal 2 - Start Frontend
cd client
npm start
```

### Step 2: Login
1. Navigate to http://localhost:3000
2. Login with your credentials

### Step 3: Navigate to Attendance
1. Click "Attendance" in the sidebar
2. You should see the Attendance Records page

## ✅ Quick Visual Checks

### 1. Statistics Cards (Top of Page)
You should see **5 colored cards**:
- 🔵 **Blue**: Total Records
- 🟢 **Green**: Present
- 🟡 **Yellow**: Late  
- 🟣 **Purple**: Half Day
- 🔴 **Red**: Absent

✅ Cards show numbers  
✅ Cards have gradient backgrounds  
✅ Cards have icons  

### 2. Action Buttons (Top Right)
You should see **2 buttons**:
- 🔄 **Refresh** (with spinning icon when loading)
- 📥 **Export CSV** (disabled if no records)

### 3. Filters Section
You should see **4 filter inputs**:
- 📅 **Start Date** (defaults to today)
- 📅 **End Date** (defaults to today)
- 🏢 **Facility** (dropdown with your facilities)
- 🏷️ **Status** (dropdown: All, Present, Absent, Late, Half Day, On Leave)

### 4. Attendance Table
Columns:
- Date
- Employee (with photo/avatar)
- Facility
- Check In (with clock icon)
- Check Out (with clock icon)
- Work Hours
- Overtime (blue text)
- Status (colored badge)
- Late (red if late)

## 🧪 Test Scenarios

### Test 1: View Today's Attendance
1. ✅ Page loads with today's date in both date filters
2. ✅ Statistics cards show correct counts
3. ✅ Table shows attendance records
4. ✅ Employee photos display (or avatar icon if no photo)

### Test 2: Filter by Date Range
1. Change Start Date to 7 days ago
2. Keep End Date as today
3. ✅ Statistics update automatically
4. ✅ Table shows last 7 days of records

### Test 3: Filter by Facility
1. Select a facility from dropdown
2. ✅ Statistics update
3. ✅ Table shows only that facility's records
4. ✅ Facility column shows the selected facility

### Test 4: Filter by Status
1. Select "Present" from Status dropdown
2. ✅ Statistics update (Present count should match Total)
3. ✅ Table shows only present employees
4. ✅ All status badges show "present" in green

### Test 5: Refresh Data
1. Click the Refresh button
2. ✅ Button icon spins during loading
3. ✅ Data reloads
4. ✅ Statistics recalculate

### Test 6: Export to CSV
1. Apply any filters you want
2. Click "Export CSV" button
3. ✅ CSV file downloads
4. ✅ Filename includes today's date (e.g., `attendance_2024-01-15.csv`)
5. ✅ Open file - should contain all filtered records
6. ✅ CSV has correct columns and data

### Test 7: Employee Photos
1. Look at the Employee column
2. ✅ If employee has profile image, it displays as circular photo
3. ✅ If no photo, shows gray circle with user icon
4. ✅ Employee name and ID below/beside photo

### Test 8: Status Badges
Check different status records:
- ✅ **Present**: Green badge
- ✅ **Absent**: Red badge  
- ✅ **Late**: Yellow badge
- ✅ **Half Day**: Blue/info badge
- ✅ **On Leave**: Gray badge

### Test 9: Time Display
1. ✅ Check-in times show in 12-hour format (e.g., "09:30 AM")
2. ✅ Check-out times show in 12-hour format
3. ✅ Clock icons appear before times
4. ✅ "N/A" shows if time is missing

### Test 10: Work Hours & Overtime
1. ✅ Work hours show as decimal (e.g., "8.50 hrs")
2. ✅ Overtime shows in blue (e.g., "1.25 hrs")
3. ✅ Late minutes show in red if employee was late

### Test 11: Empty State
1. Set filters that return no records (e.g., future date)
2. ✅ Table shows "No attendance records found" message
3. ✅ Statistics show all zeros
4. ✅ Export CSV button is disabled

### Test 12: Responsive Design
1. Resize browser window to mobile size
2. ✅ Statistics cards stack vertically
3. ✅ Filter inputs stack vertically
4. ✅ Table becomes horizontally scrollable
5. ✅ Buttons remain accessible

## 🐛 Common Issues & Solutions

### Issue 1: No Records Showing
**Solution**: 
- Check if you have attendance data synced from devices
- Verify date range includes dates with attendance
- Check if your user has access to the facility

### Issue 2: Employee Photos Not Showing
**Solution**:
- Verify employees have `profileImage` field in database
- Check if image URLs are valid
- Fallback user icon should show if photo missing

### Issue 3: Facility Dropdown Empty
**Solution**:
- Check if facilities exist in database
- Verify API endpoint `/api/facilities` works
- Check browser console for errors

### Issue 4: Export CSV Not Working
**Solution**:
- Ensure you have attendance records to export
- Check browser's download settings
- Look for JavaScript errors in console

### Issue 5: Statistics Not Updating
**Solution**:
- Check if `calculateStats()` is called after data fetch
- Verify attendance records have `status` field
- Refresh the page

## 📊 Sample Data Check

### What Good Data Looks Like:
```json
{
  "_id": "...",
  "employee": {
    "employeeId": "EMP001",
    "firstName": "John",
    "lastName": "Doe",
    "profileImage": "data:image/jpeg;base64,..."
  },
  "facility": {
    "name": "Main Office",
    "code": "MO01"
  },
  "date": "2024-01-15T00:00:00.000Z",
  "checkIn": {
    "time": "2024-01-15T09:30:00.000Z"
  },
  "checkOut": {
    "time": "2024-01-15T18:00:00.000Z"
  },
  "workHours": 8.5,
  "overtime": 0.5,
  "status": "present",
  "lateArrival": 0
}
```

## ✨ Expected Behavior Summary

| Feature | Expected Result |
|---------|-----------------|
| Page Load | Shows today's attendance with statistics |
| Date Filter | Auto-refreshes when changed |
| Facility Filter | Shows only selected facility |
| Status Filter | Shows only selected status |
| Refresh Button | Reloads all data |
| Export CSV | Downloads filtered records |
| Employee Photos | Shows photo or fallback icon |
| Status Badges | Color-coded by status |
| Work Hours | Calculated and displayed |
| Overtime | Highlighted in blue |
| Late Arrival | Shown in red if > 0 |
| Empty State | Friendly message when no data |

## 🎯 Success Criteria

✅ **PASS**: All statistics cards display correct numbers  
✅ **PASS**: Filters update data automatically  
✅ **PASS**: Employee photos/avatars render  
✅ **PASS**: CSV export downloads valid file  
✅ **PASS**: Refresh button works  
✅ **PASS**: Status badges are color-coded  
✅ **PASS**: Times formatted in 12-hour format  
✅ **PASS**: Work hours and overtime display  
✅ **PASS**: Responsive on mobile  

---

## 🚨 Quick Troubleshooting

### Backend Issues
```bash
# Check if backend is running
curl http://localhost:5000/api/attendance

# Expected: JSON response with attendance data
```

### Frontend Issues
```bash
# Check browser console for errors
# Press F12 → Console tab

# Look for:
# - API errors (network tab)
# - JavaScript errors (console tab)
# - Missing imports
```

### Database Issues
```bash
# Check if attendance records exist
# Use MongoDB Compass or command line:
db.attendances.find().limit(5)
```

---

**Ready to Test?** Follow the test scenarios above and check off each ✅ as you go!
