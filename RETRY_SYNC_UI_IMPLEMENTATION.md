# Retry Sync UI Implementation

## Overview
Added user interface components to allow manual retry of failed device synchronization for employees.

## Changes Made

### 1. **Retry Sync Button**
**Location:** `client/src/components/EmployeeModalWithJavaIntegration.js` (line ~2220)

**Features:**
- Only shows for existing employees with `deviceSyncStatus === 'failed'` or `'pending'`
- Orange button with spinning icon during loading
- Positioned between Cancel and Update buttons
- Disabled when loading

**Code:**
```javascript
{employee && (employee.deviceSyncStatus === 'failed' || employee.deviceSyncStatus === 'pending') && (
  <button
    type="button"
    onClick={handleRetryDeviceSync}
    disabled={loading}
    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
    title="Retry synchronizing this employee to the biometric device"
  >
    <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
    Retry Device Sync
  </button>
)}
```

---

### 2. **Retry Sync Handler Function**
**Location:** `client/src/components/EmployeeModalWithJavaIntegration.js` (line ~1023)

**Functionality:**
1. Validates employee exists
2. Checks if face image is captured (prompts user to capture if missing)
3. Calls backend retry endpoint: `POST /api/employees/:id/retry-device-sync`
4. Shows loading toast during sync
5. Updates local employee data on success
6. Closes modal after successful sync
7. Shows appropriate error messages on failure

**Code:**
```javascript
const handleRetryDeviceSync = async () => {
  if (!employee || !employee._id) {
    toast.error('No employee selected for retry');
    return;
  }

  if (!capturedImage) {
    toast.error('Please capture a face image before retrying device sync');
    setShowCamera(true);
    return;
  }

  setLoading(true);
  
  try {
    toast.loading('Retrying device synchronization...', { id: 'retry-sync' });
    
    const payload = { faceImage: capturedImage };
    const response = await axios.post(`/api/employees/${employee._id}/retry-device-sync`, payload);
    
    toast.dismiss('retry-sync');
    
    if (response.data.success) {
      const { deviceSync } = response.data.data;
      
      if (deviceSync.status === 'synced') {
        toast.success('Device synchronization successful!');
        
        // Update local employee data
        employee.deviceSyncStatus = 'synced';
        employee.deviceSyncAttempts = (employee.deviceSyncAttempts || 0) + 1;
        employee.lastDeviceSyncAttempt = new Date();
        
        setTimeout(() => { onClose(true); }, 1500);
      } else if (deviceSync.status === 'failed') {
        toast.error(`Device sync failed: ${deviceSync.message}`);
        
        employee.deviceSyncStatus = 'failed';
        employee.deviceSyncAttempts = (employee.deviceSyncAttempts || 0) + 1;
        employee.deviceSyncError = deviceSync.message;
      }
    } else {
      toast.error(response.data.message || 'Retry failed');
    }
  } catch (error) {
    console.error('❌ Retry device sync error:', error);
    toast.dismiss('retry-sync');
    
    const message = error.response?.data?.message || error.message || 'Retry failed';
    toast.error(`Failed to retry sync: ${message}`);
  } finally {
    setLoading(false);
  }
};
```

---

### 3. **Device Sync Status Badge**
**Location:** `client/src/components/EmployeeModalWithJavaIntegration.js` (Modal header)

**Features:**
- Shows for existing employees with sync status
- Color-coded badges:
  - ✓ **Green**: Device Synced
  - ✗ **Red**: Sync Failed
  - ⏳ **Yellow**: Pending Sync
  - ⟳ **Blue**: Syncing...
- Shows error message tooltip for failed syncs

