# Email Notification - Quick Setup (5 Minutes)

## 🚀 Super Quick Start

### 1. Package Already Installed ✅
```bash
nodemailer is installed
```

### 2. Gmail Setup (Most Common)

#### Step 1: Get App Password from Google
1. Go to: https://myaccount.google.com/security
2. Click "2-Step Verification" (enable if not enabled)
3. Scroll down → Click "App passwords"
4. Select app: **Mail**
5. Select device: **Other (Custom name)**
6. Type: "Attendance System"
7. Click "Generate"
8. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

#### Step 2: Configure in System
1. Start your server and client
2. Navigate to **Settings → Notifications**
3. Fill in:
   ```
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   SMTP Username: your-email@gmail.com
   SMTP Password: [paste the 16-char password]
   From Email: your-email@gmail.com
   ```
4. Click **"Save Changes"**

#### Step 3: Test It
1. In the "Test Email Configuration" field
2. Enter your email: `your-email@gmail.com`
3. Click **"Send Test"**
4. Check your inbox - you should receive a test email! ✅

#### Step 4: Enable Notifications
Toggle ON:
- ✅ Email Notifications
- ✅ Late Arrival Notifications
- ✅ Absent Notifications
- ✅ Report Notifications (optional)

Click **"Save Changes"**

### Done! 🎉

Your email notifications are now active!

---

## 📧 Test Email Preview

When you send a test email, you'll receive:

```
Subject: Test Email - Attendance System

✅ Email Test Successful!

Your email configuration is working correctly.

This is a test email from your Attendance Tracking System.

Timestamp: [Current Date/Time]
```

---

## ⏰ Late Arrival Email Preview

When an employee is late, they'll receive:

```
Subject: Late Arrival Notice - [Date]

Hello [Employee Name],

This is to inform you that you were marked late for today's attendance.

Details:
📅 Date: October 17, 2025
⏰ Scheduled Check-in: 9:00 AM
⏱️ Actual Check-in: 9:25 AM
⚠️ Late by: 25 minutes

Please ensure you arrive on time in the future.
```

---

## ❌ Absent Email Preview

When an employee is absent, they'll receive:

```
Subject: Absence Notice - [Date]

Hello [Employee Name],

You were marked absent for the following date:

Details:
📅 Date: October 17, 2025
❌ Status: Absent
📝 Reason: No check-in recorded

If you were present, please contact HR immediately.
```

---

## 🔧 Common Ports

| Service | Port | Encryption |
|---------|------|------------|
| Gmail | 587 | TLS |
| Gmail | 465 | SSL |
| Outlook | 587 | TLS |
| Office 365 | 587 | TLS |
| Custom SMTP | 587 | TLS |
| Custom SMTP | 465 | SSL |

---

## 🆘 Quick Troubleshooting

### "Authentication Failed"
→ Use **App Password**, not your regular Google password

### "Connection Refused"
→ Check port (587 for TLS, 465 for SSL)

### Email Not Received
→ Check spam folder
→ Verify email address is correct
→ Check "Email Notifications" master toggle is ON

### "Test Email Failed"
→ Save SMTP settings first
→ Wait 10 seconds, then try test again
→ Check logs in `logs/sync-[date].log`

---

## 📝 Quick Checklist

Before testing:
- [ ] nodemailer installed (already done ✅)
- [ ] SMTP settings filled in
- [ ] Settings saved
- [ ] Test email sent successfully
- [ ] Master toggle ON
- [ ] Specific notifications ON
- [ ] Employee has email address in system

---

## 🎯 What Happens Now?

1. **Late Arrival**: When employee checks in late → Email sent automatically
2. **Absent**: When employee marked absent → Email sent automatically
3. **Reports**: Daily reports sent if enabled

All automatic! No manual intervention needed.

---

## 📊 How to Check if Working

### Method 1: Check Logs
```bash
# View today's logs
Get-Content logs/sync-[date].log | Select-String "email"
Get-Content logs/attendance-[date].log | Select-String "email"
```

Look for:
```
✅ Email service initialized successfully
📧 Late arrival email sent to john@example.com
📧 Test email sent successfully
```

### Method 2: Test with Real Data
1. Create a test employee with your email
2. Assign a shift (e.g., 9:00 AM - 5:00 PM)
3. Manually mark them late
4. Check your email inbox

### Method 3: Send Test Email
- Fastest way to verify everything works
- Go to Settings → Notifications
- Use "Send Test" button

---

## 💡 Pro Tips

1. **Use Gmail for Testing**: Easiest to set up
2. **Save Before Testing**: Save SMTP settings before sending test
3. **Check Spam**: First emails might go to spam
4. **Add to Contacts**: Add sender to avoid spam
5. **Use Real Email**: Test with actual employee email

---

## 📞 Need Help?

Check these files:
- `EMAIL_NOTIFICATION_GUIDE.md` - Complete guide
- `logs/sync-[date].log` - Email service logs
- `logs/attendance-[date].log` - Notification logs

---

## ✅ Success Indicators

You'll know it's working when:
1. ✅ Test email received in inbox
2. ✅ Settings saved without errors
3. ✅ Logs show "Email service initialized"
4. ✅ Late/absent emails arrive automatically

---

**Time to Complete**: ~5 minutes
**Difficulty**: Easy
**Status**: Ready to use! 🚀
