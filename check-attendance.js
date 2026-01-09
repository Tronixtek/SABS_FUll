const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/sabs_attendance').then(async () => {
  const Attendance = require('./server/models/Attendance');
  const Shift = require('./server/models/Shift');
  
  // Check shift grace time
  const shift = await Shift.findOne({ name: 'Morning shift' });
  console.log('\n=== SHIFT DETAILS ===');
  console.log('Name:', shift?.name);
  console.log('Start Time:', shift?.startTime);
  console.log('Grace Time:', shift?.graceTime);
  
  // Check today's attendance
  const att = await Attendance.find({})
    .populate('employee', 'firstName lastName employeeId')
    .populate('shift', 'name startTime')
    .sort({ timestamp: -1 })
    .limit(10);
  
  console.log('\n=== LATEST 10 ATTENDANCE RECORDS ===');
  att.forEach(a => {
    console.log(`${a.employee?.employeeId || 'NO ID'} | ${a.type} | Status: ${a.status} | Late: ${a.lateArrival || 0} min | Shift Start: ${a.shift?.startTime} | Check-in: ${a.timestamp?.toLocaleTimeString()}`);
  });
  
  mongoose.connection.close();
});
