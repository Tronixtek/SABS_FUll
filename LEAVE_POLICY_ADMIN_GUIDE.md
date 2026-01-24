# Leave Policy Management Guide

## Overview
This system uses a flexible, database-driven approach to manage leave policies. Administrators can update leave rules, payment policies, and approval requirements without modifying code.

## Why Flexible Policies?

Organizational policies change over time due to:
- New government regulations
- Budget constraints
- Facility-specific needs
- Union agreements
- Economic conditions
- Health emergencies

Rather than requiring developer intervention for every policy change, this system allows authorized administrators to update policies directly.

---

## Common Policy Updates

### 1. Changing Sabbatical Leave from Paid to Unpaid/Partial

**Current Default Policy:**
- Sabbatical leave is **PAID at 100%** (full salary)

**To Change to Unpaid:**
```http
PUT /api/leave-policy/sabbatical
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "isPaid": false,
  "salaryPercentage": 0,
  "notes": "Policy updated Jan 2026: Sabbatical changed to unpaid due to budget constraints"
}
```

**To Change to Half Pay:**
```json
{
  "isPaid": true,
  "salaryPercentage": 50,
  "notes": "Policy updated: Sabbatical now paid at 50% salary"
}
```

### 2. Changing Leave of Absence Based on Circumstances

**Current Default Policy:**
- Leave of Absence is **PAID at 100%** (full salary)

**Option A: Make it unpaid for all cases**
```json
PUT /api/leave-policy/absence
{
  "isPaid": false,
  "salaryPercentage": 0,
  "notes": "Extended leave of absence now unpaid due to policy change"
}
```

**Option B: Keep paid but add facility override to make unpaid at specific facility**
```json
POST /api/leave-policy/absence/facility-override
{
  "facilityId": "60f7b3b3e6b3a72f4c8b4567",
  "isPaid": false,
  "salaryPercentage": 0,
  "notes": "This facility requires unpaid leave of absence"
}
```

### 3. Adjusting Annual Leave Days

**Increase annual leave for all GL 7+ employees:**
```json
PUT /api/leave-policy/annual
{
  "gradeLevelRules": [
    { "minGradeLevel": 1, "maxGradeLevel": 3, "maxDaysPerYear": 14 },
    { "minGradeLevel": 4, "maxGradeLevel": 6, "maxDaysPerYear": 21 },
    { "minGradeLevel": 7, "maxGradeLevel": 17, "maxDaysPerYear": 35 }
  ],
  "notes": "Increased senior staff annual leave from 30 to 35 days"
}
```

### 4. Adding Documentation Requirements

**Require medical certificate for examination leave:**
```json
PUT /api/leave-policy/examination
{
  "requiresDocumentation": true,
  "requiredDocuments": [
    "Medical appointment card",
    "Hospital referral letter",
    "Test result (if retroactive)"
  ],
  "notes": "Documentation now required to prevent abuse"
}
```

### 5. Changing Approval Requirements

**Require HR approval for study leave over 5 days:**
```json
PUT /api/leave-policy/study
{
  "requiresHRApproval": true,
  "maxDaysPerRequest": 5,
  "notes": "Study leave over 5 days requires HR approval"
}
```

### 6. Adjusting Notice Period

**Increase notice period for annual leave during busy season:**
```json
PUT /api/leave-policy/annual
{
  "minimumNoticeDays": 14,
  "notes": "Increased to 14 days notice during Q4 busy period"
}
```

---

## Policy Configuration Options

### Financial Settings
```javascript
{
  isPaid: true,              // Whether leave is paid
  salaryPercentage: 100      // 0-100% of salary
}
```
- `isPaid: false` = Completely unpaid, salary deducted
- `isPaid: true, salaryPercentage: 100` = Fully paid
- `isPaid: true, salaryPercentage: 50` = Half pay

### Balance Management
```javascript
{
  hasBalanceLimit: true,     // Whether there's a maximum
  maxDaysPerYear: 30,        // Annual limit (0 = unlimited)
  maxDaysLifetime: 84,       // Lifetime limit (for maternity, etc)
  balanceResetAnnually: true // Reset on Jan 1st
}
```

### Approval Workflow
```javascript
{
  requiresApproval: true,
  requiresManagerApproval: true,
  requiresHRApproval: false,
  requiresUrgentApproval: false,
  urgentApprovalDeadlineHours: 24
}
```

### Documentation
```javascript
{
  requiresDocumentation: true,
  requiredDocuments: [
    "Medical certificate",
    "Official letter"
  ]
}
```

### Timing Rules
```javascript
{
  minimumNoticeDays: 7,
  allowRetroactive: false,
  maxDaysPerRequest: 5
}
```

---

## Facility-Specific Policies

Different facilities can have different rules for the same leave type.

### Example: Rural vs Urban Facilities

**Urban Teaching Hospital** - Generous leave policy:
```json
POST /api/leave-policy/annual/facility-override
{
  "facilityId": "urban_hospital_id",
  "maxDaysPerYear": 35,
  "salaryPercentage": 100,
  "notes": "Urban facilities get additional 5 days annual leave"
}
```

