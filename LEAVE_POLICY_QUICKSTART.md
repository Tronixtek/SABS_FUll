# Leave Policy System - Quick Start Guide

## 🚀 Implementation Steps

### Step 1: Seed Leave Policies Database

Run this command to initialize all leave policies with default settings:

```bash
cd server
node seed-leave-policies.js
```

**Expected Output:**
```
🌱 Starting leave policies seeding...
📡 Connecting to MongoDB...
✅ MongoDB Connected
Seeding leave policies...
✓ Created policy for annual
✓ Created policy for maternity
✓ Created policy for adoptive
✓ Created policy for takaba
✓ Created policy for sabbatical
✓ Created policy for examination
✓ Created policy for study
✓ Created policy for religious
✓ Created policy for casual
✓ Created policy for absence
✓ Created policy for official-assignment
Leave policies seeding completed!

✅ Seeding completed successfully!
📋 All leave policies have been initialized with default settings.
💡 All leaves are configured as PAID by default.
🔧 You can update individual policies via the API or admin interface.
```

### Step 2: Verify Policies Were Created

Test the API endpoint:

```bash
curl http://localhost:5000/api/leave-policy
```

You should see all 11 leave policies returned.

### Step 3: Test Policy Retrieval for Specific Leave Type

```bash
curl http://localhost:5000/api/leave-policy/annual
```

### Step 4: Calculate Entitlement for Employee

```bash
curl "http://localhost:5000/api/leave-policy/calculate-entitlement?leaveType=annual&gradeLevel=8"
```

---

## 📋 Default Policy Settings

All leaves are **PAID BY DEFAULT (100% salary)**:

| Leave Type | Paid | Salary % | Max Days/Year | Balance Reset |
|------------|------|----------|---------------|---------------|
| Annual | ✅ | 100% | 14/21/30 (GL-based) | Annually |
| Maternity | ✅ | 100% | 84 | No |
| Adoptive | ✅ | 100% | 112 | No |
| Takaba | ✅ | 100% | 112 | No |
| Sabbatical | ✅ | 100% | 365 | No |
| Examination | ✅ | 100% | Unlimited | Annually |
| Study | ✅ | 100% | Unlimited | Annually |
| Religious | ✅ | 100% | Unlimited | Annually |
| Casual | ✅ | 100% | Unlimited | Annually |
| Leave of Absence | ✅ | 100% | Unlimited | Annually |
| Official Assignment | ✅ | 100% | Unlimited | Annually |

---

## 🔧 Updating Policies

### Example 1: Change Sabbatical to 50% Paid

```bash
curl -X PUT http://localhost:5000/api/leave-policy/sabbatical \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "isPaid": true,
    "salaryPercentage": 50,
    "notes": "Budget constraints: Sabbatical reduced to 50% pay"
  }'
```

### Example 2: Make Leave of Absence Unpaid

```bash
curl -X PUT http://localhost:5000/api/leave-policy/absence \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "isPaid": false,
    "salaryPercentage": 0,
    "notes": "Extended absences now unpaid per policy update"
  }'
```

### Example 3: Add Facility-Specific Override

```bash
curl -X POST http://localhost:5000/api/leave-policy/annual/facility-override \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "facilityId": "YOUR_FACILITY_ID",
    "maxDaysPerYear": 35,
    "notes": "Teaching hospital gets extra 5 days annual leave"
  }'
```

---

## ✅ Verification Checklist

After seeding, verify:

- [ ] All 11 leave policies created in database
- [ ] All policies show `isPaid: true, salaryPercentage: 100`
- [ ] Grade level rules configured for annual leave (14/21/30 days)
- [ ] API routes accessible:
  - `GET /api/leave-policy` returns all policies
  - `GET /api/leave-policy/:type` returns specific policy
  - `PUT /api/leave-policy/:type` updates policy (admin only)
- [ ] Leave request submission validates against policies
- [ ] Leave balance enforcement working

---

## 🎯 Integration with Leave Requests

The leave request submission now:

1. **Fetches active policy** for the requested leave type
2. **Validates employee grade level** and facility
3. **Checks balance limits** (if applicable)
4. **Enforces notice period** requirements
5. **Validates documentation** requirements
6. **Returns policy info** to employee (paid status, required docs, etc.)

### Updated Leave Request Response

When employee submits leave:

```json
{
  "success": true,
  "message": "Leave request submitted successfully",
  "data": {
    "leaveRequest": { ... },
    "policyInfo": {
      "isPaid": true,
      "salaryPercentage": 100,
      "requiresDocumentation": false,
      "requiredDocuments": [],
      "requiresUrgentApproval": false
    }
  }
}
```

---

## 📚 Additional Resources

- **Full System Documentation**: [LEAVE_SYSTEM_CLEANUP_SUMMARY.md](LEAVE_SYSTEM_CLEANUP_SUMMARY.md)
- **Admin Management Guide**: [LEAVE_POLICY_ADMIN_GUIDE.md](LEAVE_POLICY_ADMIN_GUIDE.md)
- **Policy Model Schema**: `server/models/LeavePolicy.js`
- **Seed Script**: `server/seeds/leavePolicies.js`
- **API Controller**: `server/controllers/leavePolicyController.js`
- **API Routes**: `server/routes/leavePolicy.js`

---

## 🆘 Troubleshooting

### Policies already exist
If you run the seed script twice, it will skip existing policies:
```
✓ Policy already exists for annual, skipping...
```

### Need to reset policies
To reset all policies, delete them from MongoDB and re-run seed:
```javascript
// In MongoDB shell or Compass
db.leavepolicies.deleteMany({})
```

Then run: `node seed-leave-policies.js`

### Update specific policy
Use the API endpoints rather than re-seeding:
```bash
PUT /api/leave-policy/:leaveType
```

---

## 🎉 Next Steps

1. ✅ Run seed script
2. ✅ Test API endpoints
3. 🔄 Build admin UI for policy management (optional)
4. 🔄 Update employee portal to show policy info
5. 🔄 Add policy change notifications to HR dashboard
