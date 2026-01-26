const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('./server/models/Employee');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function listAllEmployees() {
  try {
    console.log('🔍 Fetching all employees from database...\n');
    
    const employees = await Employee.find({})
      .populate('facility', 'name')
      .populate('shift', 'name')
      .sort({ employeeId: 1 });
    
    console.log(`📊 Total employees in database: ${employees.length}\n`);
    console.log('=' .repeat(120));
    console.log(
      'NAME'.padEnd(25) + 
      'EMPLOYEE ID'.padEnd(15) + 
      'DEPARTMENT'.padEnd(35) + 
      'STATUS'.padEnd(10) + 
      'FACILITY'
    );
    console.log('='.repeat(120));
    
    employees.forEach(emp => {
      const name = `${emp.firstName} ${emp.lastName}`.padEnd(25);
      const empId = (emp.employeeId || 'N/A').padEnd(15);
      const dept = (emp.department || 'N/A').substring(0, 34).padEnd(35);
      const status = emp.status.padEnd(10);
      const facility = emp.facility?.name || 'Not assigned';
      
      console.log(`${name}${empId}${dept}${status}${facility}`);
    });
    
    console.log('='.repeat(120));
    
    // Check for duplicate employeeIds
    console.log('\n🔍 Checking for duplicate Employee IDs...\n');
    
    const employeeIdCounts = {};
    employees.forEach(emp => {
      if (emp.employeeId) {
        employeeIdCounts[emp.employeeId] = (employeeIdCounts[emp.employeeId] || 0) + 1;
      }
    });
    
    const duplicates = Object.entries(employeeIdCounts).filter(([id, count]) => count > 1);
    
    if (duplicates.length > 0) {
      console.log('⚠️  Found duplicate Employee IDs:');
      duplicates.forEach(([id, count]) => {
        console.log(`\n   Employee ID: ${id} (${count} employees)`);
        const dupes = employees.filter(e => e.employeeId === id);
        dupes.forEach(emp => {
          console.log(`      - ${emp.firstName} ${emp.lastName} (${emp.department}) - DB ID: ${emp._id}`);
        });
      });
    } else {
      console.log('✅ No duplicate Employee IDs found!');
    }
    
    // Group by status
    console.log('\n📊 Employee Status Summary:');
    const statusCounts = employees.reduce((acc, emp) => {
      acc[emp.status] = (acc[emp.status] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

listAllEmployees();
