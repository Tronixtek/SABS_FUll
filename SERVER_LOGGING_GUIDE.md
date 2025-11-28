# 📋 SABS Server Logging Guide

## 🔍 **Viewing Node.js Server Logs**

### **Service Name:** `sabs-node-server.service`

### **1. Real-Time Logs (Live Monitoring)**
```bash
# Follow logs in real-time (Press Ctrl+C to exit)
journalctl -u sabs-node-server.service -f

# Follow with timestamps
journalctl -u sabs-node-server.service -f --since "1 hour ago"
```

### **2. Recent Logs**
```bash
# Last 50 log entries
journalctl -u sabs-node-server.service -n 50

# Last 100 log entries  
journalctl -u sabs-node-server.service -n 100

# Last 20 lines with timestamps
journalctl -u sabs-node-server.service -n 20 --no-pager
```

### **3. Time-Based Logs**
```bash
# Today's logs
journalctl -u sabs-node-server.service --since today

# Last hour
journalctl -u sabs-node-server.service --since "1 hour ago"

# Last 30 minutes
journalctl -u sabs-node-server.service --since "30 minutes ago"

# Specific date range
journalctl -u sabs-node-server.service --since "2025-11-27 10:00:00" --until "2025-11-27 15:00:00"
```

### **4. Error Logs Only**
```bash
# Show only error priority logs
journalctl -u sabs-node-server.service -p err

# Show warnings and errors
journalctl -u sabs-node-server.service -p warning
```

## 🔧 **Viewing Java Service Logs**

### **Service Name:** `sabs-java-service.service`

```bash
# Real-time Java logs
journalctl -u sabs-java-service.service -f

# Recent Java logs
journalctl -u sabs-java-service.service -n 30

# Today's Java logs
journalctl -u sabs-java-service.service --since today
```

## 🚀 **Service Management Commands**

### **Check Service Status**
```bash
# Node.js service status
systemctl status sabs-node-server.service

# Java service status  
systemctl status sabs-java-service.service

# Both services
systemctl status sabs-node-server.service sabs-java-service.service
```

### **Restart Services**
```bash
# Restart Node.js service
systemctl restart sabs-node-server.service

# Restart Java service
systemctl restart sabs-java-service.service

# Restart both
systemctl restart sabs-node-server.service sabs-java-service.service
```

## 📊 **Monitoring API Requests**

### **Real-Time API Monitoring**
```bash
# Watch for API requests in Node.js logs
journalctl -u sabs-node-server.service -f | grep -E "(GET|POST|PUT|DELETE)"

# Watch for errors
journalctl -u sabs-node-server.service -f | grep -i error

# Watch for specific endpoint
journalctl -u sabs-node-server.service -f | grep "/api/employees"
```

## 🎯 **Quick Reference**

| Task | Command |
|------|---------|
| **Live logs** | `journalctl -u sabs-node-server.service -f` |
| **Recent logs** | `journalctl -u sabs-node-server.service -n 30` |
| **Today's logs** | `journalctl -u sabs-node-server.service --since today` |
| **Errors only** | `journalctl -u sabs-node-server.service -p err` |
| **Service status** | `systemctl status sabs-node-server.service` |
| **Restart service** | `systemctl restart sabs-node-server.service` |

Happy debugging! 🐛🔍