**Rural Health Center** - Standard policy:
```json
POST /api/leave-policy/annual/facility-override
{
  "facilityId": "rural_center_id",
  "maxDaysPerYear": 30,
  "requiresHRApproval": true,
  "notes": "Rural facilities maintain standard leave, require HR approval"
}
```

---

## Grade Level Specific Rules

### Example: Senior Staff Additional Leave

```json
PUT /api/leave-policy/annual
{
  "gradeLevelRules": [
    { 
      "minGradeLevel": 1, 
      "maxGradeLevel": 3, 
      "maxDaysPerYear": 14,
      "salaryPercentage": 100
    },
    { 
      "minGradeLevel": 4, 
      "maxGradeLevel": 6, 
      "maxDaysPerYear": 21,
      "salaryPercentage": 100
    },
    { 
      "minGradeLevel": 7, 
      "maxGradeLevel": 12, 
      "maxDaysPerYear": 30,
      "salaryPercentage": 100
    },
    { 
      "minGradeLevel": 13, 
      "maxGradeLevel": 17, 
      "maxDaysPerYear": 40,
      "salaryPercentage": 100
    }
  ],
  "notes": "Directors and above (GL 13-17) now get 40 days annual leave"
}
```

---

## Policy Version Control

Every policy update creates a new version:
- Old version number incremented
- Change tracked with timestamp
- User who made change recorded
- Notes field for explaining why

### View Policy History
```http
GET /api/leave-policy/sabbatical/history
```

**Response:**
```json
{
  "leaveType": "sabbatical",
  "currentVersion": 3,
  "effectiveDate": "2026-01-24T00:00:00.000Z",
  "lastUpdatedBy": {
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@facility.gov"
  },
  "lastUpdatedAt": "2026-01-24T10:30:00.000Z",
  "notes": "Changed from unpaid to 50% paid per board decision"
}
```

---

## Best Practices

### 1. Always Add Notes
Document WHY you're making a change:
```json
{
  "salaryPercentage": 50,
  "notes": "Board resolution #2026-01: Budget constraints require sabbatical reduction to 50% pay"
}
```

### 2. Test Before Rollout
Update policy in test environment first, verify calculations work correctly.

### 3. Communicate Changes
Before changing policies, notify:
- HR department
- Facility managers  
- Affected employees

### 4. Schedule Effective Dates
For future policy changes, note the effective date:
```json
{
  "effectiveDate": "2026-04-01T00:00:00.000Z",
  "notes": "Q2 2026: New fiscal year policy takes effect April 1"
}
```

### 5. Backup Before Changes
Export current policies before major updates.

---

## Emergency Policy Updates

### Scenario: COVID-19 Pandemic
During health emergencies, you might need to quickly update policies:

**Provide paid leave for quarantine:**
```json
POST /api/leave-policy/absence/facility-override
{
  "facilityId": "all_facilities",
  "isPaid": true,
  "salaryPercentage": 100,
  "allowRetroactive": true,
  "notes": "COVID-19 Emergency: Quarantine leave now fully paid"
}
```

### Scenario: Budget Cuts
If budget constraints require reducing paid leave:

**Reduce sabbatical from full pay to half pay:**
```json
PUT /api/leave-policy/sabbatical
{
  "isPaid": true,
  "salaryPercentage": 50,
  "notes": "Budget Year 2026: Economic constraints require sabbatical reduction to 50%"
}
```

**Make leave of absence unpaid:**
```json
PUT /api/leave-policy/absence
{
  "isPaid": false,
  "salaryPercentage": 0,
  "notes": "Budget Year 2026: Extended absences now unpaid"
}
```

---

## Querying Policies

### Get All Active Policies
```http
GET /api/leave-policy
```

### Get Specific Policy
```http
GET /api/leave-policy/annual
```

### Get Policy for Specific Employee
```http
GET /api/leave-policy/annual?gradeLevel=8&facilityId=60f7b3b3e6b3a72f4c8b4567
```

### Calculate Employee Entitlement
```http
GET /api/leave-policy/calculate-entitlement?leaveType=annual&gradeLevel=8&facilityId=xyz
```

**Response:**
```json
{
  "leaveType": "annual",
  "displayName": "Annual Leave",
  "isPaid": true,
  "salaryPercentage": 100,
  "maxDaysPerYear": 30,
  "requiresApproval": true,
  "minimumNoticeDays": 3,
  "requiresDocumentation": false
}
```

---

## Admin UI (Future Development)

Planned admin interface for managing policies without API calls:

### Policy Dashboard
- View all leave types
- See current paid/unpaid status
- Quick toggle paid/unpaid
- Visual balance limits

### Policy Editor
- Form-based editing
- Validation of values
- Preview changes before saving
- Bulk update multiple policies

### Facility Manager
- Assign facility-specific overrides
- Manage facility groups
- Compare policies across facilities

### Audit Log
- View all policy changes
- Filter by date/user/leave type
- Export change history
- Rollback to previous version

---

## Support

For questions about policy management:
- **Technical Issues**: Contact IT Support
- **Policy Questions**: Contact HR Department  
- **Budget Implications**: Contact Finance Department
- **Legal Compliance**: Contact Legal Department
