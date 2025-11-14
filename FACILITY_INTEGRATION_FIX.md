# Facility Integration Type Fix

## Issues Identified and Resolved

### 1. Frontend-Backend Field Mismatch
**Problem**: The facility form was using `configuration.deviceType` while the model expected `configuration.integrationType`

**Fixed**:
- Updated all references in `client/src/pages/Facilities.js` from `deviceType` to `integrationType`
- Form field name: `configuration.deviceType` → `configuration.integrationType`
- Form data binding: `formData.configuration.deviceType` → `formData.configuration.integrationType`

### 2. Enum Value Mismatch
**Problem**: Frontend was sending `'java'` but model expected `'java-xo5'`

**Fixed**:
- Updated default value: `'java'` → `'java-xo5'`
- Updated form option values: `value="java"` → `value="java-xo5"`
- Updated fallback values in edit mode

### 3. Model Schema Cleanup
**Problem**: Redundant and XO5-specific configuration fields

**Fixed**:
- Removed deprecated `deviceType` field from configuration schema
- Renamed `xo5Config` to `smartDeviceConfig` for device-agnostic approach
- Maintained backward compatibility for existing facilities

## Updated Integration Types

### Frontend Form Options
```javascript
<option value="java-xo5">Smart Device (Full Management)</option>
<option value="legacy">Standard Device (Basic)</option>
```

### Model Schema
```javascript
integrationType: {
  type: String,
  enum: ['legacy', 'java-xo5'],
  default: 'legacy'
}
```

### Employee Registration Compatibility
- Smart Device (`java-xo5`): Enables device enrollment with Java service
- Standard Device (`legacy`): Basic database-only registration

## Testing Steps

1. **Create New Facility**:
   ```
   - Open Facilities page
   - Click "Add Facility"
   - Fill required fields
   - Select "Smart Device (Full Management)" 
   - Save facility
   ```

2. **Verify Integration Type**:
   ```
   - Check facility configuration in database
   - Verify integrationType field is set to 'java-xo5'
   - Test employee registration with smart device features
   ```

3. **Test Employee Registration**:
   ```
   - Open Employee Registration
   - Select facility with Smart Device type
   - Verify biometric enrollment section appears
   - Complete registration with device enrollment
   ```

## Files Updated

- `client/src/pages/Facilities.js` - Updated form fields and values
- `server/models/Facility.js` - Cleaned up schema, renamed XO5-specific fields

## Verification Commands

```bash
# Check facility data structure
node check-facility.js

# Test facility creation
curl -X POST http://localhost:5000/api/facilities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Test Facility","code":"TEST001","deviceApiUrl":"http://test.com","configuration":{"integrationType":"java-xo5"}}'
```

The facility creation error should now be resolved, and the integration type should properly control employee registration features.