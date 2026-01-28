# XO5 SDK Documentation Reference

## Overview

HeyStar Cloud SDK Operation Guide for XO5 biometric devices.

**SDK Requirements:**
- Java JDK version: 1.8+
- Target audience: Developers with Java development capabilities

---

## Environment Setup

### Maven Dependencies

```xml
<dependency>
    <groupId>com.hfims.boot</groupId>
    <artifactId>hf-tcp-gateway</artifactId>
    <version>1.x.x</version>
</dependency>

<dependency>
    <groupId>io.netty</groupId>
    <artifactId>netty-all</artifactId>
    <version>4.1.113.Final</version>
</dependency>

<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>fastjson</artifactId>
    <version>1.2.83</version>
</dependency>

<dependency>
    <groupId>org.slf4j</groupId>
    <artifactId>slf4j-api</artifactId>
    <version>${slf4j.version}</version>
    <scope>provided</scope>
</dependency>
```

### Required JAR Files
- `hf-tcp-gateway-1.x.x.jar`
- `netty-all-4.1.113.Final.jar`
- `fastjson-1.2.83.jar`

---

## Core Interface: HfDeviceClient

All device operations are performed through `HfDeviceClient.class`

### Common Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `hostInfo` | HostInfoDto | Cloud host information (IP, port, timeout) |
| `deviceKey` | String | Device serial number |
| `secret` | String | Device communication key |

---

## Device Management APIs

### 1. Device Test/Connectivity

```java
HfDeviceResp test(HostInfoDto hostInfo, String deviceKey, String secret)
```

**Purpose:** Test device connectivity and communication

**Example Response:**
```json
{
  "cmd": "test_resp",
  "code": "000",
  "msg": "success",
  "seqId": "a5e7ac0e-0afc-43f4-b2fd-b14b44cd9026"
}
```

### 2. Device Restart

```java
HfDeviceResp deviceReboot(HostInfoDto hostInfo, String deviceKey, String secret)
```

### 3. Get Device Information

```java
HfDeviceResp deviceGet(HostInfoDto hostInfo, String deviceKey, String secret)
```

### 4. Device Reset

```java
HfDeviceResp deviceReset(HostInfoDto hostInfo, String deviceKey, String secret, DeviceResetReq req)
```

**DeviceResetReq Types:**
- `1` - All data
- `2` - Personnel registration information
- `3` - Personnel photo information
- `4` - Personnel feature information
- `5` - Identification record

### 5. Device Configuration

```java
// Get device configuration
HfDeviceResp deviceGetConfig(HostInfoDto hostInfo, String deviceKey, String secret, DeviceGetConfigReq req)

// Set device configuration
HfDeviceResp deviceSetConfig(HostInfoDto hostInfo, String deviceKey, String secret, DeviceSetConfigReq req)

// Set recognition configuration
HfDeviceResp deviceSetRecConfig(HostInfoDto hostInfo, String deviceKey, String secret, DeviceSetRecConfigReq req)

// Set recognition mode configuration
HfDeviceResp deviceSetRecModeConfig(HostInfoDto hostInfo, String deviceKey, String secret, DeviceSetRecModeConfigReq req)

// Set peripheral configuration
HfDeviceResp deviceSetPciConfig(HostInfoDto hostInfo, String deviceKey, String secret, DeviceSetPciConfigReq req)

// Set UI configuration
HfDeviceResp deviceSetUiConfig(HostInfoDto hostInfo, String deviceKey, String secret, DeviceSetUiConfigReq req)

// Set server configuration
HfDeviceResp deviceSetSevConfig(HostInfoDto hostInfo, String deviceKey, String secret, DeviceSetSevConfigReq req)

// Set custom configuration
HfDeviceResp deviceSetCstConfig(HostInfoDto hostInfo, String deviceKey, String secret, DeviceSetCstConfigReq req)
```

### 6. Device Remote Control

```java
HfDeviceResp deviceOutput(HostInfoDto hostInfo, String deviceKey, String secret, DeviceOutputReq req)
```

**DeviceOutputReq Types:**
- `1` - Open door (default)
- `2` - Serial port
- `3` - Wiegand
- `4` - Custom text/image/voice

### 7. Network Configuration

