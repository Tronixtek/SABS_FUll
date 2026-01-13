# Auto-PIN Generation System

## Overview
When a new employee is created, the system automatically generates a 6-digit PIN for employee self-service portal access.

## How It Works

### Backend Implementation

#### 1. Employee Creation (`POST /api/employees`)
When an employee is created via the standard endpoint:
- Auto-generates a random 6-digit PIN (100000-999999)
- Sets `employeeSelfServiceEnabled = true`
- Sets `pinMustChange = true` (forces PIN change on first login)
- Returns the PIN in the response for admin to communicate to employee

#### 2. Device Registration (`POST /api/employees/register`)
When an employee is registered with biometric device:
- Same auto-PIN generation logic applies
- PIN is generated after successful device enrollment
- PIN included in success response

### Frontend Display

#### Employee Creation Modal
After successfully creating an employee:
1. **Alert Modal** displays:
   - Employee full name
   - Employee ID
   - Staff ID
   - Generated PIN
   - Important security notes
   - Employee portal URL

2. **Success Toast** shows:
   - "Employee created! PIN: [PIN] (shown in alert)"
   - Duration: 10 seconds for admin to copy

### Security Features

#### PIN Properties
- **Length**: 6 digits (secure but memorable)
- **Format**: Numeric only (100000-999999)
- **Hashing**: Automatically hashed using bcrypt before storage
- **One-time Display**: Only shown once to admin during creation

#### Forced PIN Change
- `pinMustChange` flag set to `true` on creation
- Employee MUST change PIN on first login
- Prevents security risk if PIN is intercepted

#### Account Lock
- Failed login attempts tracked
- Account locks after 5 failed attempts
- Prevents brute-force attacks

### Employee Portal Login

#### Credentials
- **Staff ID**: Auto-assigned (e.g., KNLG0001, EMP00112)
- **PIN**: Auto-generated 6-digit number

#### First Login Flow
1. Employee enters Staff ID + PIN
2. System validates credentials
3. If valid but `pinMustChange = true`:
   - Redirect to Change PIN page
   - Must provide current PIN + new PIN
   - New PIN must be different from current
   - `pinMustChange` flag cleared after successful change

### Admin Workflow

#### Creating New Employee
1. Open employee creation modal
2. Fill in employee details:
   - Basic info (name, email, phone)
   - Facility assignment
   - Shift assignment
   - Department, designation
   - Capture face photo (required for biometric)
3. Submit form
4. **IMPORTANT**: Copy PIN from alert/toast immediately
5. Communicate credentials to employee via secure channel:
   - In-person handover (recommended)
   - Sealed envelope
   - Encrypted email
   - SMS (last resort)

#### PIN Communication Template
```
Employee Portal Access

URL: [Your Portal URL]/employee-login
Staff ID: [STAFF_ID]
PIN: [6-DIGIT-PIN]

IMPORTANT:
- You will be required to change your PIN on first login
- Keep your PIN secure and don't share it
- Contact HR if you forget your PIN
```

### API Response Format

#### Successful Employee Creation
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "employeeId": "KNLG0005",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "facility": {...},
    "shift": {...}
  },
  "selfServiceCredentials": {
    "staffId": "KNLG0005",
    "pin": "123456",
    "note": "This PIN will only be displayed once. Please save it securely and provide it to the employee."
  }
}
```

#### Device Registration Response
```json
{
  "success": true,
  "message": "Employee registered successfully",
  "data": {
    "employee": {...},
    "deviceEnrollment": {
      "deviceId": "DEVICE001",
      "personId": "KNLG0005",
      "status": "enrolled",
      "facilityName": "Main Facility"
    },
    "selfServiceCredentials": {
      "staffId": "KNLG0005",
      "pin": "654321",
      "note": "This PIN will only be displayed once. Please save it securely and provide it to the employee."
    },
    "steps": {
      "validation": "completed",
      "deviceEnrollment": "completed",
      "databaseSave": "completed"
    }
  }
}
```

## Testing

### Test Employee Creation
```javascript
// Using Postman or similar
POST http://localhost:5000/api/employees
Authorization: Bearer [ADMIN_TOKEN]
Content-Type: application/json

