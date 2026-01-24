# Leave System Updates - Policy Management

## Changes Made (January 24, 2026)

### 1. ✅ Removed Urgency Level from Employee Self-Service
**Issue**: Every leave requires approval, so urgency level selection was redundant.

**Changes**:
- Removed urgency field from employee leave request form
- Removed urgency level selection UI
- System automatically handles urgent approvals (Official Assignment requires same-day approval)

**Files Modified**:
- `client/src/pages/employee/RequestLeave.js`
  - Removed `urgency` from form state
  - Removed urgency levels constant
  - Removed urgency selection UI
  - Removed urgency from API request payload

### 2. ✅ Created Leave Policy Management Page
**Issue**: No admin interface to edit special case leave policies (payment status, documentation, etc.)

**Solution**: Created comprehensive policy management interface

**New File**:
- `client/src/pages/LeavePolicyManagement.js`

**Features**:
- **View All Policies**: Grid display of all 11 leave types
- **Payment Status Management**: 
  - Toggle between Paid/Unpaid
  - Set salary percentage (0-100%)
  - Visual badges (green = 100% paid, yellow = partial, red = unpaid)
- **Documentation Requirements**:
  - Enable/disable documentation requirement
  - Configure required documents list
- **Notice Period**: Set minimum notice days required
- **Balance Limits**: Toggle balance enforcement
- **Policy Description**: Edit leave type descriptions

**Navigation**:
- Added to admin navigation: `/app/leave-policies`
- Requires `manage_settings` permission
- Listed as "Leave Policies" in sidebar

## How to Use Leave Policy Management

### Accessing the Page
1. Log in to admin portal
2. Navigate to **Leave Policies** in the sidebar
3. View all 11 leave types with current settings

### Editing a Policy
1. Click **Edit Policy** button on any leave type card
2. Modify settings:
   - **Payment Status**: Choose Paid or Unpaid
   - **Salary Percentage**: Set 0-100% if paid
   - **Balance Limit**: Enable/disable balance checking
   - **Minimum Notice**: Set days required (e.g., 7 for annual leave)
   - **Documentation**: Check box and list required documents
   - **Description**: Update leave type description
3. Click **Save Changes**

### Common Scenarios

#### Make Sabbatical Leave Unpaid
1. Edit Sabbatical Leave policy
2. Select "Unpaid" radio button
3. Save changes

#### Require Medical Certificate for Sick Leave
1. Edit Leave of Absence policy
2. Check "Requires documentation"
3. Enter: `Medical certificate, Hospital letter`
4. Save changes

#### Set 7-Day Notice for Annual Leave
1. Edit Annual Leave policy
2. Set "Minimum Notice Days" to `7`
3. Save changes

#### Change Maternity Leave to 80% Paid
1. Edit Maternity Leave policy
2. Select "Paid" radio button
3. Set "Salary Percentage" to `80`
4. Save changes

## Default Settings (All Leaves 100% Paid)
Currently, all 11 leave types are set to:
- **isPaid**: true
- **salaryPercentage**: 100
- **Status**: Fully Paid

This can be changed per leave type using the policy management page.

## Backend API Endpoints
The policy management page uses these endpoints:

- `GET /api/leave-policy` - Fetch all policies
- `GET /api/leave-policy/:type` - Fetch specific policy
- `PUT /api/leave-policy/:type` - Update policy settings
- `POST /api/leave-policy/:type/facility-override` - Add facility-specific rules

## Next Steps
1. ✅ Run seed script: `npm run seed:leave-policies`
2. ✅ Test policy management page
3. ⏳ Configure policies as needed for your organization
4. ⏳ Set facility-specific overrides if needed
5. ⏳ Test leave requests with updated policies

## Files Modified/Created

### New Files
- `client/src/pages/LeavePolicyManagement.js` - Policy management UI

### Modified Files
- `client/src/pages/employee/RequestLeave.js` - Removed urgency field
- `client/src/App.js` - Added policy route
- `client/src/components/Layout.js` - Added navigation link

## Navigation Structure
```
Admin Portal
├── Leave Requests (/app/leave) - Approve/reject requests
└── Leave Policies (/app/leave-policies) - Configure policy settings
```

Employee Portal
├── Request Leave (/employee-app/request-leave) - Submit requests (no urgency field)
└── Leave Balance (/employee-app/leave-balance) - View balances with payment status
```