```java
// Set wireless network
HfDeviceResp deviceSetWiFi(HostInfoDto hostInfo, String deviceKey, String secret, DeviceSetWifiReq req)

// Set wired network
HfDeviceResp deviceSetNetwork(HostInfoDto hostInfo, String deviceKey, String secret, DeviceSetNetworkReq req)

// Set upload URL
HfDeviceResp deviceSetUploadUrl(HostInfoDto hostInfo, String deviceKey, String secret, List<DeviceSetUploadUrlReq> reqList)
```

### 8. Device Time and Password

```java
// Set device time
HfDeviceResp deviceSetTime(HostInfoDto hostInfo, String deviceKey, String secret, DeviceSetTimeReq req)

// Set local password
HfDeviceResp deviceSetLocalPwd(HostInfoDto hostInfo, String deviceKey, String secret, DeviceSetLocalPwdReq req)
```

**Important Note:** If device is on public network, it will auto-sync time every 5 minutes.

### 9. Device Upgrade

```java
HfDeviceResp deviceUpgradeApk(HostInfoDto hostInfo, String deviceKey, String secret, DeviceUpgradeApkReq req)
```

---

## Personnel Management APIs

### 1. Person Creation

```java
HfDeviceResp personCreate(HostInfoDto hostInfo, String deviceKey, String secret, PersonCreateReq req)
```

**PersonCreateReq Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sn` | String | Yes | Employee number |
| `name` | String | Yes | Name |
| `type` | Integer | Yes | 1=Employee, 2=Visitor, 3=Blacklist |
| `cardNo` | String | No | Card number |
| `idCard` | String | No | ID card number |
| `mobile` | String | No | Phone number |
| `verifyPwd` | String | No | Password |
| `voucherCode` | String | No | Voucher number |
| `acGroupNumber` | Integer | No | Access control group (default: 0) |
| `verifyStyle` | Integer | No | Verification method (default: 0) |
| `expiredType` | Integer | No | 0=Never, 1=Time, 2=Times, 3=Time+Times |
| `validTimeBegin` | Long | No | Valid start time |
| `validTimeEnd` | Long | No | Valid end time |
| `validCount` | Integer | No | Valid times |
| `acTzNumber1` | Integer | No | Time zone 1 (default: 1) |
| `acTzNumber2` | Integer | No | Time zone 2 (default: 0) |
| `acTzNumber3` | Integer | No | Time zone 3 (default: 0) |

**Verification Style Values:**
- `0` - Face/Card/Fingerprint/Password (any one)
- `1` - Face only
- `2` - Card only
- `3` - Fingerprint only
- `4` - Password
- `10` - Face + Card + Fingerprint
- `20` - Card + Face
- `21` - Card + Fingerprint
- `30` - Fingerprint + Face

### 2. Person Creation or Update (Merge)

```java
HfDeviceResp personMerge(HostInfoDto hostInfo, String deviceKey, String secret, PersonCreateReq req)
```

**Use this method to create a new person or update if they already exist.**

### 3. Person Update

```java
HfDeviceResp personUpdate(HostInfoDto hostInfo, String deviceKey, String secret, PersonUpdateReq req)
```

### 4. Person Deletion

```java
HfDeviceResp personDelete(HostInfoDto hostInfo, String deviceKey, String secret, PersonDeleteReq req)
```

**PersonDeleteReq:**
```java
{
    sn: List<String> // List of employee numbers to delete
}
```

### 5. Person Search

```java
// Find specific person
HfDeviceResp personFind(HostInfoDto hostInfo, String deviceKey, String secret, PersonFindReq req)

// Find person list (paginated)
HfDeviceResp personFindList(HostInfoDto hostInfo, String deviceKey, String secret, PersonFindListReq req)
```

**PersonFindReq:**
- `type` - Search type: 1=Employee number, 2=ID card, 3=Card number
- `key` - Search value

**PersonFindListReq:**
- `sn` - List of employee numbers
- `index` - Page number (starting from 1)
- `length` - Page size (default: 20)

### 6. Clear All Personnel

```java
HfDeviceResp personEmpty(HostInfoDto hostInfo, String deviceKey, String secret)
```

### 7. Person Time Period Management

```java
// Add or update person time period
HfDeviceResp personPasstimeMerge(HostInfoDto hostInfo, String deviceKey, String secret, PersonPasstimeMergeReq req)

