# Email Notification System - Complete Guide

## 📧 Overview

The attendance tracking system now includes a **complete email notification system** that automatically sends emails for:
- ⏰ Late arrivals
- ❌ Absences
- 📊 Daily reports
- ✅ Test emails for configuration verification

---

## 🚀 Quick Setup

### Step 1: Install Package
```bash
npm install nodemailer
```
✅ **Status**: Installed

### Step 2: Configure SMTP Settings
1. Go to **Settings → Notifications Tab**
2. Fill in the SMTP configuration:
   - SMTP Host
   - SMTP Port
   - SMTP Username
   - SMTP Password
   - From Email

### Step 3: Test Configuration
1. Enter a test email address
2. Click "Send Test"
3. Check your inbox

### Step 4: Enable Notifications
Toggle on the notifications you want:
- ✅ Email Notifications (Master toggle)
- ⏰ Late Arrival Notifications
- ❌ Absent Notifications
- 📊 Report Notifications

### Step 5: Save Settings
Click "Save Changes"

---

## ⚙️ SMTP Configuration

### For Gmail

```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP Username: your-email@gmail.com
SMTP Password: [App Password - see below]
From Email: your-email@gmail.com
```

#### How to Get Gmail App Password:
1. Go to Google Account Settings
2. Security → 2-Step Verification (enable if not enabled)
3. App Passwords → Select app: "Mail" → Device: "Other"
4. Copy the 16-character password
5. Use this password in SMTP Password field

### For Outlook/Office 365

```
SMTP Host: smtp.office365.com
SMTP Port: 587
SMTP Username: your-email@company.com
SMTP Password: Your regular password
From Email: your-email@company.com
```

### For Custom SMTP Server

```
SMTP Host: mail.yourserver.com
SMTP Port: 587 (TLS) or 465 (SSL)
SMTP Username: your-username
SMTP Password: your-password
From Email: no-reply@yourserver.com
```

---

## 📨 Email Types

### 1. Late Arrival Notification

**Triggered When**: Employee checks in after scheduled time + late threshold

**Sent To**: Employee's email address

**Template**:
```
Subject: Late Arrival Notice - [Date]

Hello [Employee Name],

This is to inform you that you were marked late for today's attendance.

Details:
- Date: [Date]
- Scheduled Check-in: [Time]
- Actual Check-in: [Time]
- Late by: [X] minutes

Please ensure you arrive on time in the future.
```

**Email Design**:
- 🟡 Yellow/Orange theme
- Professional HTML template
- Responsive design
- Company branding

### 2. Absent Notification

**Triggered When**: Employee is marked absent (no check-in)

**Sent To**: Employee's email address

**Template**:
```
Subject: Absence Notice - [Date]

Hello [Employee Name],

You were marked absent for the following date:

Details:
- Date: [Date]
- Status: Absent
- Reason: No check-in recorded

If you were present, please contact HR immediately.
```

**Email Design**:
- 🔴 Red theme
- Clear call-to-action
- Contact information

### 3. Daily Report

**Triggered When**: Scheduled or manual report generation

**Sent To**: Admin/Manager email

**Template**:
```
Subject: Daily Attendance Report - [Date]

Attendance Rate: [X]%

Statistics:
- Total Employees: [X]
- Present: [X]
- Late: [X]
- Absent: [X]
```

**Email Design**:
- 🔵 Blue theme
- Visual statistics
- Clean layout

### 4. Test Email

**Triggered When**: Admin clicks "Send Test" button

**Sent To**: Specified test email

**Template**:
```
Subject: Test Email - Attendance System

✅ Email Test Successful!

Your email configuration is working correctly.

Timestamp: [Date and Time]
```

**Email Design**:
- 🟢 Green theme
- Confirmation message
- System info

---

## 🔧 Technical Implementation

### Backend Files Created/Modified:

#### 1. `server/services/emailService.js` ✅
**New file** - Complete email service with:
- SMTP transporter initialization
- Email template generation
- Notification sending methods
- Error handling
- Logging

**Key Methods**:
```javascript
- initializeTransporter()
- sendLateArrivalNotification(employee, attendance)
- sendAbsentNotification(employee, date)
- sendDailyReport(reportData, recipientEmail)
- testEmailConfiguration(testEmail)
- isNotificationEnabled(key)
```

