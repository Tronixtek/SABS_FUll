// MongoDB Initialization Script
// This script runs when MongoDB container starts for the first time

// Create database
db = db.getSiblingDB('attendance_system');

// Create collections with proper indexes
db.createCollection('users');
db.createCollection('employees');
db.createCollection('attendance');
db.createCollection('facilities');
db.createCollection('shifts');
db.createCollection('devices');

// Create indexes for better performance
db.employees.createIndex({ "employeeId": 1 }, { unique: true });
db.employees.createIndex({ "email": 1 }, { unique: true });
db.employees.createIndex({ "facility": 1 });
db.employees.createIndex({ "status": 1 });

db.attendance.createIndex({ "employee": 1, "date": 1 });
db.attendance.createIndex({ "facility": 1, "date": 1 });
db.attendance.createIndex({ "date": 1 });
db.attendance.createIndex({ "timestamp": 1 });

db.facilities.createIndex({ "code": 1 }, { unique: true });
db.facilities.createIndex({ "status": 1 });

db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });

// Insert default admin user (password should be hashed in real application)
db.users.insertOne({
    email: "admin@sabs.com",
    password: "$2b$10$8Qd0Q9X8XqJ2Q9Q9Q9Q9QuJ2Q9Q9Q9Q9Q9Q9Q9Q9Q9Q9Q9Q9Q9Q9Q", // Change this!
    role: "super-admin",
    firstName: "System",
    lastName: "Administrator",
    createdAt: new Date(),
    updatedAt: new Date()
});

print("✅ Database initialized successfully");
print("🔐 Default admin user created: admin@sabs.com");
print("⚠️  Please change the default password after first login!");

// Create sample facility
db.facilities.insertOne({
    name: "Main Health Facility",
    code: "MAIN-001",
    address: "Kano State",
    contactPerson: "Facility Manager",
    contactEmail: "manager@facility.com",
    contactPhone: "+234-xxx-xxx-xxxx",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
});

print("🏥 Sample facility created");
print("📊 Database setup completed!");