// Delete person time period
HfDeviceResp personPasstimeDelete(HostInfoDto hostInfo, String deviceKey, String secret, PersonPasstimeDeleteReq req)
```

---

## Face Management APIs (CRITICAL)

### 1. Add or Update Face

```java
HfDeviceResp faceMerge(HostInfoDto hostInfo, String deviceKey, String secret, FaceMergeReq req)
```

**⚠️ IMPORTANT: You must register a person BEFORE adding their face!**

**FaceMergeReq Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `personSn` | String | **Yes** | Employee number (must exist) |
| `imgUrl` | String | No | Photo URL |
| `imgBase64` | String | **Yes** | Base64 encoded photo |
| `easy` | Integer | No | 0=Strict quality detection (default), 1=Loose detection |

**Image Requirements:**
- **Format:** PNG, JPG, JPEG (no data URI prefix needed)
- **Encoding:** Base64 string WITHOUT `data:image/jpg;base64,` prefix
- **Quality Detection:**
  - `easy = 0` - Strict detection (default)
  - `easy = 1` - Loose detection (recommended for better success rate)

**Example Usage:**
```java
FaceMergeReq req = new FaceMergeReq();
req.setPersonSn("EMP001");
req.setImgBase64("/9j/4AAQSkZJRg..."); // Base64 without prefix
req.setEasy(1); // Use loose detection for better success

HfDeviceResp response = HfDeviceClient.faceMerge(hostInfo, deviceKey, secret, req);
```

**Note:** If `faceId` is empty, system will auto-generate a 32-character ID.

### 2. Delete Face

```java
HfDeviceResp faceDelete(HostInfoDto hostInfo, String deviceKey, String secret, FaceDeleteReq req)
```

**FaceDeleteReq:**
```java
{
    personSn: String // Employee number
}
```

### 3. Find Face

```java
HfDeviceResp faceFind(HostInfoDto hostInfo, String deviceKey, String secret, FaceFindReq req)
```

**FaceFindReq:**
```java
{
    personSn: String,      // Employee number
    sn: List<String>       // Query specific personnel (optional)
}
```

---

## Fingerprint Management APIs

### 1. Add or Update Fingerprint

```java
HfDeviceResp fingerMerge(HostInfoDto hostInfo, String deviceKey, String secret, List<FingerMergeReq> reqList)
```

**FingerMergeReq:**
- `personSn` - Employee number (must exist)
- `fingerId` - Unique identifier
- `fingerNum` - 2 digits: [hand][finger]
  - First digit: 1=Left hand, 2=Right hand
  - Second digit: 1=Thumb, 2=Index, 3=Middle, 4=Ring, 5=Little
  - Example: `21` = Right hand index finger
- `feature` - Eigenvalue

### 2. Delete Fingerprint

```java
HfDeviceResp fingerDelete(HostInfoDto hostInfo, String deviceKey, String secret, FingerDeleteReq req)
```

### 3. Find Fingerprint List

```java
HfDeviceResp fingerFindList(HostInfoDto hostInfo, String deviceKey, String secret, FingerFindListReq req)
```

---

## Palm Vein Management APIs

### 1. Add or Update Palm Vein

```java
HfDeviceResp palmMerge(HostInfoDto hostInfo, String deviceKey, String secret, List<PalmMergeReq> reqList)
```

**PalmMergeReq:**
- `personSn` - Employee number
- `palmId` - Unique identifier
- `palmNum` - 1=Left hand, 2=Right hand
- `feature` - Eigenvalue

### 2. Delete Palm Vein

```java
HfDeviceResp palmDelete(HostInfoDto hostInfo, String deviceKey, String secret, PalmDeleteReq req)
```

### 3. Find Palm Vein List

```java
HfDeviceResp palmFindList(HostInfoDto hostInfo, String deviceKey, String secret, PalmFindListReq req)
```

---

## Record Management APIs

### 1. Find Record List

```java
HfDeviceResp recordFindList(HostInfoDto hostInfo, String deviceKey, String secret, RecordFindListReq req)
```

**RecordFindListReq:**
- `recordId` - Pass record ID
- `personType` - -1=All, 0=Unknown, 1=Employee, 2=Visitor, 3=Blacklist
- `recordType` - 0=All, 1=Face, 2=Card, 3=Card+Face, 4=Fingerprint
- `startTime` - Start timestamp
- `endTime` - End timestamp
- `index` - Page number
- `length` - Page size (default: 20)
- `order` - 1=Ascending, other=Descending

### 2. Find Specific Record

```java
HfDeviceResp recordFind(HostInfoDto hostInfo, String deviceKey, String secret, RecordFindReq req)
```

### 3. Delete Record

```java
HfDeviceResp recordDelete(HostInfoDto hostInfo, String deviceKey, String secret, RecordDeleteReq req)
```

---

## Access Control APIs

### 1. Access Control Group Management

```java
// Add or update access control group
HfDeviceResp acGroupMerge(HostInfoDto hostInfo, String deviceKey, String secret, AcGroupMergeReq req)

