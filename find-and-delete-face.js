/**
 * Find and Delete Face from XO5 Device
 * 
 * This script helps you:
 * 1. List all persons on the device
 * 2. Search for a specific person
 * 3. Delete a person/face from the device
 */

const axios = require('axios');
const readline = require('readline');

// Configuration
const JAVA_SERVICE_URL = process.env.JAVA_SERVICE_URL || 'http://localhost:8081';
const DEVICE_KEY = process.env.DEVICE_KEY || '020e7096a03f178165'; // Your device key
const DEVICE_SECRET = process.env.DEVICE_SECRET || '123456'; // Your device secret

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function listAllPersons() {
  try {
    console.log('\n🔍 Fetching all persons from device...\n');
    
    const response = await axios.post(`${JAVA_SERVICE_URL}/api/employee/list`, {
      deviceKey: DEVICE_KEY,
      secret: DEVICE_SECRET
    });

    if (response.data.code === '000' && response.data.data) {
      const persons = response.data.data;
      console.log(`📊 Found ${persons.length} persons on device:\n`);
      
      persons.forEach((person, index) => {
        console.log(`${index + 1}. Person ID: ${person.personSn || person.employeeId}`);
        console.log(`   Name: ${person.name || 'N/A'}`);
        console.log(`   Department: ${person.department || 'N/A'}`);
        console.log(`   Has Face: ${person.hasFace ? 'Yes' : 'No'}`);
        console.log('');
      });
      
      return persons;
    } else {
      console.log('❌ Failed to fetch persons:', response.data.msg || 'Unknown error');
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching persons:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('⚠️ Java service is not running. Start it first.');
    }
    return [];
  }
}

async function getPersonInfo(personId) {
  try {
    console.log(`\n🔍 Getting info for person: ${personId}\n`);
    
    const response = await axios.post(`${JAVA_SERVICE_URL}/api/employee/get-person`, {
      employeeId: personId,
      deviceKey: DEVICE_KEY,
      secret: DEVICE_SECRET
    });

    if (response.data.code === '000') {
      const person = response.data.data;
      console.log('📋 Person Details:');
      console.log(`   Person ID: ${person.personSn || person.employeeId}`);
      console.log(`   Name: ${person.name || 'N/A'}`);
      console.log(`   Department: ${person.department || 'N/A'}`);
      console.log(`   Email: ${person.email || 'N/A'}`);
      console.log('');
      return person;
    } else {
      console.log('❌ Person not found:', response.data.msg);
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function deletePerson(personId) {
  try {
    console.log(`\n🗑️ Deleting person: ${personId}\n`);
    
    const response = await axios.post(`${JAVA_SERVICE_URL}/api/employee/delete-person`, {
      employeeId: personId,
      deviceKey: DEVICE_KEY,
      secret: DEVICE_SECRET
    });

    if (response.data.code === '000') {
      console.log('✅ Person deleted successfully from device!');
      return true;
    } else {
      console.log('❌ Delete failed:', response.data.msg);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('   XO5 Device - Find & Delete Face');
  console.log('========================================');
  console.log(`Device Key: ${DEVICE_KEY}`);
  console.log(`Java Service: ${JAVA_SERVICE_URL}`);
  console.log('========================================\n');

  rl.question('Choose action:\n1. List all persons\n2. Search & delete specific person\n3. Exit\n\nEnter choice (1-3): ', async (choice) => {
    if (choice === '1') {
      const persons = await listAllPersons();
      
      if (persons.length > 0) {
        rl.question('\nEnter Person ID to delete (or press Enter to cancel): ', async (personId) => {
          if (personId.trim()) {
            rl.question(`\n⚠️ Delete person "${personId}"? (yes/no): `, async (confirm) => {
              if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
                await deletePerson(personId.trim());
              } else {
                console.log('❌ Delete cancelled');
              }
              rl.close();
            });
          } else {
            console.log('❌ Cancelled');
            rl.close();
          }
        });
      } else {
        rl.close();
      }
    } else if (choice === '2') {
      rl.question('Enter Person ID to search: ', async (personId) => {
        if (personId.trim()) {
          const person = await getPersonInfo(personId.trim());
          
          if (person) {
            rl.question(`\n⚠️ Delete this person? (yes/no): `, async (confirm) => {
              if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
                await deletePerson(personId.trim());
              } else {
                console.log('❌ Delete cancelled');
              }
              rl.close();
            });
          } else {
            rl.close();
          }
        } else {
          console.log('❌ No Person ID provided');
          rl.close();
        }
      });
    } else {
      console.log('👋 Goodbye!');
      rl.close();
    }
  });
}

main();
