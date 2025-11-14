# XO5 Quick Setup Guide (5 Minutes)

## 🚀 Quick Start for XO5 Device Integration

### Prerequisites ✅
- SABS system running on port 5000
- XO5 device on same network
- Employee Device IDs mapped

### Step 1: Configure XO5 Device
```
1. Access XO5 device admin panel
2. Go to Network Settings
3. Set Webhook URL: http://YOUR-SERVER-IP:5000/api/xo5/record
4. Set HTTP Method: POST
5. Enable Real-time Push
6. Save settings
```

### Step 2: Test Connection
```bash
# Check if SABS XO5 endpoint is active
curl http://localhost:5000/api/xo5/health

# Should return: {"success": true, "message": "XO5 webhook endpoint is active"}
```

### Step 3: Configure Facility in SABS
```
1. Login to SABS → Facilities
2. Add/Edit Facility:
   - Device Type: XO5
   - Device Key: XO5-DEVICE-001
   - Webhook URL: http://YOUR-SERVER-IP:5000/api/xo5/record
```

### Step 4: Map Employee Device IDs
```
1. Go to Employees page
2. For each employee:
   - Edit employee
   - Set Device ID = XO5 person serial number
   - Example: Device ID = "1001" (matches XO5 personSn)
```

### Step 5: Test Attendance
```
1. Have employee check-in on XO5 device
2. Check SABS Dashboard for real-time update
3. View logs: tail -f logs/combined.log | grep XO5
```

## 🔧 Quick Troubleshooting

**Problem: No attendance records appearing**
```
✅ Check: Employee Device ID matches XO5 personSn
✅ Check: Employee has shift assigned
✅ Check: XO5 webhook URL is correct
✅ Check: Network connectivity
```

**Problem: Records being filtered**
```
This is normal! System only processes:
✅ Successful access (resultFlag = "1")
✅ Registered users (personType = "1")  
✅ Check-in/Check-out only (direction = "1" or "4")
❌ Failed attempts, strangers, other events are filtered
```

## 📋 XO5 vs Legacy Device Comparison

| Feature | XO5 (Push) | Legacy (Pull) |
|---------|------------|---------------|
| Data Flow | Device → Server | Server ← Device |
| Sync Method | Real-time push | Periodic polling |
| Server Load | Low | Higher |
| Latency | Instant | Up to 5 minutes |
| Network | Device calls server | Server calls device |
| Setup | Configure webhook | Configure API endpoint |

## 🎯 Key Benefits of XO5 Integration

✅ **Real-time attendance** - Instant updates  
✅ **Reduced server load** - No polling needed  
✅ **Better performance** - Push-based architecture  
✅ **Immediate alerts** - Instant late arrival notifications  
✅ **Strict filtering** - Only verified events processed  
✅ **Duplicate prevention** - Built-in deduplication  

## 📞 Need Help?

1. **Check logs first**: `tail -f logs/combined.log | grep XO5`
2. **Test webhook**: Use curl command above
3. **Verify mapping**: Employee Device ID = XO5 personSn
4. **Check network**: Can XO5 reach your server?
5. **Review guide**: See XO5_INTEGRATION_GUIDE.md for details

---

**Your XO5 device should now be pushing attendance data to SABS in real-time! 🎉**