// Delete access control group
HfDeviceResp acGroupDelete(HostInfoDto hostInfo, String deviceKey, String secret, AcGroupDeleteReq req)

// Find access control group list
HfDeviceResp acGroupFindList(HostInfoDto hostInfo, String deviceKey, String secret, AcGroupFindListReq req)
```

### 2. Time Zone Management

```java
// Add or update time zone
HfDeviceResp acTimezoneMerge(HostInfoDto hostInfo, String deviceKey, String secret, AcTimezoneMergeReq req)

// Delete time zone
HfDeviceResp acTimezoneDelete(HostInfoDto hostInfo, String deviceKey, String secret, AcTimezoneDeleteReq req)

// Find time zone list
HfDeviceResp acTimezoneFindList(HostInfoDto hostInfo, String deviceKey, String secret, AcTimezoneFindListReq req)
```

**AcTimezoneMergeReq Example:**
```java
{
    acTzNumber: Integer,    // Time zone number
    acTzName: String,       // Time zone name
    sunStart: "00:00",      // Sunday start time
    sunEnd: "23:59",        // Sunday end time
    monStart: "00:00",      // Monday start time
    monEnd: "23:59",        // Monday end time
    // ... continues for each day of week
}
```

---

## Response Object: HfDeviceResp

```java
public class HfDeviceResp {
    private String cmd;      // Command
    private String seqId;    // Sequence ID
    private String code;     // Return code
    private String msg;      // Return message
    private Object data;     // Returned data object
}
```

**Success Response Code:** `"000"`

**Common Error Codes:**
- `101007` / `1500` - Face merge failure (check image quality, lighting, face visibility)
- `1201` - Person already exists

---

## Configuration Objects

### HostInfoDto

```java
public class HostInfoDto {
    private String host;        // Cloud IP address
    private int port;           // Cloud port number
    private int timeout;        // Connection timeout (default: 15000ms)
}
```

### DeviceResetReq

```java
public class DeviceResetReq {
    private Integer type;       // Reset type (1-5)
}
```

### DeviceGetConfigReq

```java
public class DeviceGetConfigReq {
    private Integer type;       // Configuration type
}
```

**Configuration Types:**
- `1` - Identification configuration
- `2` - Identification mode configuration
- `3` - Peripheral configuration
- `4` - Display configuration
- `5` - Server configuration
- `6` - Custom configuration

---

## Recognition Configuration (DeviceSetRecConfigReq)

### Recognition Thresholds

```java
private Integer recThreshold1vN = 65;    // 1:N face recognition (50-100)
private Integer recThreshold1v1 = 60;    // 1:1 face recognition (50-100)
private Integer recInterval = 3;         // Recognition interval (seconds)
```

**Higher threshold = Higher accuracy but slower speed**

### Recognition Distance

```java
private Integer recDistance = 0;
```

- `0` - No limit (default)
- `1` - Within 0.5 meters
- `2` - Within 1 meter
- `3` - Within 1.5 meters
- `4` - Within 2 meters
- `5` - Within 3 meters
- `6` - Within 4 meters

### Liveness Detection

```java
private Integer recRank = 1;
```

- `1` - No liveness detection (default)
- `2` - Monocular liveness
- `3` - Binocular liveness

### Voice and Display Settings

```java
// Success voice mode
private Integer recSucTtsMode = 2;
// 1 = No broadcast, 2 = Name broadcast, 100 = Custom

// Success display mode
private Integer recSucDisplayMode = 1;
// 1 = Name, 2 = No content, 100 = Custom

