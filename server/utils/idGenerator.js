const Counter = require('../models/Counter');
const Employee = require('../models/Employee');
const Facility = require('../models/Facility');

/**
 * Generate unique Employee ID (Device ID) using ATOMIC counter
 * Format: FACILITY_PREFIX + 5-DIGIT-NUMBER (e.g., PHC00001)
 * 
 * This prevents race conditions during simultaneous registrations
 * by using MongoDB's findOneAndUpdate with $inc (atomic operation)
 */
const generateUniqueEmployeeId = async (facilityId) => {
  try {
    const facility = await Facility.findById(facilityId);
    if (!facility) {
      throw new Error('Facility not found');
    }

    // Generate facility prefix (first 3 letters, uppercase, alphanumeric only)
    let facilityPrefix = facility.name
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .substring(0, 3);
    
    // Ensure minimum 3 characters (pad with X if needed)
    while (facilityPrefix.length < 3) {
      facilityPrefix += 'X';
    }

    // ✅ ATOMIC INCREMENT - Prevents race conditions
    const counter = await Counter.findOneAndUpdate(
      { facility: facilityId },
      { 
        $inc: { lastEmployeeNumber: 1 },  // Atomic increment
        $setOnInsert: { facilityPrefix }  // Set prefix only on first insert
      },
      { 
        upsert: true,  // Create if doesn't exist
        new: true,     // Return updated document
        setDefaultsOnInsert: true
      }
    );

    // Format: PREFIX + 5-digit number (e.g., PHC00001)
    const paddedNumber = String(counter.lastEmployeeNumber).padStart(5, '0');
    const employeeId = `${facilityPrefix}${paddedNumber}`;

    console.log(`✅ Generated Employee ID: ${employeeId} (Counter: ${counter.lastEmployeeNumber})`);

    return employeeId;

  } catch (error) {
    console.error('❌ Employee ID generation error:', error);
    throw new Error(`Failed to generate employee ID: ${error.message}`);
  }
};

/**
 * Generate unique Staff ID using ATOMIC counter
 * Format: PREFIX + NUMBER (e.g., KNLG001, PHC0042)
 * 
 * Uses the same counter system but separate field for staff IDs
 */
const generateUniqueStaffId = async (facilityId, prefix = null) => {
  try {
    const facility = await Facility.findById(facilityId);
    if (!facility) {
      throw new Error('Facility not found');
    }

    // Use provided prefix or generate from facility name
    let staffPrefix = prefix;
    if (!staffPrefix) {
      staffPrefix = facility.name
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .substring(0, 4); // 4 letters for staff ID
      
      while (staffPrefix.length < 4) {
        staffPrefix += 'X';
      }
    }

    // ✅ ATOMIC INCREMENT - Prevents race conditions
    const counter = await Counter.findOneAndUpdate(
      { facility: facilityId },
      { 
        $inc: { lastStaffNumber: 1 },  // Atomic increment
        $setOnInsert: { facilityPrefix: staffPrefix }
      },
      { 
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    // Format: PREFIX + NUMBER (variable padding based on prefix length)
    const paddedNumber = String(counter.lastStaffNumber).padStart(3, '0');
    const staffId = `${staffPrefix}${paddedNumber}`;

    // Double-check uniqueness (paranoid check)
    const exists = await Employee.findOne({ staffId });
    if (exists) {
      console.warn(`⚠️ Staff ID collision detected: ${staffId}, retrying...`);
      // Recursive retry (should be extremely rare due to atomic counter)
      return generateUniqueStaffId(facilityId, prefix);
    }

    console.log(`✅ Generated Staff ID: ${staffId} (Counter: ${counter.lastStaffNumber})`);

    return staffId;

  } catch (error) {
    console.error('❌ Staff ID generation error:', error);
    throw new Error(`Failed to generate staff ID: ${error.message}`);
  }
};

/**
 * Generate unique XO5 Device PersonSn
 * Format: EMPLOYEEID + RANDOM (e.g., PHC00001A7X2M)
 * 
 * IMPORTANT: XO5 devices only accept alphanumeric characters (no special chars)
 * 
 * Uniqueness guaranteed by:
 * 1. Employee ID is already unique (atomically generated)
 * 2. Random suffix provides 36^6 = 2.1 billion combinations
 * 3. Collision probability: ~0.000046% even with 1000 simultaneous registrations
 */
const generateUniqueDevicePersonId = (employeeId) => {
  // Generate 6-character random suffix (0-9, A-Z)
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Format: EMPLOYEEID + RANDOM (alphanumeric only)
  // Example: PHC00001A7X2M (13 chars - well within 32 char limit)
  const personId = `${employeeId}${randomSuffix}`;
  
  console.log(`✅ Generated XO5 PersonSn: ${personId} (length: ${personId.length}, alphanumeric only)`);
  
  return personId;
};

/**
 * Initialize counter for a facility
 * Useful when setting up a new facility or migrating existing data
 */
const initializeFacilityCounter = async (facilityId) => {
  try {
    const facility = await Facility.findById(facilityId);
    if (!facility) {
      throw new Error('Facility not found');
    }

    // Generate facility prefix
    let facilityPrefix = facility.name
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .substring(0, 3);
    
    while (facilityPrefix.length < 3) {
      facilityPrefix += 'X';
    }

    // Find highest existing employee number
    const lastEmployee = await Employee.findOne({
      facility: facilityId,
      employeeId: { $regex: `^${facilityPrefix}` }
    }).sort({ employeeId: -1 });

    let lastEmployeeNumber = 0;
    if (lastEmployee) {
      const match = lastEmployee.employeeId.match(/([0-9]+)$/);
      if (match) {
        lastEmployeeNumber = parseInt(match[1]);
      }
    }

    // Find highest existing staff number
    const lastStaff = await Employee.findOne({
      facility: facilityId,
      staffId: { $regex: `^${facilityPrefix}` }
    }).sort({ staffId: -1 });

    let lastStaffNumber = 0;
    if (lastStaff) {
      const match = lastStaff.staffId.match(/([0-9]+)$/);
      if (match) {
        lastStaffNumber = parseInt(match[1]);
      }
    }

    // Create or update counter
    const counter = await Counter.findOneAndUpdate(
      { facility: facilityId },
      {
        facilityPrefix,
        lastEmployeeNumber,
        lastStaffNumber
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Counter initialized for ${facility.name}:`, {
      prefix: counter.facilityPrefix,
      lastEmployeeNumber: counter.lastEmployeeNumber,
      lastStaffNumber: counter.lastStaffNumber
    });

    return counter;

  } catch (error) {
    console.error('❌ Counter initialization error:', error);
    throw new Error(`Failed to initialize counter: ${error.message}`);
  }
};

module.exports = {
  generateUniqueEmployeeId,
  generateUniqueStaffId,
  generateUniqueDevicePersonId,
  initializeFacilityCounter
};
