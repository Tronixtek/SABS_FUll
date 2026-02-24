const path = require('path');
const fs = require('fs');

// Try to load .env from server directory if it exists
const envPath = path.join(__dirname, 'server', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  employeeId: String,
  payPeriod: {
    startDate: Date,
    endDate: Date,
    month: Number,
    year: Number
  },
  basicSalary: Number,
  earnings: {
    basicPay: Number,
    allowances: Number,
    overtime: Number,
    bonus: Number,
    total: Number
  },
  deductions: {
    tax: Number,
    pension: Number,
    loan: Number,
    advance: Number,
    other: Number,
    total: Number
  },
  netSalary: Number,
  status: String,
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  generatedAt: Date
}, { collection: 'payrolls' });

const Payroll = mongoose.model('Payroll', payrollSchema);

async function clearPayroll() {
  try {
    // Use environment variable or default to localhost
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-tracking';
    
    console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');
    
    // Get the database name from the connection
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📊 Database: ${dbName}\n`);

    // Count current records
    const totalRecords = await Payroll.countDocuments({});
    console.log(`📊 Current payroll records: ${totalRecords}`);
    
    if (totalRecords === 0) {
      console.log('✅ No payroll records to clear');
      await mongoose.connection.close();
      return;
    }

    // Get breakdown by status
    const statuses = await Payroll.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\n📋 Breakdown by status:');
    statuses.forEach(s => {
      console.log(`  ${s._id || 'undefined'}: ${s.count} records`);
    });

    // Confirm deletion
    console.log('\n⚠️  WARNING: This will delete all payroll records!');
    console.log('Press Ctrl+C to cancel, or wait 3 seconds to proceed...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete all records
    console.log('🗑️  Deleting all payroll records...');
    const result = await Payroll.deleteMany({});
    
    console.log(`\n✅ Successfully deleted ${result.deletedCount} payroll records`);
    
    // Verify deletion
    const remainingRecords = await Payroll.countDocuments({});
    console.log(`📊 Remaining payroll records: ${remainingRecords}`);
    
    if (remainingRecords === 0) {
      console.log('✅ All payroll records cleared successfully!');
    } else {
      console.log('⚠️  Warning: Some records may not have been deleted');
    }

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearPayroll();
