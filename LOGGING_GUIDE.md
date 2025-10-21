# 📝 Logging System Implementation Guide

## ✅ What's Been Added

### 1. **Winston Logger Service**
Created `server/utils/logger.js` with:
- File logging (all logs saved to files)
- Separate log files for different purposes
- Console output in development mode
- Specialized loggers for different modules

### 2. **Log Files Created**
All logs are saved in the `logs/` directory:

| File | Purpose | Max Size | Retention |
|------|---------|----------|-----------|
| `combined.log` | All logs | 5MB | 5 files |
| `error.log` | Errors only | 5MB | 5 files |
| `sync.log` | Sync operations | 10MB | 10 files |

### 3. **Specialized Loggers**
- `syncLogger` - General sync operations
- `userSyncLogger` - User sync specific
- `attendanceLogger` - Attendance processing

---

## 📊 Log File Locations

```
attendance tracking system/
├── logs/
│   ├── combined.log    ← All application logs
│   ├── error.log       ← Errors only
│   └── sync.log        ← Sync operations (user + attendance)
```

---

## 🔍 How to View Logs

### Option 1: Tail Live Logs (PowerShell)
```powershell
# View sync logs in real-time
Get-Content "logs\sync.log" -Wait -Tail 50

# View errors in real-time
Get-Content "logs\error.log" -Wait -Tail 50

# View all logs
Get-Content "logs\combined.log" -Wait -Tail 50
```

### Option 2: View Full Log File
```powershell
# Open in Notepad
notepad logs\sync.log

# Open in VS Code
code logs\sync.log

# View last 100 lines
Get-Content logs\sync.log -Tail 100
```

### Option 3: Search Logs
```powershell
# Search for specific facility
Select-String -Path logs\sync.log -Pattern "Dala"

# Search for errors
Select-String -Path logs\sync.log -Pattern "ERROR|FAILED"

# Search for successful updates
Select-String -Path logs\sync.log -Pattern "Employee updated successfully"
```

---

## 📝 Log Format

### Standard Format
```
[2025-10-16 14:30:45] [INFO]: [SYNC] 🔄 Starting facility sync
[2025-10-16 14:30:46] [INFO]: [USER_SYNC] 📥 Syncing users from Dala device...
[2025-10-16 14:30:47] [INFO]: [USER_SYNC] ✅ Found matching employee: John Doe
[2025-10-16 14:30:47] [ERROR]: [SYNC] ❌ Sync failed for Dala: Connection timeout
```

### Log Levels
- `[INFO]` - Normal operations
- `[WARN]` - Warnings (non-critical issues)
- `[ERROR]` - Errors with stack traces
- `[DEBUG]` - Detailed debugging info (if enabled)

---

## 🛠️ Logger Methods Used

### Sync Logger
```javascript
syncLogger.info('Message');           // Info level
syncLogger.warn('Warning message');   // Warning level
syncLogger.error('Error message');    // Error level
syncLogger.event('🔄', 'Event msg');  // Event with emoji
```

### User Sync Logger
```javascript
userSyncLogger.info('User sync started');
userSyncLogger.error('User sync failed', { error: err });
```

### Attendance Logger
```javascript
attendanceLogger.info('Processing record');
attendanceLogger.warn('Employee not found');
```

---

## 🎯 What Gets Logged

### User Sync Logs
- ✅ User sync started with facility name and URL
- ✅ Response status and format detected
- ✅ Number of users found
- ✅ Sample user data structure
- ✅ Each user processing with extracted IDs
- ✅ Employee matching results
- ✅ Field updates (old → new values)
- ✅ Save confirmations
- ✅ Summary (updated/not found counts)

### Attendance Sync Logs
- ✅ Attendance sync started
- ✅ Date range queried
- ✅ Response format detected
- ✅ Number of records found
- ✅ Each record with normalization
- ✅ Employee matching
- ✅ Check-in/check-out processing
- ✅ Late/overtime calculations
- ✅ Database save confirmations

### Error Logs
- ❌ Connection failures
- ❌ Invalid responses
- ❌ Employee not found
- ❌ Database errors
- ❌ Full stack traces

---

## 📈 Log Analysis

### Check Sync Success Rate
```powershell
# Count successful syncs
(Select-String -Path logs\sync.log -Pattern "Sync completed").Count

# Count failures
(Select-String -Path logs\sync.log -Pattern "Sync failed").Count
```

### Find Employees Not Found
```powershell
Select-String -Path logs\sync.log -Pattern "Employee NOT FOUND"
```

### Check Updated Employees
```powershell
Select-String -Path logs\sync.log -Pattern "Employee updated successfully"
```

### View Today's Logs Only
```powershell
$today = Get-Date -Format "yyyy-MM-dd"
Select-String -Path logs\sync.log -Pattern $today
```

---

## 🔧 Configuration

### Environment Variables
Add to `.env`:

```env
# Logging Level (debug, info, warn, error)
LOG_LEVEL=info

# Node Environment (development, production)
NODE_ENV=development
```

### Log Levels Explained
- `debug` - Everything (very verbose)
- `info` - Normal operations (recommended)
- `warn` - Warnings and above
- `error` - Errors only

---

## 💾 Log Rotation

Logs automatically rotate when they reach max size:
- Old logs are renamed with numbers (e.g., `sync.log.1`, `sync.log.2`)
- Keeps last 5-10 files depending on log type
- Oldest logs are automatically deleted

---

## 🧹 Log Maintenance

### Clear Old Logs
```powershell
# Delete logs older than 7 days
Get-ChildItem logs\*.log.* | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | Remove-Item

# Clear all logs (be careful!)
Remove-Item logs\*.log
```

### Archive Logs
```powershell
# Create archive folder
New-Item -ItemType Directory -Path logs\archive -Force

# Move old logs
Move-Item logs\*.log.* logs\archive\
```

---

## 🚀 Next Steps

1. **Run sync** to generate logs
2. **Open sync.log** to view detailed output
3. **Check for errors** in error.log
4. **Analyze patterns** to troubleshoot issues

---

## 💡 Pro Tips

### 1. Keep Terminal Clean
With file logging, terminal only shows important messages. Full details are in log files.

### 2. Use Log Viewer
Install a log viewer extension in VS Code:
- "Log File Highlighter"
- "Log Viewer"

### 3. Monitor Logs During Sync
Open log file in VS Code and it will auto-refresh as logs are written.

### 4. Search Across All Logs
```powershell
Get-ChildItem logs\*.log | Select-String -Pattern "your search term"
```

### 5. Export Logs for Analysis
```powershell
# Export today's errors
$today = Get-Date -Format "yyyy-MM-dd"
Select-String -Path logs\error.log -Pattern $today > today-errors.txt
```

---

## 📞 Troubleshooting

### Can't Find Log Files?
Check that `logs/` directory exists in project root.

### Logs Not Being Written?
1. Check file permissions
2. Verify winston is installed: `npm list winston`
3. Check NODE_ENV setting

### Logs Too Verbose?
Change LOG_LEVEL in .env to 'warn' or 'error'

### Need More Detail?
Change LOG_LEVEL to 'debug' for maximum verbosity

---

**Now your logs are saved to files for proper evaluation!** 📝

Open `logs/sync.log` after running a sync to see all the detailed information! 🚀
