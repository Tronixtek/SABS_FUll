# 📘 SABS User Manual
## Smart Attendance & Biometric System

**Version 1.0**  
**Last Updated:** October 2025

---

## 📑 Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Dashboard Overview](#3-dashboard-overview)
4. [Facility Management](#4-facility-management)
5. [Employee Management](#5-employee-management)
6. [Shift Management](#6-shift-management)
7. [Attendance Tracking](#7-attendance-tracking)
8. [Reports & Analytics](#8-reports--analytics)
9. [Data Synchronization](#9-data-synchronization)
10. [Troubleshooting](#10-troubleshooting)
11. [FAQ](#11-faq)
12. [Contact & Support](#12-contact--support)

---

## 1. Introduction

### 1.1 What is SABS?

**SABS (Smart Attendance & Biometric System)** is a comprehensive workforce management solution that automates employee attendance tracking through biometric devices. The system provides real-time monitoring of:

- ✅ Employee check-in/check-out times
- ✅ Work hours calculation
- ✅ Break time tracking and compliance
- ✅ Overtime monitoring
- ✅ Attendance reports and analytics

### 1.2 Who Should Use This Manual?

This manual is designed for:
- **System Administrators** - Full system access and configuration
- **HR Managers** - Employee and attendance management
- **Facility Managers** - Facility-specific oversight
- **Supervisors** - Team attendance monitoring

### 1.3 System Requirements

**To access SABS, you need:**
- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Internet connection
- Login credentials (username and password)
- Biometric device connected to your facility (for attendance capture)

---

## 2. Getting Started

### 2.1 Accessing the System

**Step 1: Open Your Browser**
- Navigate to your SABS URL (e.g., `https://your-company-sabs.com`)

**Step 2: Login**
1. Enter your **username/email**
2. Enter your **password**
3. Click **"Login"** button

**First-time Login:**
- You'll receive credentials from your system administrator
- You'll be prompted to change your password on first login

### 2.2 Understanding User Roles

| Role | Permissions |
|------|-------------|
| **Super Admin** | Full system access, manage all facilities, users, and settings |
| **Admin** | Manage assigned facilities, employees, and attendance |
| **Manager** | View reports, manage team attendance |
| **Supervisor** | View team attendance only |

### 2.3 Navigating the Interface

**Main Navigation Menu:**
```
📊 Dashboard      - Overview and statistics
🏢 Facilities     - Manage locations and devices
👥 Employees      - Employee profiles and records
⏰ Shifts         - Work schedules and breaks
📋 Attendance     - Daily attendance records
📈 Reports        - Analytics and exports
⚙️ Settings       - System configuration
```

---

## 3. Dashboard Overview

### 3.1 What You'll See

The Dashboard provides a quick overview of your organization's attendance status.

**Key Metrics:**
- **Total Employees** - Active workforce count
- **Present Today** - Currently checked-in employees
- **Absent Today** - Employees who haven't checked in
- **Late Arrivals** - Employees who arrived after grace period
- **On Break** - Employees currently on break

### 3.2 Real-time Updates

The dashboard refreshes automatically every 5 minutes to show:
- Latest attendance records
- Recent check-ins
- Active breaks
- System sync status

### 3.3 Quick Actions

From the dashboard, you can:
- 🔍 Search for specific employees
- 📊 View detailed reports
- ⚡ Manual attendance entry (for exceptions)
- 🔄 Force sync with biometric devices

---

## 4. Facility Management

### 4.1 What is a Facility?

A **Facility** represents a physical location (office, branch, factory) with its own biometric device for attendance capture.

### 4.2 Viewing Facilities

**Navigate:** `🏢 Facilities` from main menu

You'll see a list of all facilities with:
- Facility name
- Location/address
- Device status (Online/Offline)
- Total employees assigned
- Last sync time

### 4.3 Adding a New Facility

**Step-by-Step:**

1. Click **"+ Add Facility"** button
2. Fill in required information:

**Basic Information:**
```
Facility Name:     [e.g., "Head Office Lagos"]
Location:          [Full address]
Timezone:          [Select from dropdown]
Status:            [Active/Inactive]
```

**Device Configuration:**
```
Device API URL:    [Provided by device manufacturer]
User API URL:      [For syncing employee data]
Device API Key:    [Authentication key]
Device ID:         [Auto-captured during first sync]
Device Model:      [Auto-captured]
```

**Sync Settings:**
```
☑️ Enable Auto Sync
Sync Interval:     [5 minutes] (default)
```

3. Click **"Save Facility"**

### 4.4 Editing a Facility

1. Find the facility in the list
2. Click **"Edit"** icon (✏️)
3. Modify required fields
4. Click **"Update"**

### 4.5 Testing Device Connection

**To verify device connectivity:**

1. Open facility details
2. Click **"Test Connection"** button
3. System will attempt to:
   - Connect to device API
   - Fetch sample data
   - Display connection status

**Success Indicators:**
- ✅ Green status badge
- Device ID captured
- Last sync time updated

**Failure Indicators:**
- ❌ Red status badge
- Error message displayed
- Check troubleshooting section

---

## 5. Employee Management

### 5.1 Understanding Employee Records

Each employee record contains:
- **Personal Information** (name, contact, photo)
- **Employment Details** (ID, position, department, hire date)
- **Biometric Data** (Face ID, RFID card, fingerprints)
- **Shift Assignment**
- **Facility Assignment**

### 5.2 Viewing Employees

**Navigate:** `👥 Employees` from main menu

**Filter Options:**
- By Facility
- By Department
- By Status (Active/Inactive)
- By Shift
- Search by name or employee ID

### 5.3 Adding a New Employee

**Method 1: Manual Entry**

1. Click **"+ Add Employee"** button
2. Fill in the form:

**Personal Information:**
```
First Name:        [Required]
Last Name:         [Required]
Email:             [Optional]
Phone:             [Optional]
Employee ID:       [Auto-generated or manual]
```

**Employment Details:**
```
Position:          [e.g., "Software Engineer"]
Department:        [e.g., "Engineering"]
Hire Date:         [Select date]
Status:            [Active/Inactive]
```

**Facility & Shift:**
```
Assigned Facility: [Select from dropdown]
Assigned Shift:    [Select from dropdown]
```

**Biometric Data:**
```
Device ID:         [personUUID from device]
RFID Card Number:  [Optional]
Face ID:           [Auto-captured from device]
```

3. Click **"Save Employee"**

**Method 2: Auto-Sync from Device**

Employees registered on the biometric device are automatically synced to SABS:

1. Register employee on biometric device first
2. Wait for next sync cycle (or force sync)
3. Employee appears in SABS automatically
4. Edit record to add additional details

### 5.4 Editing Employee Records

1. Find employee in the list
2. Click employee name or **"Edit"** icon
3. Update required fields
4. Click **"Update"**

### 5.5 Employee Status

- **Active** - Currently working, attendance tracked
- **Inactive** - Not currently working (on leave, terminated)
- **Suspended** - Temporarily disabled

### 5.6 Biometric Data Management

**Understanding Biometric IDs:**

| Field | Description | Example |
|-------|-------------|---------|
| **Device ID (personUUID)** | Unique identifier from device | `1760669812601-IF0TTH5` |
| **RFID Card** | Physical card number | `12345` |
| **Face ID** | Face recognition data | `FACE001` |

**Important Notes:**
- ⚠️ Device ID is the primary identifier for attendance matching
- ⚠️ Each employee must have at least one biometric identifier
- ⚠️ Duplicate IDs will cause sync errors

---

## 6. Shift Management

### 6.1 What is a Shift?

A **Shift** defines:
- Working hours (start/end time)
- Break schedules
- Grace periods
- Work hour requirements

### 6.2 Viewing Shifts

**Navigate:** `⏰ Shifts` from main menu

You'll see:
- Shift name
- Working hours
- Number of employees assigned
- Facility

### 6.3 Creating a New Shift

**Step 1: Basic Information**

```
Shift Name:        [e.g., "Morning Shift"]
Facility:          [Select facility]
Start Time:        [09:00 AM]
End Time:          [05:00 PM]
Working Hours:     [8 hours] (auto-calculated)
☑️ Set as Default Shift
```

**Step 2: Grace Periods**

Grace periods allow flexibility in attendance marking:

```
Check-in Grace:    [15 minutes]
  (Employee can arrive 15 min late without being marked "Late")

Check-out Grace:   [15 minutes]
  (Employee can leave 15 min early without penalty)
```

**Step 3: Break Configuration**

☑️ **Enable Break Tracking**

**Adding Breaks:**

Click **"+ Add Break"** for each break period:

**Break 1: Lunch Break**
```
Break Name:        [Lunch Break]
Break Type:        [Lunch]
Duration:          [60 minutes]
Max Duration:      [90 minutes]
Start Window:      [12:00 PM]
End Window:        [02:00 PM]
☑️ Paid Break
☑️ Required
```

**Break 2: Tea Break**
```
Break Name:        [Morning Tea]
Break Type:        [Tea]
Duration:          [15 minutes]
Max Duration:      [20 minutes]
Start Window:      [10:00 AM]
End Window:        [11:00 AM]
☑️ Paid Break
☐ Required
```

**Break 3: Prayer Break**
```
Break Name:        [Prayer Time]
Break Type:        [Prayer]
Duration:          [10 minutes]
Max Duration:      [15 minutes]
Start Window:      [01:00 PM]
End Window:        [02:00 PM]
☑️ Paid Break
☐ Required
```

**Step 4: Weekend & Holidays**

```
Weekends:          [☑️ Saturday  ☑️ Sunday]
Public Holidays:   [Add custom holidays]
```

**Step 5: Save**

Click **"Create Shift"** button

### 6.4 Understanding Break Types

| Break Type | Purpose | Typical Duration |
|------------|---------|------------------|
| **Lunch** | Meal break | 30-60 minutes |
| **Tea** | Coffee/snack break | 10-15 minutes |
| **Prayer** | Religious observance | 10-15 minutes |
| **Smoking** | Smoking break | 5-10 minutes |
| **Rest** | General rest period | 15-30 minutes |
| **Custom** | Other purposes | Variable |

### 6.5 Break Windows Explained

**Start Window & End Window** define when employees can take breaks:

**Example:**
```
Lunch Break:
  Start Window: 12:00 PM
  End Window:   02:00 PM
  Duration:     60 minutes
```

This means:
- Employees can start lunch anytime between 12:00 PM - 2:00 PM
- Break must last approximately 60 minutes
- If break exceeds max duration (90 min), it's flagged as "Exceeded"

### 6.6 Break Compliance

The system monitors break compliance:

- **Compliant** ✅ - Break within expected duration (±50%)
- **Insufficient** ⚠️ - Break too short (less than 50% of scheduled)
- **Exceeded** ❌ - Break too long (more than 150% of scheduled)
- **Skipped** ⚠️ - Required break not taken

---

## 7. Attendance Tracking

### 7.1 How Attendance Works

**Automatic Process:**

1. Employee uses biometric device (face scan/RFID card)
2. Device records timestamp
3. SABS syncs data every 5 minutes
4. System processes and categorizes attendance
5. Record appears in SABS dashboard

### 7.2 Viewing Daily Attendance

**Navigate:** `📋 Attendance` from main menu

**Filter Options:**
```
Date:              [Select date or date range]
Facility:          [Select facility]
Shift:             [Select shift]
Status:            [All/Present/Late/Absent/Half-Day]
Employee:          [Search by name]
```

Click **"Apply Filters"** to view results

### 7.3 Understanding Attendance Status

| Status | Description | Badge Color |
|--------|-------------|-------------|
| **Present** ✅ | Checked in on time, completed full shift | Green |
| **Late** ⚠️ | Arrived after grace period | Orange |
| **Absent** ❌ | No check-in record | Red |
| **Half-Day** 📅 | Worked less than 50% of required hours | Blue |
| **On Leave** 🏖️ | Approved leave | Purple |

### 7.4 Attendance Details View

Click on any attendance record to see:

**Check-in Information:**
```
Check-in Time:     09:05 AM
Scheduled Time:    09:00 AM
Status:            On Time (within grace period)
Method:            Face Recognition
Device:            Head Office Device
```

**Check-out Information:**
```
Check-out Time:    05:15 PM
Scheduled Time:    05:00 PM
Status:            Overtime (15 minutes)
Method:            Face Recognition
```

**Work Hours:**
```
Gross Hours:       8.17 hours (check-in to check-out)
Break Time:        1.00 hour
Net Work Hours:    7.17 hours
Required Hours:    8.00 hours
Overtime:          0.17 hours (10 minutes)
```

**Break Details:**
```
☕ Lunch Break:
   Start:          12:30 PM
   End:            01:30 PM
   Duration:       60 minutes
   Status:         Compliant ✅
   
☕ Tea Break:
   Start:          10:15 AM
   End:            10:35 AM
   Duration:       20 minutes
   Status:         Exceeded ⚠️ (Expected: 15 min)
```

**Flags & Alerts:**
```
⚠️ Early Arrival:     5 minutes before scheduled time
⚠️ Late Departure:    15 minutes after scheduled time
✅ Break Compliance:  1 compliant, 1 exceeded
```

### 7.5 Manual Attendance Entry

For situations where biometric device fails or employee forgets to check-in:

**Step 1: Navigate to Manual Entry**
- Go to `📋 Attendance`
- Click **"+ Manual Entry"** button

**Step 2: Fill in Details**
```
Employee:          [Search and select]
Date:              [Select date]
Check-in Time:     [Enter time]
Check-out Time:    [Enter time]
Reason:            [Required - e.g., "Device malfunction"]
Approved By:       [Your name - auto-filled]
```

**Step 3: Add Breaks (Optional)**
```
Break Name:        [Lunch Break]
Start Time:        [12:00 PM]
End Time:          [01:00 PM]
```

**Step 4: Save**
Click **"Submit Manual Entry"**

⚠️ **Important:** Manual entries require supervisor/admin approval and appear with a special badge.

### 7.6 Editing Attendance Records

**For Corrections:**

1. Find the record in attendance list
2. Click **"Edit"** icon (✏️)
3. Modify times or status
4. Add reason for correction
5. Click **"Update"**

⚠️ All edits are logged with timestamp and user who made the change.

### 7.7 Bulk Actions

Select multiple attendance records to:
- ✅ Approve all
- ❌ Mark as absent (if no-show)
- 📧 Send notification emails
- 📊 Export selected records

---

## 8. Reports & Analytics

### 8.1 Available Reports

**Navigate:** `📈 Reports` from main menu

**Report Types:**

#### 8.1.1 Daily Attendance Summary
Shows attendance overview for selected date:
- Total present/absent/late
- Department-wise breakdown
- Shift-wise summary

#### 8.1.2 Employee Attendance History
Individual employee attendance over time:
- Date range selection
- Attendance percentage
- Late arrivals count
- Leaves taken

#### 8.1.3 Break Compliance Report
Analyzes break usage patterns:
- Average break duration
- Compliance rate
- Exceeded breaks
- Skipped required breaks

#### 8.1.4 Overtime Report
Tracks overtime hours:
- By employee
- By department
- By date range
- Total overtime costs

#### 8.1.5 Payroll Report
Calculates hours for payroll:
- Net working hours
- Overtime hours
- Deductions (late arrivals, early departures)
- Break time adjustments

#### 8.1.6 Facility Performance
Compares multiple facilities:
- Attendance rates
- Average work hours
- Punctuality metrics

### 8.2 Generating a Report

**Step 1: Select Report Type**
Choose from the reports menu

**Step 2: Set Parameters**
```
Date Range:        [From: 01/10/2025  To: 31/10/2025]
Facility:          [All Facilities / Select specific]
Department:        [All / Select specific]
Employee:          [All / Select specific]
Shift:             [All / Select specific]
```

**Step 3: Generate**
Click **"Generate Report"** button

**Step 4: View Results**
- Report displays in table format
- Charts and graphs for visual analysis
- Key metrics highlighted

**Step 5: Export**
Choose export format:
- 📄 **PDF** - For printing or sharing
- 📊 **Excel** - For further analysis
- 📧 **Email** - Send directly to recipients

### 8.3 Scheduled Reports

**Automate Report Delivery:**

1. Go to `Reports > Scheduled Reports`
2. Click **"+ New Schedule"**
3. Configure:

```
Report Type:       [Daily Attendance Summary]
Frequency:         [Daily / Weekly / Monthly]
Recipients:        [Add email addresses]
Time:              [08:00 AM]
Format:            [PDF / Excel]
```

4. Click **"Save Schedule"**

Reports will be automatically generated and emailed!

### 8.4 Understanding Analytics Dashboard

**Key Metrics:**

📊 **Attendance Rate**
```
Formula: (Present Days / Total Working Days) × 100%
Good:    > 95%
Average: 85-95%
Poor:    < 85%
```

⏰ **Punctuality Rate**
```
Formula: (On-time Arrivals / Total Present Days) × 100%
Good:    > 90%
Average: 80-90%
Poor:    < 80%
```

☕ **Break Compliance Rate**
```
Formula: (Compliant Breaks / Total Breaks) × 100%
Good:    > 85%
Average: 70-85%
Poor:    < 70%
```

🕐 **Average Work Hours**
```
Total net work hours / Number of days
Expected: Match scheduled hours
```

---

## 9. Data Synchronization

### 9.1 How Sync Works

**Automated Process (Every 5 Minutes):**

```
Step 1: User Sync
├── Fetch employee list from biometric device
├── Create new employees automatically
├── Update existing employee records
└── Sync profile photos and biometric data

Step 2: Attendance Sync
├── Fetch new attendance records
├── Match records to employees
├── Detect check-ins and check-outs
├── Calculate work hours and breaks
└── Save to database
```

### 9.2 Monitoring Sync Status

**Navigate:** `⚙️ Settings > Sync Status`

**Status Indicators:**

| Status | Meaning | Action |
|--------|---------|--------|
| 🟢 **Online** | Device responding, sync active | None needed |
| 🟡 **Syncing** | Data transfer in progress | Wait for completion |
| 🔴 **Offline** | Device not responding | Check device/network |
| ⚠️ **Error** | Sync failed | View error details |

**Last Sync Information:**
```
Last Successful Sync:  10/17/2025 10:45 AM
Records Synced:        25 attendance records
Users Updated:         3 employees
Next Sync:             10/17/2025 10:50 AM (in 2 minutes)
```

### 9.3 Manual Sync

**When to Use:**
- Device was offline and just came back online
- Need immediate data update
- Testing device connectivity

**How to Perform:**

1. Go to facility details
2. Click **"Force Sync Now"** button
3. Wait for sync to complete (30-60 seconds)
4. Check sync status

### 9.4 Sync Logs

**View Detailed Sync History:**

`⚙️ Settings > Sync Logs`

Each log entry shows:
- Timestamp
- Facility name
- Sync type (Users/Attendance)
- Records processed
- Success/failure status
- Error messages (if any)

**Example Log Entry:**
```
[2025-10-17 10:45:23] 🟢 SUCCESS
Facility: Head Office Lagos
Type: User Sync
Duration: 12 seconds
Results:
  ✅ Created: 2 new employees
  📝 Updated: 5 existing employees
  ⏭️ Skipped: 0 records

[2025-10-17 10:45:35] 🟢 SUCCESS
Facility: Head Office Lagos
Type: Attendance Sync
Duration: 8 seconds
Results:
  ✅ Processed: 25 attendance records
  🔄 Check-ins: 15 records
  🔄 Check-outs: 8 records
  ☕ Breaks: 12 break records
```

### 9.5 Troubleshooting Sync Issues

**Common Problems:**

#### Problem 1: "Sync Failed - Timeout"
```
Cause: Device taking too long to respond
Solution:
  1. Check device is powered on
  2. Verify network connectivity
  3. Increase timeout in facility settings
  4. Retry sync
```

#### Problem 2: "Employee Not Found"
```
Cause: Attendance record for unknown employee
Solution:
  1. Run User Sync first
  2. Check employee is registered on device
  3. Verify device ID matches
  4. Retry attendance sync
```

#### Problem 3: "Duplicate Records"
```
Cause: Same attendance record synced multiple times
Solution:
  System prevents duplicates automatically
  No action needed - duplicate is ignored
```

#### Problem 4: "Invalid API URL"
```
Cause: Wrong device API configuration
Solution:
  1. Go to Facility settings
  2. Verify Device API URL
  3. Test connection
  4. Update URL if incorrect
```

---

## 10. Troubleshooting

### 10.1 Login Issues

#### Can't Login - "Invalid Credentials"
```
Solutions:
  1. Verify username/email is correct
  2. Check Caps Lock is OFF
  3. Click "Forgot Password" to reset
  4. Contact admin if still unable to login
```

#### Account Locked
```
Cause: Too many failed login attempts
Solution: Wait 30 minutes or contact admin to unlock
```

### 10.2 Attendance Issues

#### Employee Checked In But Not Showing
```
Troubleshooting Steps:
  1. Wait 5 minutes (sync interval)
  2. Check sync status - is device online?
  3. Manually force sync
  4. Verify employee is active in system
  5. Check employee's device ID matches
```

#### Wrong Check-in Time Displayed
```
Possible Causes:
  1. Timezone mismatch
     Solution: Check facility timezone settings
     
  2. Device clock incorrect
     Solution: Sync device time with server
     
  3. Manual entry error
     Solution: Edit record to correct time
```

#### Break Not Recorded
```
Troubleshooting:
  1. Check if break tracking is enabled for shift
  2. Verify break was taken during configured window
  3. Check if employee checked in/out for break on device
  4. View sync logs for break records
```

### 10.3 Biometric Device Issues

#### Device Shows Offline
```
Troubleshooting Steps:
  1. Check device power supply
  2. Verify network cable connected
  3. Ping device IP address
  4. Check facility device API URL
  5. Test connection from facility settings
```

#### Face Recognition Not Working
```
Solutions:
  1. Ensure good lighting at device location
  2. Employee should face camera directly
  3. Remove glasses/mask if possible
  4. Re-register face on device
  5. Use RFID card as backup
```

#### RFID Card Not Scanning
```
Solutions:
  1. Check card is active in system
  2. Verify card number matches employee record
  3. Clean card and reader
  4. Re-register card on device
  5. Replace card if damaged
```

### 10.4 Report Issues

#### Report Shows No Data
```
Troubleshooting:
  1. Check date range selected
  2. Verify filters (facility/department/employee)
  3. Confirm attendance records exist for date range
  4. Try wider date range
```

#### Export Fails
```
Solutions:
  1. Reduce date range (large datasets)
  2. Try different format (PDF vs Excel)
  3. Check browser popup blocker
  4. Clear browser cache
  5. Try different browser
```

### 10.5 Performance Issues

#### System Running Slow
```
Solutions:
  1. Clear browser cache and cookies
  2. Close unused browser tabs
  3. Check internet speed
  4. Use recommended browsers (Chrome/Firefox)
  5. Reduce date ranges in reports
```

#### Page Not Loading
```
Troubleshooting:
  1. Refresh page (F5)
  2. Clear browser cache
  3. Check internet connection
  4. Try incognito/private mode
  5. Contact IT support
```

---

## 11. FAQ

### General Questions

**Q1: How often does the system sync with biometric devices?**
> A: Every 5 minutes automatically. You can also force an immediate sync manually.

**Q2: Can employees see their own attendance?**
> A: Yes, if employee self-service portal is enabled. Contact admin to enable this feature.

**Q3: What happens if an employee forgets to check out?**
> A: Admin can manually add check-out time or system uses default shift end time.

**Q4: Can I have different shifts for different days?**
> A: Yes, you can assign rotating shifts or create shift schedules (contact admin).

**Q5: How long is attendance data stored?**
> A: Permanently. Historical data is available for all reporting needs.

### Break Management

**Q6: What if an employee takes multiple breaks?**
> A: System tracks all breaks automatically. Each break is recorded separately.

**Q7: Are breaks included in work hours?**
> A: Paid breaks are included. Unpaid breaks are deducted from gross hours to calculate net work hours.

**Q8: Can employees skip breaks?**
> A: Yes, unless break is marked as "Required" in shift configuration. System will flag required breaks that were skipped.

**Q9: What happens if a break exceeds maximum duration?**
> A: Break is flagged as "Exceeded" and may be subject to disciplinary action (per company policy).

### Technical Questions

**Q10: What browsers are supported?**
> A: Google Chrome, Firefox, Safari, Microsoft Edge (latest versions).

**Q11: Can I access SABS from my phone?**
> A: Yes, the web interface is mobile-responsive. Native mobile app coming soon.

**Q12: Is my data secure?**
> A: Yes. System uses encryption, secure authentication, and regular backups.

**Q13: What if the internet goes down?**
> A: Biometric device stores data locally. Once internet is restored, data syncs automatically.

**Q14: Can I integrate SABS with our payroll system?**
> A: Yes, SABS provides API access and export formats compatible with major payroll systems.

### Administrative Questions

**Q15: How do I add a new facility?**
> A: Go to `🏢 Facilities > + Add Facility`. You'll need device API details from device vendor.

**Q16: Can I delete attendance records?**
> A: Only admins can delete records, and deletions are logged for audit purposes.

**Q17: How do I generate monthly reports?**
> A: Go to `📈 Reports`, select report type, set date range to full month, then export.

**Q18: Can I customize the system for our company policies?**
> A: Yes. Contact support for customization options (grace periods, overtime rules, break policies, etc.).

---

## 12. Contact & Support

### 12.1 Getting Help

**🆘 In-System Help:**
- Click the **"?"** icon in top right corner
- Access context-sensitive help on any page
- Watch video tutorials

**📧 Email Support:**
```
General Inquiries:    support@sabs-system.com
Technical Issues:     tech@sabs-system.com
Admin Requests:       admin@sabs-system.com
```

**📞 Phone Support:**
```
Hotline:              +234-XXX-XXX-XXXX
Available:            Mon-Fri, 8:00 AM - 6:00 PM (WAT)
Emergency (After hours): +234-XXX-XXX-XXXX
```

**💬 Live Chat:**
- Available in bottom right corner of screen
- Mon-Fri: 9:00 AM - 5:00 PM
- Average response time: 5 minutes

### 12.2 Reporting Issues

**When contacting support, please provide:**

1. **Your Information:**
   - Name
   - Role
   - Facility
   - Contact details

2. **Issue Details:**
   - What happened?
   - When did it happen?
   - What were you trying to do?
   - Error message (if any)
   - Screenshot (if possible)

3. **Steps to Reproduce:**
   - Step-by-step description
   - What you expected to happen
   - What actually happened

### 12.3 Training & Resources

**📚 Additional Resources:**

- **Video Tutorials:** `https://training.sabs-system.com`
- **User Community Forum:** `https://community.sabs-system.com`
- **Knowledge Base:** `https://help.sabs-system.com`
- **Release Notes:** Check for new features and updates

**🎓 Training Sessions:**

Request on-site or virtual training:
- Email: `training@sabs-system.com`
- Available for groups of 5+ users
- Custom training for specific roles

### 12.4 Feature Requests

**Want a new feature?**

1. Email: `features@sabs-system.com`
2. Describe your need
3. Explain how it would help your organization
4. Our product team reviews all requests!

### 12.5 System Status

**Check System Health:**
```
Status Page: https://status.sabs-system.com

Real-time information on:
  - System uptime
  - Scheduled maintenance
  - Known issues
  - Incident reports
```

---

## Appendix A: Quick Reference Guide

### Common Tasks Checklist

**✅ Daily Tasks:**
- [ ] Check dashboard for attendance overview
- [ ] Review late arrivals
- [ ] Verify sync status
- [ ] Address any attendance exceptions

**✅ Weekly Tasks:**
- [ ] Generate weekly attendance report
- [ ] Review break compliance
- [ ] Check overtime hours
- [ ] Update employee records if needed

**✅ Monthly Tasks:**
- [ ] Generate payroll report
- [ ] Export attendance data
- [ ] Review facility performance
- [ ] Update shift schedules if needed

### Keyboard Shortcuts

```
Ctrl + F        Search
Ctrl + R        Refresh page
Ctrl + P        Print report
Ctrl + E        Export data
Ctrl + N        New entry
Esc             Close dialog/modal
```

### Status Color Codes

```
🟢 Green        Success / Online / Present
🟡 Yellow       Warning / Syncing / Late
🔴 Red          Error / Offline / Absent
🔵 Blue         Information / Half-Day
🟣 Purple       Special status / On Leave
```

---

## Appendix B: Glossary of Terms

**Attendance Status**
- The current state of an employee's work day (present, late, absent, etc.)

**Biometric Data**
- Unique physical characteristics used for identification (face, fingerprint, RFID)

**Check-in**
- First attendance record of the day when employee arrives

**Check-out**
- Last attendance record of the day when employee leaves

**Device ID (personUUID)**
- Unique identifier assigned by biometric device to each employee

**Facility**
- Physical location with a biometric device for attendance capture

**Grace Period**
- Extra time allowed for check-in/out without penalty

**Gross Hours**
- Total time from check-in to check-out (includes breaks)

**Net Hours**
- Actual working time (gross hours minus break time)

**Overtime**
- Hours worked beyond scheduled shift time

**RFID Card**
- Radio-frequency identification card used for check-in/out

**Shift**
- Scheduled working hours with defined start and end times

**Sync**
- Process of transferring data from biometric device to SABS

**Break Compliance**
- Measure of whether breaks are taken according to policy

---

## Appendix C: Best Practices

### For Administrators

1. **Regular Monitoring**
   - Check sync status daily
   - Review error logs weekly
   - Verify device connectivity

2. **Data Accuracy**
   - Ensure employee records are up-to-date
   - Verify biometric IDs are correct
   - Audit attendance records monthly

3. **Security**
   - Use strong passwords
   - Enable two-factor authentication
   - Review user access regularly
   - Log out when leaving workstation

4. **Communication**
   - Inform employees of policy changes
   - Provide training for new features
   - Address attendance issues promptly

### For Employees

1. **Proper Device Usage**
   - Face camera directly for face recognition
   - Hold RFID card steady on reader
   - Wait for confirmation beep/message

2. **Break Etiquette**
   - Check in/out for breaks properly
   - Stay within break duration limits
   - Return from break on time

3. **Reporting Issues**
   - Report device malfunctions immediately
   - Inform supervisor if unable to check in/out
   - Request manual entry when necessary

### For HR Managers

1. **Regular Reporting**
   - Generate monthly attendance summaries
   - Track attendance trends
   - Identify chronic late arrivals or absences

2. **Policy Enforcement**
   - Apply attendance policies consistently
   - Document disciplinary actions
   - Review exceptions fairly

3. **System Optimization**
   - Update shift schedules as needed
   - Adjust break policies based on patterns
   - Configure grace periods appropriately

---

## Document Information

**Document Version:** 1.0  
**Last Updated:** October 2025  
**Next Review Date:** January 2026  
**Document Owner:** SABS Product Team  
**Classification:** Internal Use

---

**📘 End of User Manual**

*Thank you for using SABS - Smart Attendance & Biometric System!*

---

## Quick Start Checklist for New Users

Print this page for quick reference:

```
□ Received login credentials
□ Successfully logged in
□ Changed default password
□ Explored dashboard
□ Viewed my facility
□ Checked employee list
□ Reviewed shift configuration
□ Viewed attendance records
□ Generated first report
□ Bookmarked SABS URL
□ Saved support contact information
□ Completed training session
```

**Questions? Contact your system administrator or support team!**
