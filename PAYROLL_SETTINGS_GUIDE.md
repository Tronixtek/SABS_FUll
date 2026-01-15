# Payroll Settings Configuration Guide

## Where to Set Payroll Rates

You can now configure all payroll calculation rates through the **Settings** page in the admin dashboard.

### Access Path
1. Login as Admin
2. Navigate to: **Settings** (in main navigation)
3. Click on the **Payroll** tab

### Configurable Settings

#### 1. Working Schedule
- **Working Days Per Month**: Default 22 days
- **Hours Per Day**: Default 8 hours

These determine the monthly work hours: `22 days × 8 hours = 176 hours/month`

#### 2. Earnings & Rates
- **Overtime Rate Multiplier**: Default 1.5×
  - Example: If hourly rate is ₦568, overtime = ₦568 × 1.5 = ₦852/hour
  
- **Currency**: NGN (₦), USD ($), EUR (€), GBP (£)

#### 3. Deduction Rates
- **Tax Rate**: Default 10%
- **Pension Rate**: Default 8%
- **Insurance Rate**: Default 0%

#### 4. Insurance Configuration
- **Insurance Type**: None, Health, Life, or Both

#### 5. Company Information
- **Company Name**: Appears on payslips

### How Calculations Work

For an employee with ₦100,000 monthly salary:

**Hourly Rate Calculation:**
```
Hourly Rate = Monthly Salary ÷ (Working Days × Hours Per Day)
            = ₦100,000 ÷ (22 × 8)
            = ₦568.18/hour
```

**Overtime Calculation:**
```
Overtime Rate = Hourly Rate × Overtime Multiplier
              = ₦568.18 × 1.5
              = ₦852.27/hour

Overtime Pay = Overtime Hours × Overtime Rate
             = 10 hours × ₦852.27
             = ₦8,522.70
```

**Deductions:**
```
Tax         = Gross Pay × 10% = ₦10,000
Pension     = Gross Pay × 8%  = ₦8,000
Insurance   = Gross Pay × 0%  = ₦0
Total Deductions = ₦18,000
```

**Net Pay:**
```
Net Pay = Gross Pay - Total Deductions
        = ₦100,000 - ₦18,000
        = ₦82,000
```

### Example Scenarios

#### Scenario 1: Increase Overtime Rate
If you change overtime multiplier from 1.5× to 2.0×:
- Before: 10 OT hours = ₦8,522.70
- After: 10 OT hours = ₦11,363.60

#### Scenario 2: Adjust Tax Rate
If you change tax from 10% to 7.5%:
- Before: Tax on ₦100k = ₦10,000
- After: Tax on ₦100k = ₦7,500
- Net increase: ₦2,500 per employee

#### Scenario 3: Enable Insurance
If you set insurance at 2%:
- Additional deduction: ₦2,000 per ₦100k salary
- Net pay reduces from ₦82,000 to ₦80,000

### Important Notes

⚠️ **Impact of Changes:**
- Settings affect **future** payroll calculations only
- Existing payroll records are **NOT** automatically recalculated
- To apply new rates to existing periods, regenerate payroll

✅ **Best Practices:**
1. Set rates before generating monthly payroll
2. Review calculation preview before saving
3. Communicate changes to employees
4. Keep records of rate changes (system tracks updatedAt)

### API Endpoints

For programmatic access:

**Get Current Settings:**
```http
GET /api/payroll-settings
Authorization: Bearer <admin_token>
```

**Update Settings:**
```http
PUT /api/payroll-settings
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "overtimeRate": 1.5,
  "taxRate": 0.10,
  "pensionRate": 0.08,
  "workingDaysPerMonth": 22,
  "hoursPerDay": 8
}
```

### Testing Your Changes

1. **Save Settings**: Click "Save Changes" button
2. **Generate Test Payroll**: Go to Payroll Management
3. **Select Employee**: Choose test employee
4. **Generate**: Create payroll for current month
5. **Verify**: Check calculations use new rates

### Default Values

When first installed, the system uses these defaults:
- Overtime Rate: 1.5×
- Tax Rate: 10%
- Pension Rate: 8%
- Insurance Rate: 0%
- Working Days: 22 days/month
- Hours Per Day: 8 hours
- Currency: NGN (₦)

These are stored in the database and can be modified anytime through the Settings page.