#### 2. `server/services/dataSyncService.js` ✅
**Modified** - Integrated email notifications:
```javascript
// After saving attendance
if (attendance.status === 'late') {
  await emailService.sendLateArrivalNotification(employee, attendance);
} else if (attendance.status === 'absent') {
  await emailService.sendAbsentNotification(employee, attendance.date);
}
```

#### 3. `server/controllers/settingsController.js` ✅
**Modified** - Added test email endpoint:
```javascript
exports.testEmail = async (req, res) => {
  const result = await emailService.testEmailConfiguration(testEmail);
  // Return success/failure
};
```

#### 4. `server/routes/settingsRoutes.js` ✅
**Modified** - Added test email route:
```javascript
router.post('/test-email', authorize('super-admin', 'admin'), testEmail);
```

### Frontend Files Modified:

#### 1. `client/src/pages/Settings.js` ✅
**Modified** - Added SMTP configuration UI:
- SMTP Host field
- SMTP Port field
- SMTP Username field
- SMTP Password field
- From Email field
- Test Email button
- Test email functionality
- State management for 5 new settings

**New State Variables**:
```javascript
smtpHost: ''
smtpPort: '587'
smtpUser: ''
smtpPassword: ''
fromEmail: ''
testEmail: ''
testingEmail: false
```

**New Functions**:
```javascript
handleTestEmail() // Send test email
```

---

## 🎨 Email Templates

