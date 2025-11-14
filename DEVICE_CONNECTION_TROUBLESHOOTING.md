# XO5 Device Connection Troubleshooting Guide

## Current Issue Analysis ❌
```
Error: {"code":"1002","msg":"The device is not connected to the gateway"}
```

## Root Cause
The XO5 biometric device is **NOT connected** to the Java gateway service. The gateway is running and listening, but the device hasn't established a connection.

## Current Gateway Configuration ✅
- **Gateway Host**: `192.168.137.1`
- **SDK Port**: `10011` (for SDK communications)
- **GW Port**: `10010` (for device communications)
- **Status**: Gateway servers running successfully

## Missing: Device Heartbeat
Normal operation should show device heartbeat logs like:
```
[GW-SERVER-WORKER-X] Heartbeat received from device: 020e7096a03c670f63
```

## Device Connection Requirements

### 1. Network Connectivity
The XO5 device needs to be able to reach:
- **Gateway IP**: `192.168.137.1`
- **Gateway Port**: `10010` (primary device communication)
- **SDK Port**: `10011` (SDK operations)

### 2. Device Configuration
The device must be configured with:
- **Gateway Server IP**: `192.168.137.1`
- **Gateway Server Port**: `10010`
- **Device Key**: `020e7096a03c670f63`
- **Device Secret**: `123456`

## Diagnostic Steps

### Step 1: Verify Network Connectivity
Check if device can reach the gateway:

**From your computer (where gateway runs):**
```bash
# Check if gateway ports are open and listening
netstat -an | findstr 10010
netstat -an | findstr 10011

# Check current IP configuration
ipconfig
```

**Expected output:**
```
TCP    0.0.0.0:10010    0.0.0.0:0    LISTENING
TCP    0.0.0.0:10011    0.0.0.0:0    LISTENING
```

### Step 2: Check Device Network Settings
On the XO5 device web interface:
1. **Login to device**: `http://192.168.11.201` (device IP)
2. **Network Settings**: Verify device can reach `192.168.137.1`
3. **Gateway Settings**: Configure gateway connection

### Step 3: Configure Device Gateway Connection
The device needs these settings:
```
Gateway Server IP: 192.168.137.1
Gateway Server Port: 10010
Device Key: 020e7096a03c670f63
Device Secret: 123456
```

### Step 4: Check Firewall
Ensure Windows Firewall allows:
- **Port 10010** (incoming TCP)
- **Port 10011** (incoming TCP)
- **Port 8081** (HTTP API)

### Step 5: Monitor Connection
Watch gateway logs for device connection:
```
# You should see:
[GW-SERVER] Device connected: 020e7096a03c670f63
[GW-SERVER] Device heartbeat received
```

## Quick Fix Commands

### 1. Check Gateway Status
```bash
curl http://localhost:8081/api/status
```

### 2. Test Network Ports
```bash
# Test if ports are accessible
telnet 192.168.137.1 10010
telnet 192.168.137.1 10011
```

### 3. Check Device Connectivity
```bash
# Try to reach device web interface
ping 192.168.11.201
curl http://192.168.11.201
```

## Network Configuration Check

### Current Setup Analysis
- **Computer IP**: `192.168.137.1` (gateway host)
- **Device IP**: `192.168.11.201` (device)
- **Network Issue**: Different subnets? (`192.168.137.x` vs `192.168.11.x`)

### Potential Issues:
1. **Different Networks**: Device on `192.168.11.x`, gateway on `192.168.137.x`
2. **Routing**: Device can't reach gateway IP
3. **Firewall**: Ports blocked
4. **Device Config**: Gateway not configured on device

## Solution Options

### Option 1: Configure Device Gateway (Recommended)
1. Access device web interface: `http://192.168.11.201`
2. Go to Network/Gateway settings
3. Set Gateway Server: `192.168.137.1:10010`

### Option 2: Bridge Networks
Ensure both device and computer are on same network or routable networks

### Option 3: Update Gateway IP
If needed, change gateway to use same network as device

## Expected Success Indicators
When fixed, you should see:
1. ✅ Device heartbeat in gateway logs
2. ✅ API responses with code "000" instead of "1002"
3. ✅ Device operations working (get, status, etc.)

## Next Steps
1. Check device web interface
2. Configure gateway connection on device
3. Verify network connectivity
4. Monitor gateway logs for device connection