{
  "firstName": "Test",
  "lastName": "Employee",
  "email": "test@example.com",
  "phone": "1234567890",
  "facility": "[FACILITY_ID]",
  "shift": "[SHIFT_ID]",
  "department": "IT",
  "designation": "Developer"
}

// Response will include selfServiceCredentials with generated PIN
```

### Test Employee Login
```javascript
POST http://localhost:5000/api/employee-auth/login
Content-Type: application/json

{
  "staffId": "KNLG0005",
  "pin": "123456"
}

// If pinMustChange = true, redirect to change PIN page
```

### Test PIN Change
```javascript
PUT http://localhost:5000/api/employee-auth/change-pin
Authorization: Bearer [EMPLOYEE_TOKEN]
Content-Type: application/json

{
  "currentPin": "123456",
  "newPin": "654321"
}

// Success: pinMustChange flag cleared, new PIN set
```

## Database Schema

### Employee Model Fields
```javascript
{
  pin: {
    type: String,
    minlength: 4,
    maxlength: 6,
    select: false  // Never included in normal queries
  },
  pinAttempts: {
    type: Number,
    default: 0
  },
  pinLockedUntil: {
    type: Date,
    default: null
  },
  employeeSelfServiceEnabled: {
    type: Boolean,
    default: false  // Set to true on creation
  },
  pinMustChange: {
    type: Boolean,
    default: false  // Set to true on creation, cleared after first change
  }
}
```

### Pre-Save Hook (Auto-Hashing)
```javascript
// Hash PIN before saving (only if modified)
employeeSchema.pre('save', async function(next) {
  if (this.isModified('pin')) {
    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(this.pin, salt);
  }
  next();
});
```

## Troubleshooting

### PIN Not Displayed in UI
**Cause**: Response not properly parsed or modal dismissed too quickly
**Solution**: Check browser console for response data, PIN is in `data.selfServiceCredentials.pin`

### Employee Can't Login
**Possible Causes**:
1. Wrong Staff ID format (use exact value from creation)
2. Wrong PIN (check if copied correctly)
3. Account locked (after 5 failed attempts)
4. `employeeSelfServiceEnabled = false`

**Solution**: Check database or use admin panel to reset PIN

### PIN Not Hashing
**Cause**: Pre-save hook not triggering
**Solution**: Ensure `this.isModified('pin')` returns true before save

### First Login Doesn't Force PIN Change
**Cause**: `pinMustChange` flag not set during creation
**Solution**: Verify flag is set in createEmployee and registerEmployeeWithDevice functions

## Security Best Practices

1. **Never Log PINs**: Remove all console.log statements with actual PINs in production
2. **HTTPS Only**: Always use HTTPS for employee portal
3. **Secure Communication**: Use secure channels to communicate PINs to employees
4. **Regular Audits**: Monitor failed login attempts and locked accounts
5. **PIN Expiry**: Consider implementing PIN expiry after X days (future enhancement)
6. **Strong PINs**: Current 6-digit format provides 1,000,000 combinations

## Future Enhancements

### Possible Improvements
1. **Email Delivery**: Auto-send PIN via email on creation
2. **SMS Delivery**: Send PIN via SMS
3. **PIN Complexity**: Allow alphanumeric PINs (optional)
4. **PIN Expiry**: Force PIN change every 90 days
5. **Multi-Factor**: Add OTP for sensitive operations
6. **Audit Log**: Track all PIN changes and login attempts
7. **Self-Service Reset**: Allow employees to reset PIN via email verification

## Related Files

### Backend
- `server/controllers/employeeController.js` - PIN generation logic
- `server/controllers/employeeAuthController.js` - PIN validation and change
- `server/models/Employee.js` - PIN schema and hashing

### Frontend
- `client/src/components/EmployeeModalWithJavaIntegration.js` - PIN display modal
- `client/src/pages/EmployeeLogin.js` - PIN login form
- `client/src/pages/EmployeeProfile.js` - Change PIN form

## Support

For questions or issues:
1. Check server logs for PIN generation confirmation
2. Verify employee record in database has `employeeSelfServiceEnabled = true`
3. Confirm PIN is 6 digits and numeric only
4. Test with fresh employee creation
5. Contact system administrator if issues persist