### HTML Structure:
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: [COLOR]; color: white; padding: 20px; }
    .content { padding: 20px; background: #f9fafb; }
    .footer { text-align: center; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>[TITLE]</h2>
    </div>
    <div class="content">
      [CONTENT]
    </div>
    <div class="footer">
      [FOOTER]
    </div>
  </div>
</body>
</html>
```

### Color Scheme:
- Late Arrival: `#f59e0b` (Orange)
- Absent: `#ef4444` (Red)
- Report: `#3b82f6` (Blue)
- Test: `#10b981` (Green)

---

## 🧪 Testing Guide

### Test 1: SMTP Configuration

1. ✅ Navigate to Settings → Notifications
2. ✅ Fill in all SMTP fields
3. ✅ Click "Save Changes"
4. ✅ Verify success toast

### Test 2: Send Test Email

1. ✅ Enter your email in "Test Email" field
2. ✅ Click "Send Test"
3. ✅ Check your inbox
4. ✅ Verify test email received
5. ✅ Check email formatting

### Test 3: Late Arrival Notification

1. ✅ Enable "Late Arrival Notifications"
2. ✅ Create an employee with email
3. ✅ Assign shift with start time
4. ✅ Simulate late check-in
5. ✅ Verify email sent to employee
6. ✅ Check email content

### Test 4: Absent Notification

1. ✅ Enable "Absent Notifications"
2. ✅ Mark employee as absent
3. ✅ Verify email sent
4. ✅ Check email content

### Test 5: Notification Toggle

1. ✅ Disable "Email Notifications" (master)
2. ✅ Verify all notifications disabled
3. ✅ Re-enable master toggle
4. ✅ Verify individual toggles work

### Test 6: Error Handling

1. ✅ Enter invalid SMTP settings
2. ✅ Try to send test email
3. ✅ Verify error message displayed
4. ✅ Check logs for error details

---

## 📊 Database Schema

### Settings Model

```javascript
{
  key: 'smtpHost',
  value: 'smtp.gmail.com',
  category: 'notification',
  description: 'SMTP server hostname'
}
```

**Email-Related Settings**:
- `smtpHost`: SMTP server hostname
- `smtpPort`: SMTP server port (587/465)
- `smtpUser`: SMTP username/email
- `smtpPassword`: SMTP password (encrypted in production)
- `fromEmail`: From email address
- `emailNotifications`: Master toggle (true/false)
- `lateArrivalNotification`: Late notification toggle
- `absentNotification`: Absent notification toggle
- `reportNotification`: Report notification toggle

---

## 🔐 Security Considerations

### 1. Password Storage
⚠️ **Current**: Stored as plain text in database
✅ **Recommended**: Encrypt passwords before storing

### 2. Environment Variables (Production)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=no-reply@company.com
```

### 3. Rate Limiting
- Implement rate limiting for email sending
- Prevent email spam/abuse
- Track sent emails

### 4. Email Validation
- Validate email format
- Verify email exists
- Handle bounced emails

---

## 📝 Logging

### Email Service Logs

**Location**: `logs/sync-{date}.log`

**Log Entries**:
```
✅ Email service initialized successfully
📧 Late arrival email sent to john@example.com
📧 Absent email sent to jane@example.com
📧 Test email sent successfully
⚠️ Email settings not configured
❌ Email service initialization failed: [error]
❌ Failed to send late arrival email: [error]
```

### Attendance Processing Logs

**Location**: `logs/attendance-{date}.log`

**Log Entries**:
```
📧 Late arrival notification queued for employee@example.com
📧 Absent notification queued for employee@example.com
⚠️ Email notification failed: [error]
```

---

## 🚨 Troubleshooting

### Issue 1: Test Email Not Sending

**Symptoms**: Error message when sending test email

**Solutions**:
1. Check SMTP settings are correct
2. Verify email/password are valid
3. For Gmail, use App Password, not regular password
4. Check port (587 for TLS, 465 for SSL)
5. Check firewall/network settings
6. Check logs for detailed error

### Issue 2: Notifications Not Sending

**Symptoms**: Emails not received for late/absent

**Solutions**:
1. Check "Email Notifications" master toggle is ON
2. Check specific notification toggle is ON
3. Verify employee has email address
4. Check SMTP configuration
5. Check logs for errors
6. Test with "Send Test" first

### Issue 3: "Authentication Failed" Error

**Symptoms**: SMTP authentication error

**Solutions**:
1. **Gmail**: Use App Password, not regular password
2. **Outlook**: Enable "Less Secure Apps" or use App Password
3. Verify username/password correct
4. Check if account requires 2FA
5. Try different SMTP port

### Issue 4: Emails Going to Spam

**Symptoms**: Emails delivered but in spam folder

**Solutions**:
1. Set proper "From Email" address
2. Use company domain email
3. Configure SPF/DKIM records
4. Add sender to contacts
5. Use professional email template

---

## 🎯 Best Practices

### 1. Email Content
- Keep subject lines clear and concise
- Use professional language
- Include relevant details only
- Add contact information
- Provide call-to-action

### 2. Timing
- Send emails immediately for critical events (late/absent)
- Batch report emails (daily summary)
- Respect timezone settings
- Avoid sending at odd hours

### 3. Frequency
- Don't spam employees
- Limit notifications per day
- Allow users to opt-out
- Provide digest options

### 4. Monitoring
- Track sent emails
- Monitor delivery rates
- Log failures
- Alert on critical failures

### 5. Testing
- Test before production
- Use test email accounts
- Verify formatting on different clients
- Check spam scores

---

## 🔮 Future Enhancements

### 1. Email Preferences per Employee
- Allow employees to customize notifications
- Opt-in/opt-out options
- Notification frequency settings

### 2. Email Templates Management
- Custom email templates
- Template editor in UI
- Multiple language support
- Company branding

### 3. Advanced Notifications
- Scheduled reports (daily, weekly, monthly)
- Overtime alerts
- Birthday reminders
- Holiday notifications

### 4. Email Analytics
- Track open rates
- Track click rates
- Delivery reports
- Bounce handling

### 5. Alternative Channels
- SMS notifications
- Push notifications
- Slack integration
- Teams integration

---

## 📋 Summary

✅ **Implemented Features**:
- Complete email service with nodemailer
- SMTP configuration in UI
- Test email functionality
- Late arrival notifications
- Absent notifications
- Daily report emails
- Professional HTML templates
- Error handling and logging
- Settings persistence
- Security considerations

✅ **Files Modified**: 5
- `server/services/emailService.js` (NEW)
- `server/services/dataSyncService.js`
- `server/controllers/settingsController.js`
- `server/routes/settingsRoutes.js`
- `client/src/pages/Settings.js`

✅ **Package Installed**:
- `nodemailer@^6.9.x`

---

## 🎉 Status: READY FOR TESTING

The email notification system is fully implemented and ready for testing!

**Next Steps**:
1. Configure SMTP settings
2. Send test email
3. Enable notifications
4. Test with real attendance data
5. Monitor logs
6. Adjust as needed

---

**Questions?** Check the troubleshooting section or review the logs in `logs/` directory.
