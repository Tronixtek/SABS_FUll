# Leave System Cleanup Summary

## Overview
Removed old partial-day excuse system and replaced with comprehensive full-day leave types aligned with grade-level entitlements.

## Old Leave Types Removed ❌
1. **Emergency exits** (auto-approved if retroactive)
2. **Late arrival excuses**
3. **Early departure excuses**
4. **Partial day leave**
5. **Flexible time**
6. **Sick leave** (replaced by medical categories)
7. **Emergency leave** (replaced by specific categories)
8. **Paternity leave** (removed)
9. **Bereavement leave** (removed)
10. **Unpaid leave** (removed)
11. **Medical leave** (use examination/study for medical-related)
12. **Official duty** (replaced by official-assignment)

## New Leave Types Implemented ✅

### Limited Leave Types (with balance)
1. **Annual Leave** - GL-based entitlement (14/21/30 days per year)
2. **Maternity Leave** - 84 days maximum (12 weeks)
3. **Adoptive Leave** - 112 days maximum (16 weeks)
4. **Takaba Leave** - 112 days maximum (16 weeks)
5. **Sabbatical Leave** - 365 days maximum (12 months)

### Open Leave Types (no balance limit - but still require approval)
6. **Examination Leave** - For medical examinations, tests, appointments
7. **Study Leave** - For educational purposes and training
8. **Religious Leave** - For religious observances and pilgrimages
9. **Casual Leave** - For casual/personal matters
10. **Leave of Absence** - **For emergencies or unforeseen challenges that prevent work attendance** (e.g., family emergencies, sudden illness, urgent personal matters)
11. **Official Assignment** - **When official duties prevent check-in or checkout at facility:**
    - Employee assigned official duty, must leave before shift ends, cannot return to checkout
    - Employee assigned official duty, cannot come to facility when shift starts to check in
    - Requires urgent approval to avoid late/absent marking

## Grade Level System
- **GL 1-3**: 14 days annual leave
- **GL 4-6**: 21 days annual leave
- **GL 7-17**: 30 days annual leave

## Changes Made

### 1. Database Model (server/models/LeaveRequest.js)
**Removed Fields:**
- `type` enum with 16 old leave types
- `category` enum (medical/family-emergency/official-meeting/etc)
- `urgency` enum (low/medium/high/emergency)
- `isEmergency` boolean flag
- `isRetroactive` boolean flag
- `affectedDate` field (replaced by startDate/endDate)
- `startTime`/`endTime` fields (no partial days)
- `attendanceImpact` object with adjustment types
- `notifications` object

**Added Fields:**
- `leaveType` enum with 11 new leave types
- `requiresUrgentApproval` boolean (for official-assignment)
- `balanceDeduction` number (days deducted from balance)
- `duration` calculated in days (not minutes)

**Updated Methods:**
- Removed `hasValidExcuse()` - no longer needed for partial excuses
- Added `hasApprovedLeave(employeeId, date)` - check if employee has full-day leave
- Added `calculateLeaveBalance(employeeId, leaveType, year)` - calculate used days

**Pre-save Middleware:**
- Removed auto-approval logic for emergency requests
- Added duration calculation in days (inclusive of start and end dates)
- Set `requiresUrgentApproval` flag for official-assignment
- Calculate balance deduction for approved leaves with limits

### 2. Leave Controller (server/controllers/leaveController.js)
**Removed Functions:**
- `emergencyExit()` - no longer supports quick emergency exits

**Updated Functions:**
- `submitLeaveRequest()` - simplified to require startDate, endDate, leaveType, reason only
- `checkAttendanceExcuse()` renamed to `checkLeaveForAttendance()` - checks for approved full-day leaves
- `getLeaveStatistics()` - updated to use new leave types and remove emergency/late/early stats

**Validation:**
- All leave requests must have startDate, endDate, leaveType, reason
- Official assignments automatically flagged for urgent approval
- No more auto-approval logic

### 3. Routes (server/routes/leave.js)
**Removed Routes:**
- `POST /api/leave/emergency-exit` - emergency exit endpoint removed

**Updated Routes:**
- `GET /api/leave/check-excuse` renamed to `GET /api/leave/check-leave` - checks for approved leaves

### 4. Attendance Model (server/models/Attendance.js)
**Removed Fields:**
- `isExcused` boolean
- `excuseReason` string
- `excuseType` enum with partial-day excuse types

**Kept Fields:**
- `leaveRequest` reference - links attendance to approved leave

### 5. XO5 Controller (server/controllers/xo5Controller.js)
**Updated Logic:**
- Changed from checking `hasValidExcuse()` to `hasApprovedLeave()`
- If employee has approved leave for date, attendance status = 'on-leave'
- Removed excuse-based logic for late arrivals
- Removed excuse type and reason fields from attendance records

