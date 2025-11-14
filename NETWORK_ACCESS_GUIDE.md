# 🌐 Network Access Guide for SABS Server

## 📡 Server Network Configuration

Your SABS server is now configured for network access with the following settings:

### 🔗 Access URLs

| Access Type | URL | Description |
|-------------|-----|-------------|
| **Local** | `http://localhost:5000` | Access from this computer |
| **Network** | `http://192.168.0.169:5000` | Access from other devices on your network |
| **XO5 Webhook** | `http://192.168.0.169:5000/api/xo5/record` | For XO5 device configuration |

### 🎯 Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `http://192.168.0.169:5000/api/xo5/record` | POST | XO5 device webhook |
| `http://192.168.0.169:5000/api/xo5/health` | GET | XO5 health check |
| `http://192.168.0.169:5000/api/auth/login` | POST | User authentication |
| `http://192.168.0.169:5000/api/employees` | GET | Employee management |

## 🔥 Windows Firewall Configuration

To allow network access, you may need to configure Windows Firewall:

### Method 1: Add Firewall Rule (Recommended)
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "SABS Server" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
```

### Method 2: Windows Firewall GUI
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → "TCP" → "Specific local ports: 5000"
5. Allow the connection
6. Apply to all profiles
7. Name it "SABS Server"

## 📱 Testing Network Access

### From Another Computer/Device:
```bash
# Test health endpoint
curl http://192.168.0.169:5000/api/xo5/health

# Test XO5 webhook (example)
curl -X POST http://192.168.0.169:5000/api/xo5/record \
  -H "Content-Type: application/json" \
  -d '{"personSn":"111","personName":"vic","resultFlag":"1"}'
```

### From Mobile/Tablet:
Open browser and navigate to: `http://192.168.0.169:5000`

## 🔧 XO5 Device Configuration

Configure your XO5 device to push data to:
```
Webhook URL: http://192.168.0.169:5000/api/xo5/record
Method: POST
Content-Type: application/json
```

## 🚀 Starting the Server

Start the server with network access:
```bash
npm run dev
```

You should see:
```
🚀 Server running on port 5000 in development mode
📡 Network Access:
   Local:    http://localhost:5000
   Network:  http://0.0.0.0:5000
   LAN:      http://192.168.0.169:5000
🔗 XO5 Webhook: http://192.168.0.169:5000/api/xo5/record
```

## 🔒 Security Considerations

### For Development:
- ✅ CORS is open for all origins
- ✅ Rate limiting is enabled (100 requests per 15 minutes)
- ✅ Input validation is active

### For Production:
1. Change `CORS_ORIGIN=*` to specific domains
2. Use HTTPS with SSL certificates
3. Set strong JWT secrets
4. Configure proper firewall rules
5. Use a reverse proxy (nginx/Apache)

## 🛠️ Troubleshooting

### Can't access from other devices?
1. Check Windows Firewall settings
2. Verify the server is running on `0.0.0.0:5000`
3. Confirm devices are on the same network
4. Try accessing `http://192.168.0.169:5000/api/xo5/health`

### XO5 device can't connect?
1. Verify the webhook URL: `http://192.168.0.169:5000/api/xo5/record`
2. Check device network connectivity
3. Ensure POST method is configured
4. Verify Content-Type: application/json

## 📞 Support

If you need help:
1. Check server logs for errors
2. Test endpoints with curl or Postman
3. Verify network connectivity
4. Check firewall rules

---
*Generated on: November 3, 2025*
*Your Server IP: 192.168.0.169*