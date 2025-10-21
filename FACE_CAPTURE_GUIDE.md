# Face Capture & Device Registration Guide

## Overview
The employee registration now includes face capture functionality that integrates with your face recognition device.

## Workflow

### 1. Add New Employee Flow
```
Frontend → Capture Face → Register to Device → Save to Database
```

**Steps:**
1. User clicks "Add Employee" button
2. Modal opens with camera section at top
3. Click "Start Camera" to activate webcam
4. Position face in the green frame overlay
5. Click "Capture Photo" when ready
6. Fill in employee details (Name, ID, Facility, etc.)
7. Click "Create" button

**Behind the Scenes:**
1. ✅ **Face Registration to Device** (FIRST)
   - Sends POST request to `facility.configuration.userApiUrl`
   - Payload format:
   ```json
   {
     "operator": "AddPerson",
     "info": {
       "Name": "John Doe",
       "IdCard": "12345",
       "RFIDCard": "12345",
       "RegPicinfo": "data:image/jpeg;base64,..."
     }
   }
   ```
   - If device registration fails → Error shown, employee NOT saved

2. ✅ **Save to Database** (ONLY if device succeeds)
   - Creates employee record
   - Stores base64 image in `profileImage` field
   - Shows success message

### 2. Edit Employee Flow
- Face capture optional (can update details without changing photo)
- If new photo captured, it will be updated
- Same device registration process applies

## Features

### Camera Interface
- ✅ Real-time video preview
- ✅ Green frame overlay for face positioning
- ✅ Capture button
- ✅ Retake functionality
- ✅ Cancel option
- ✅ Preview captured image
- ✅ Camera auto-stops after capture

### Validation
- ✅ Face photo required for new employees
- ✅ Shows error if submitted without photo
- ✅ Device registration checked before database save
- ✅ Rollback: If device fails, database not updated

### User Experience
- 📸 Clear visual feedback with green checkmark
- 🔄 Retake button if photo quality is poor
- ⚠️ Error messages if camera access denied
- ✅ Success toast when device registration succeeds
- 📱 Responsive design for different screen sizes

## Technical Details

### Frontend (EmployeeModal.js)
```javascript
// Camera access
const startCamera = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ 
    video: { width: 640, height: 480, facingMode: 'user' } 
  });
  videoRef.current.srcObject = stream;
}

// Capture photo
const capturePhoto = () => {
  const canvas = canvasRef.current;
  const context = canvas.getContext('2d');
  context.drawImage(videoRef.current, 0, 0);
  const imageData = canvas.toDataURL('image/jpeg', 0.9);
  setCapturedImage(imageData);
}

// Register to device
const registerToDevice = async (employeeData, faceImage) => {
  // Generate personUUID if not provided
  const personUUID = employeeData.deviceId || generatePersonUUID();
  
  const response = await axios.post(
    facility.configuration.userApiUrl,
    {
      operator: 'AddPerson',
      info: {
        Name: `${firstName} ${lastName}`,
        personUUID: personUUID,
        RFIDCard: employeeData.deviceId || '0',
        RegPicinfo: faceImage
      }
    }
  );
  
  return { ...response.data, personUUID };
}

// Auto-generate UUID
const generatePersonUUID = () => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `${timestamp}-${randomStr}`;
}
```

### Backend (Employee Model)
```javascript
profileImage: {
  type: String, // Base64 encoded image
  default: null
}
```

### Device API Format
Your device expects this format for user registration:
```json
POST {userApiUrl}
{
  "operator": "AddPerson",
  "info": {
    "Name": "John Doe",
    "personUUID": "1729123456789-ABC123D",
    "RFIDCard": "0",
    "RegPicinfo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA..."
  }
}
```

**Note:** `personUUID` is auto-generated with format: `timestamp-randomString` (e.g., `1729123456789-ABC123D`)  
- If you provide a Device ID in the form, it will be used as `personUUID`
- If left empty, a unique UUID will be automatically generated
- This UUID is then saved to the employee's `deviceId` field in the database

## Browser Requirements
- ✅ Chrome 53+
- ✅ Firefox 36+
- ✅ Safari 11+
- ✅ Edge 12+
- ⚠️ Requires HTTPS (or localhost)
- ⚠️ User must grant camera permissions

## Configuration

### Facility Setup
Make sure your facility has the User API URL configured:

1. Go to **Facilities** page
2. Edit your facility
3. Under "Device API Configuration", set:
   - **Device API URL**: For attendance records (already set)
   - **User API URL**: For face registration (e.g., `https://abc123.ngrok.io/api/users`)

### Testing
1. Open browser developer tools (F12)
2. Go to Console tab
3. Add new employee
4. Watch for these logs:
   - `Registering face to device...`
   - Device API response
   - `Face registered to device successfully!`
   - `Employee created and registered to device successfully`

## Troubleshooting

### Camera Not Working
- **Error**: "Failed to access camera"
- **Solution**: 
  - Check browser permissions (click lock icon in address bar)
  - Ensure site is HTTPS or localhost
  - Try different browser
  - Check if another app is using camera

### Device Registration Fails
- **Error**: "Failed to register face to device"
- **Check**:
  - Is User API URL configured in facility?
  - Is device online and accessible?
  - Check device API response format
  - Verify device accepts base64 images

### Image Too Large
- **Issue**: Upload fails or slow
- **Solution**: 
  - Image is compressed to JPEG 0.9 quality
  - Canvas size limited to 640x480
  - Consider reducing quality further if needed

## Next Steps

### Enhancements You Can Add
1. **Face quality check** - Validate face is clearly visible
2. **Multiple photos** - Capture 3-5 angles for better recognition
3. **Bulk registration** - Import CSV + photos
4. **Re-registration** - Update face data for existing employees
5. **Face comparison** - Verify face before attendance

### Device Sync
- Employees registered via UI are sent to device immediately
- Employees created via device sync are auto-created in database
- Both systems stay in sync automatically

## Security Notes
- ⚠️ Base64 images can be large (consider cloud storage for production)
- ✅ Images stored in database (encrypted if using MongoDB encryption)
- ✅ No images stored in browser after submission
- ✅ Camera stream cleaned up on modal close

---

**Status**: ✅ Fully implemented and ready to use!

**Test**: Add a new employee with face capture to verify device integration.