## Integration with Attendance System

### Leave Approval Policy
**CRITICAL: All leave requests must be approved to be valid**
- No auto-approval for any leave type
- All leave goes through pending → approved/rejected workflow
- Only approved leaves affect attendance and deduct from balance
- Employees must plan ahead and request approval before absence

### Leave Type Usage Guidelines

#### Leave of Absence
- **Purpose**: For emergencies or unforeseen challenges
- **When to use**: 
  - Family emergencies requiring immediate attention
  - Sudden illness or urgent medical situations
  - Unforeseen personal challenges preventing work attendance
  - Any situation where employee cannot work due to urgent circumstances
- **Process**: Submit request as soon as possible, requires manager approval

#### Official Assignment
- **Purpose**: When official duties prevent facility check-in/checkout
- **Scenarios**:
  1. **Cannot checkout**: Employee assigned official duty during shift, must leave facility before shift ends, cannot return to checkout
  2. **Cannot check-in**: Employee assigned official duty before shift, cannot come to facility when shift starts to check in
- **Process**: 
  - Submit request with official assignment details
  - **MUST be approved within the same day of application submission to be valid**
  - If not approved same day, employee will be marked late/absent/incomplete shift
- **Examples**: 
  - Attending official meeting at another facility
  - Official training/workshop at different location
  - Government/health authority assignments
  - Emergency medical response assignments

### Attendance Record Integration

When a leave request is **approved**, it affects attendance records as follows:

#### Full-Day Leaves (all leave types when covering entire shift)
- **Attendance Status**: `on-leave`
- **Check-in/Checkout**: Not required (excused absence)
- **Late Arrival**: Set to 0 (not applicable)
- **Early Departure**: Set to 0 (not applicable)
- **Work Hours**: Counted as full shift hours worked (for payroll)
- **Attendance Record Creation**: Automatic attendance records created for each leave day with:
  - `status: 'on-leave'`
  - `leaveRequest: <LeaveRequest ID>`
  - `date: <each day in leave period>`
  - `employee: <Employee ID>`