**Code:**
```javascript
{employee && employee.deviceSyncStatus && (
  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
    employee.deviceSyncStatus === 'synced' 
      ? 'bg-green-100 text-green-800'
      : employee.deviceSyncStatus === 'failed'
      ? 'bg-red-100 text-red-800'
      : employee.deviceSyncStatus === 'pending'
      ? 'bg-yellow-100 text-yellow-800'
      : employee.deviceSyncStatus === 'syncing'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-gray-100 text-gray-800'
  }`}>
    {employee.deviceSyncStatus === 'synced' && '✓ Device Synced'}
    {employee.deviceSyncStatus === 'failed' && '✗ Sync Failed'}
    {employee.deviceSyncStatus === 'pending' && '⏳ Pending Sync'}
    {employee.deviceSyncStatus === 'syncing' && '⟳ Syncing...'}
  </span>
)}

{/* Error tooltip */}
{employee && employee.deviceSyncStatus === 'failed' && employee.deviceSyncError && (
  <span className="text-xs text-red-600" title={employee.deviceSyncError}>
    ℹ {employee.deviceSyncError.substring(0, 30)}...
  </span>
)}
```

---

## User Workflow

### Retry Failed Sync
1. Open employee list
2. Click on employee with failed device sync
3. **See status badge** in modal header showing "✗ Sync Failed"
4. **See error message** next to badge (if available)
5. Capture/update face image if needed
6. **Click "Retry Device Sync"** button (orange button)
7. System attempts to sync to device
8. See success/error toast message
9. Modal closes automatically on success

---

## Visual Elements

### Button Placement
```
[Cancel]  [Retry Device Sync]  [Update Employee]
  Gray      Orange (if failed)     Blue
```

### Status Badge Colors
- 🟢 **Green**: Successfully synced to device
- 🔴 **Red**: Failed to sync (can retry)
- 🟡 **Yellow**: Pending sync (not attempted yet)
- 🔵 **Blue**: Currently syncing

---

## Error Handling

### No Face Image
```
❌ "Please capture a face image before retrying device sync"
→ Opens camera automatically
```

### Device Offline/Error
```
❌ "Device sync failed: Device offline"
→ Increments retry attempts
→ User can retry again later
```

### Network Error
```
❌ "Failed to retry sync: Network Error"
→ Shows error toast
→ Retry button remains available
```

---

## Backend Integration

### Endpoint Used
```
POST /api/employees/:id/retry-device-sync
```

### Request Payload
```json
{
  "faceImage": "data:image/jpeg;base64,..."
}
```

### Response Format
```json
{
  "success": true,
  "data": {
    "employee": { ... },
    "deviceSync": {
      "status": "synced|failed",
      "synced": true|false,
      "canRetry": true|false,
      "message": "Success message or error"
    }
  }
}
```

---

## Testing Checklist

- [ ] Retry button only shows for employees with failed/pending status
- [ ] Retry button hidden for successfully synced employees
- [ ] Clicking retry without face image prompts to capture
- [ ] Retry shows loading state (spinning icon)
- [ ] Success updates employee status and closes modal
- [ ] Failure shows error message and keeps modal open
- [ ] Status badge shows correct color and text
- [ ] Error tooltip shows on hover for failed syncs
- [ ] Multiple retries increment attempt counter
- [ ] Toast messages show appropriate feedback

---

## Next Steps (Optional Enhancements)

1. **Batch Retry** - Add admin function to retry all failed syncs
2. **Auto-Retry** - Automatically retry failed syncs on app startup
3. **Retry Schedule** - Schedule automatic retries for failed syncs
4. **Sync History** - Show log of all sync attempts
5. **Filter by Status** - Add filters in employee list to show only failed syncs

---

## Files Modified
- ✅ `client/src/components/EmployeeModalWithJavaIntegration.js`
  - Added `handleRetryDeviceSync()` function
  - Added retry sync button
  - Added device sync status badge
  - Added error tooltip

---

## Summary
The retry sync UI is now fully implemented! Users can:
- **See** which employees have failed device sync (status badge)
- **Understand** why sync failed (error tooltip)
- **Retry** failed syncs with one click (retry button)
- **Track** progress with visual feedback (loading states, toasts)

This completes the database-first architecture implementation with full user control over device synchronization!