// Custom voice content (when mode = 100)
private String recSucTtsCustom = "{name}";

// Custom display content (when mode = 100)
private String recSucDisplayCustom = "{name}";
```

### Stranger Settings

```java
private Integer recStrangerEnable = 1;          // 0=Disable, 1=Enable
private Integer recIsStrangerTimes = 2;         // Failed attempts = stranger
private Integer recStrangerOpenDoor = 0;        // 0=Don't open, 1=Open
private Integer recStrangerTtsMode = 1;         // Voice mode
private Integer recStrangerDisplayMode = 1;     // Display mode
```

### Record Settings

```java
private Integer recSnapshotSave = 1;            // Save snapshot: 0=No, 1=Yes
private Integer recRecordSave = 1;              // Save record: 0=No, 1=Yes
private Integer recRecordSaveDays = 7;          // Days to keep records
private Integer recRecordUploadMode = 1;        // 1=Real-time, 2=Breakpoint resume
```

### ID Card Whitelist

```java
private Integer recWhitelistIdcard = 0;
```

- `0` - Off (default) - Direct person-ID comparison
- `1` - On - Check ID card exists in database first

---

## Recognition Mode Configuration (DeviceSetRecModeConfigReq)

### Mode Switches

```java
private Integer recModeFaceEnable = 1;      // Face: 0=Off, 1=On
private Integer recModeCardEnable = 1;      // Card: 0=Off, 1=On
private Integer recModeIdcardEnable = 0;    // ID card: 0=Off, 1=On
private Integer recModeQrcodeEnable = 0;    // QR code: 0=Off, 1=On
private Integer recModePalmEnable = 0;      // Palm: 0=Off, 1=On
private Integer recModeFingerEnable = 0;    // Fingerprint: 0=Off, 1=On
```

### Card Interface Configuration

```java
private Integer recModeCardIntf = 1;           // 1=Wiegand, 2=TTL, 3=USB
private Integer recModeCardIntfPort = 3;       // Serial port (1-4, 100=Custom)
private Integer recModeCardIntfBaudrate = 4;   // Baud rate
```

**Baud Rate Values:**
- `1` - 9600
- `2` - 19200
- `3` - 38400
- `4` - 115200 (default)

---

## Peripheral Configuration (DeviceSetPciConfigReq)

### Relay Control

```java
private Integer pciRelayOut = 1;        // 0=No door open, 1=Open door
private Integer pciRelayMode = 1;       // 1=Normally open, 2=Normally closed
private Integer pciRelayDelay = 1000;   // Control time (100-25500ms)
```

### Wiegand Output

```java
private Integer pciWgType = 1;          // 1=W26, 2=W34, 3=W37
private Integer pciWgOut = 0;           // Output type
```

**Wiegand Output Types:**
- `0` - No output (default)
- `1` - Output personnel ID
- `2` - Output card number

### Serial Port Output

```java
private Integer pciComOut = 0;              // Output type
private String pciComOutCustom;             // Custom content
private Integer pciComOutPort = 4;          // Port (1-4, 100=Custom)
private Integer pciComOutBaudrate = 4;      // Baud rate
```

### Fill Light

```java
private Integer pciLedAlwaysEnable = 0;     // 0=Off, 1=Always on
private Integer pciLedColorStranger = 1;    // 1=Red, 2=Green
```

---

## UI Configuration (DeviceSetUiConfigReq)

```java
private String uiCompanyName;               // Company name
private Integer uiShowIp = 1;               // Show IP: 0=Hide, 1=Show
private Integer uiShowSn = 1;               // Show SN: 0=Hide, 1=Show
private Integer uiShowPersonCount = 1;      // Show count: 0=Hide, 1=Show
private Integer uiScreensaverWait = 60;     // Screensaver timeout (seconds)
```

---

## Server Configuration (DeviceSetSevConfigReq)

### Upload URLs

```java
private String sevUploadRecRecordUrl;       // Recognition record upload URL
private String sevUploadDevHeartbeatUrl;    // Device heartbeat URL
private String sevUploadRegPersonUrl;       // Person registration URL
private String sevUploadRegFingerUrl;       // Fingerprint registration URL
private String sevUploadAlarmUrl;           // Alarm data URL
private String sevUploadRegPalmUrl;         // Palm registration URL
```

### Upload Switches

```java
private Integer sevUploadRecStrangerDataEnable = 1;     // Stranger: 0=Off, 1=On
private Integer sevUploadRecSnapshotEnable = 1;         // Snapshot: 0=Off, 1=On
private Integer sevUploadRecCardDataEnable = 1;         // Card: 0=Off, 1=On
private Integer sevUploadRecIdcardDataEnable = 1;       // ID card: 0=Off, 1=On
private Integer sevUploadRecQrcodeDataEnable = 0;       // QR code: 0=Off, 1=On
```

### Heartbeat

```java
private Integer sevUploadDevHeartbeatInterval = 60;     // Interval (10-300 seconds)
```

---

## Network Configuration

### WiFi Setup (DeviceSetWifiReq)

```java
private Integer dhcpEnable;     // 0=Manual IP, 1=DHCP
private String ssid;            // WiFi name (required)
private String pwd;             // WiFi password (empty if none)
private String ip;              // IP address (manual mode)
private String gateway;         // Gateway (manual mode)
private String dns;             // DNS server (manual mode)
```

### Wired Network (DeviceSetNetworkReq)

```java
private Integer dhcpEnable;                 // 0=Manual, 1=DHCP
private String ip;                          // IP address
private String gateway;                     // Gateway
private String subnetMask = "255.255.255.0"; // Subnet mask
private String dns;                         // DNS server
```

---

## Best Practices

### Face Registration Process

1. **Create Person First:**
   ```java
   PersonCreateReq personReq = new PersonCreateReq();
   personReq.setSn("EMP001");
   personReq.setName("John Doe");
   personReq.setType(1); // Employee
   HfDeviceClient.personCreate(hostInfo, deviceKey, secret, personReq);
   ```

2. **Then Add Face:**
   ```java
   FaceMergeReq faceReq = new FaceMergeReq();
   faceReq.setPersonSn("EMP001");
   faceReq.setImgBase64(base64Image);
   faceReq.setEasy(1); // Use loose detection
   HfDeviceClient.faceMerge(hostInfo, deviceKey, secret, faceReq);
   ```

### Error Handling

Always check response code:
```java
HfDeviceResp response = HfDeviceClient.faceMerge(...);
if ("000".equals(response.getCode())) {
    // Success
    System.out.println("Success: " + response.getMsg());
} else {
    // Error
    System.err.println("Error " + response.getCode() + ": " + response.getMsg());
}
```

### Image Quality Tips

- Use JPEG format for best compatibility
- Keep file size between 50KB - 400KB
- Resolution: 640x480 or 480x640 recommended
- Ensure good lighting (avoid shadows)
- Face should be front-facing and centered
- Avoid glasses, hats, or face coverings
- Set `easy = 1` for better success rate

### Time Synchronization

- Devices on public network auto-sync every 5 minutes
- For LAN-only devices, use `deviceSetTime()` to manually set time
- Public network time always overrides manual settings

---

## Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `000` | Success | Operation completed |
| `1201` | Person already exists | Use `personMerge()` or set `forceUpdate=true` |
| `101007` / `1500` | Face merge failure | Check image quality, lighting, face detection |

---

## Quick Reference

### Employee Registration Flow

```
1. Test device connectivity (test)
2. Create person record (personCreate)
3. Upload face image (faceMerge with easy=1)
4. Verify enrollment (personFind)
```

### Update Employee Flow

```
1. Update person info (personUpdate OR personMerge)
2. Update face if needed (faceMerge)
```

### Delete Employee Flow

```
1. Delete face first (faceDelete)
2. Delete person record (personDelete)
```

---

## Support Matrix

| Feature | Method | Supported |
|---------|--------|-----------|
| Face Recognition | `faceMerge` | ✅ Yes |
| Fingerprint | `fingerMerge` | ✅ Yes |
| Palm Vein | `palmMerge` | ✅ Yes |
| Card/RFID | `personCreate` + `cardNo` | ✅ Yes |
| QR Code | Recognition mode config | ✅ Yes |
| ID Card | Recognition mode config | ✅ Yes |
| Password | `personCreate` + `verifyPwd` | ✅ Yes |

---

**End of XO5 SDK Documentation**

*Last Updated: January 28, 2026*