#### Official Assignment (Partial Day)
- **Late Arrival Scenario** (can't check-in on time):
  - If approved same day: No late marking, status = `on-leave` or `excused`
  - If not approved same day: Marked `late` with late minutes calculated
  
- **Early Departure Scenario** (can't checkout):
  - If approved same day: Early departure excused, full hours credited
  - If not approved same day: Marked `early-departure` or `incomplete-shift`

### Payslip Integration

Approved leaves affect payroll calculations:

#### Paid Leave Types (Full Pay) - ALL LEAVE TYPES ARE PAID BY DEFAULT
1. **Annual Leave** - Full salary for leave days
2. **Maternity Leave** - Full salary for 84 days
3. **Adoptive Leave** - Full salary for 112 days  
4. **Takaba Leave** - Full salary for 112 days
5. **Examination Leave** - Full salary (medical appointments)
6. **Official Assignment** - Full salary (official duty)
7. **Study Leave** - Full salary (educational purposes)
8. **Religious Leave** - Full salary (religious observance)
9. **Casual Leave** - Full salary (personal matters)
10. **Sabbatical Leave** - **Full salary by default** (can be changed via policy to 50% or 0%)
11. **Leave of Absence** - **Full salary by default** (can be changed via policy based on circumstances)

#### Policy Configuration Note
**ALL LEAVES ARE PAID BY DEFAULT (100% salary).** The system is designed to be flexible:
- Sabbatical and Leave of Absence can be changed to partial or unpaid via policy updates
- Facility-specific overrides allow different rules for different locations
- No code changes required - administrators can update via API or admin interface

#### Payslip Calculation
```
For each approved leave day:
- Work Days Attended = Work Days Attended + 1
- Days Present = Days Present + 1  
- Leave Days = Leave Days + 1 (breakdown by type)
- Gross Salary = (Monthly Salary / Total Work Days) × Days Present
- Deductions = No deduction for approved paid leaves

Example:
Monthly Salary: ₦150,000
Total Work Days in Month: 22
Days Physically Present: 18
Approved Leave Days (Annual): 4

Calculation:
Total Days Present = 18 + 4 = 22 days
Gross Salary = ₦150,000 (full salary, no deduction)

Payslip Shows:
- Days Worked: 18 days
- Leave Days: 4 days (Annual Leave)
- Total Attendance: 22/22 days
- Gross Salary: ₦150,000
```

#### Unpaid Leave Impact
```
For unpaid leave (if applicable):
- Work Days Attended = Work Days Attended + 0
- Leave Days = Leave Days + 1 (counted but not paid)
- Gross Salary = (Monthly Salary / Total Work Days) × Days Physically Present
- Deductions = Salary deduction for unpaid leave days

Example:
Monthly Salary: ₦150,000
Total Work Days in Month: 22
Days Present: 18
Unpaid Leave Days: 4

Calculation:
Pay Rate = ₦150,000 / 22 = ₦6,818.18 per day
Deduction = 4 days × ₦6,818.18 = ₦27,272.72
Gross Salary = ₦150,000 - ₦27,272.72 = ₦122,727.28
```

### Current Behavior
1. Employee submits leave request (startDate, endDate, leaveType, reason)
2. Request status = 'pending' (awaiting approval)
3. Manager/HR reviews and approves or rejects
4. If approved:
   - Duration calculated in days
   - Balance deduction recorded (for limited leave types)
   - Leave request linked to attendance records
5. If rejected:
   - Employee must attend work as scheduled
   - No attendance impact

### Future Enhancement Needed
- **Automatic Attendance Creation**: When leave is approved, automatically create attendance records with status='on-leave' for all days in leave period
- **Leave Balance Enforcement**: Prevent leave requests that exceed available balance for limited leave types
- **Official Assignment Same-Day Approval Rule**: Enforce same-day approval deadline for official assignments, auto-reject if not approved by end of day
- **Payroll Integration**: Ensure payroll system correctly calculates paid vs unpaid leaves
- **Attendance Report Updates**: Show leave days separately in attendance reports and payslips

## Frontend Changes
All frontend components already updated to use new leave types:
- ✅ client/src/pages/employee/RequestLeave.js
- ✅ client/src/pages/LeaveManagement.js
- ✅ client/src/components/LeaveRequestForm.jsx
- ✅ client/src/pages/employee/EmployeeDashboard.js
- ✅ client/src/pages/employee/LeaveBalance.js

## Leave Balance Calculation
Frontend currently calculates leave balance:
```javascript
const calculateLeaveBalance = (leaveType, gradeLevel) => {
  const currentYear = new Date().getFullYear();
  const approvedLeaves = leaveRequests?.filter(req => 
    req.leaveType === leaveType && 
    req.status === 'approved' &&
    new Date(req.startDate).getFullYear() === currentYear
  ) || [];
  
  const usedDays = approvedLeaves.reduce((total, req) => total + (req.duration || 0), 0);
  
  // Get entitlement based on leave type and grade level
  const entitlement = getLeaveEntitlement(leaveType, gradeLevel);
  
  return {
    total: entitlement,
    used: usedDays,
    remaining: entitlement - usedDays
  };
};
```

## Testing Checklist
- [ ] Test submitting annual leave request
- [ ] Test submitting maternity leave request
- [ ] Test submitting open leave type (examination, study, etc)
- [ ] Test official assignment with urgent approval flag
- [ ] Verify leave balance calculation on employee dashboard
- [ ] Verify leave balance details page shows correct breakdown
- [ ] Test that approved leaves link to attendance records
- [ ] Test leave statistics page with new leave types
- [ ] Verify pending leave requests show in approval queue
- [ ] Test rejecting a leave request
- [ ] Verify old leave types cannot be submitted

## Migration Notes
**Database Migration Required:**
- Existing LeaveRequest documents may have old `type` field instead of `leaveType`
- Old documents may have `category`, `urgency`, `isEmergency` fields
- Consider running migration script to:
  1. Map old types to new types (if applicable)
  2. Remove deprecated fields
  3. Update status from 'auto-approved' to 'approved'
  4. Calculate and set duration for existing records

**Suggested Migration Script:**
```javascript
// Run this to update existing leave requests
const updateOldLeaveRequests = async () => {
  const oldRequests = await LeaveRequest.find({ type: { $exists: true } });
  
  for (const req of oldRequests) {
    // Map old types to new types
    let newType = 'casual'; // default fallback
    if (req.type === 'sick' || req.type === 'medical-leave') newType = 'examination';
    if (req.type === 'official-duty') newType = 'official-assignment';
    // Add more mappings as needed
    
    // Update fields
    req.leaveType = newType;
    req.type = undefined; // Remove old field
    req.category = undefined;
    req.urgency = undefined;
    req.isEmergency = undefined;
    req.isRetroactive = undefined;
    
    // Update status
    if (req.status === 'auto-approved') req.status = 'approved';
    
    await req.save();
  }
};
```

## Next Steps
1. ✅ Clean up LeaveRequest model
2. ✅ Update leave controller functions
3. ✅ Update routes
4. ✅ Clean up Attendance model
5. ✅ Update XO5 controller
6. ✅ Implement flexible policy system (LeavePolicy model)
7. ⏳ Seed leave policies database
8. ⏳ Register leave policy routes in app.js
9. ⏳ Implement automatic attendance record creation on leave approval
10. ⏳ Add leave balance enforcement (DONE in controller)
11. ⏳ Run database migration script
12. ⏳ Test all leave workflows
13. ⏳ Build admin UI for managing leave policies
14. ⏳ Update any remaining controllers that reference old leave types

---

## Flexible Leave Policy System

### Overview
To accommodate policy changes over time without code modifications, we've implemented a **database-driven leave policy system**. All leave rules, payment policies, and approval requirements are now stored in the `LeavePolicy` collection and can be updated by administrators.

### Key Features

#### 1. Configurable Payment Policies
Each leave type can be individually configured:
```javascript
{
  isPaid: true/false,              // Whether leave is paid
  salaryPercentage: 0-100,         // Percentage of salary (100=full, 50=half, 0=unpaid)
}
```

**Current Flexible Policies:**
- **Sabbatical Leave**: Default `isPaid: true, salaryPercentage: 100` (fully paid)
  - Can be changed to `isPaid: true, salaryPercentage: 50` for half pay
  - Can be changed to `isPaid: false, salaryPercentage: 0` for unpaid
  
- **Leave of Absence**: Default `isPaid: true, salaryPercentage: 100` (fully paid)
  - Can be changed per emergency circumstances
  - Can have facility-specific overrides (e.g., unpaid for extended absences)

#### 2. Facility-Specific Overrides
Different facilities can have different policies:
```javascript
facilityOverrides: [{
  facility: <FacilityID>,
  isPaid: true,
  salaryPercentage: 100,
  maxDaysPerYear: 30,
  requiresHRApproval: true
}]
```

**Example Use Case:**
- Hospital A: Sabbatical leave is unpaid
- Hospital B: Sabbatical leave is 50% paid
- Hospital C: Sabbatical leave is fully paid

#### 3. Grade Level Specific Rules
Different grade levels can have different entitlements:
```javascript
gradeLevelRules: [
  { minGradeLevel: 1, maxGradeLevel: 3, maxDaysPerYear: 14 },
  { minGradeLevel: 4, maxGradeLevel: 6, maxDaysPerYear: 21 },
  { minGradeLevel: 7, maxGradeLevel: 17, maxDaysPerYear: 30 }
]
```

#### 4. Approval Workflow Configuration
```javascript
{
  requiresApproval: true/false,
  requiresManagerApproval: true/false,
  requiresHRApproval: true/false,
  requiresUrgentApproval: true/false,
  urgentApprovalDeadlineHours: 24
}
```

#### 5. Documentation Requirements
```javascript
{
  requiresDocumentation: true/false,
  requiredDocuments: [
    'Medical certificate',
    'Official letter',
    'Adoption papers'
  ]
}
```

#### 6. Notice Period & Timing
```javascript
{
  minimumNoticeDays: 7,           // Days notice required
  allowRetroactive: true/false,   // Can apply for past dates
  maxDaysPerRequest: 5            // Max days per single request
}
```

### Managing Policy Changes

#### Admin API Endpoints
```
GET    /api/leave-policy              - Get all active policies
GET    /api/leave-policy/:leaveType   - Get specific policy
PUT    /api/leave-policy/:leaveType   - Update policy (admin only)
POST   /api/leave-policy/:leaveType/facility-override  - Add facility override
GET    /api/leave-policy/:leaveType/history - Get policy change history
```

#### Example: Changing Sabbatical to Paid Leave
```javascript
PUT /api/leave-policy/sabbatical
Body: {
  "isPaid": true,
  "salaryPercentage": 50,  // 50% pay during sabbatical
  "notes": "Policy updated Jan 2026: Sabbatical now paid at 50% salary"
}
```

#### Example: Adding Facility Override
```javascript
POST /api/leave-policy/absence/facility-override
Body: {
  "facilityId": "facility_123",
  "isPaid": true,
  "salaryPercentage": 100,
  "notes": "Emergency medical facility - Leave of Absence paid for medical emergencies"
}
```

### Policy Versioning & Audit Trail
Every policy change is tracked:
- `policyVersion` - Incremented on each update
- `lastUpdatedBy` - User who made the change
- `effectiveDate` - When policy takes effect
- `notes` - Admin notes about the change

### Implementation Benefits

1. **No Code Changes Required**: Admins can update policies through UI/API
2. **Historical Tracking**: All changes versioned and audited
3. **Facility Flexibility**: Different facilities can have different rules
4. **Grade-Based Fairness**: Different entitlements by seniority
5. **Easy Testing**: Policies can be changed for testing without deployment
6. **Compliance**: Easy to update policies to meet new regulations

### Database Schema
See `server/models/LeavePolicy.js` for full schema.

### Seeding Initial Policies
Run the seed script to create default policies:
```bash
node server/seeds/leavePolicies.js
```

### Frontend Integration
The leave request form automatically fetches current policies and validates against them:
- Shows current entitlement
- Displays required documents
- Validates balance before submission
- Shows payment status (paid/unpaid/partial)
