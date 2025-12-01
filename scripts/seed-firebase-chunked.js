// scripts/seed-firebase-chunked.js
// Run this script to seed in smaller chunks
// Usage: node scripts/seed-firebase-chunked.js [clients] [workers]
// Example: node scripts/seed-firebase-chunked.js 10 5
// This will add 10 clients and 5 workers, then you can run it again

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT not found in .env.local');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
  if (serviceAccount && typeof serviceAccount.private_key === 'string') {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
} catch (err) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT is not valid JSON:', err.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Same data generators as before
const SAMPLE_LOCATIONS = [
  '123 Main St, Toronto, ON', '456 Oak Ave, Ottawa, ON', '789 Elm St, Hamilton, ON',
  '321 Maple Dr, London, ON', '654 Pine Rd, Mississauga, ON', '987 Cedar Ln, Brampton, ON',
  '111 Birch Way, Markham, ON', '222 Ash Ct, Windsor, ON', '333 Hickory Pl, Kitchener, ON',
  '444 Walnut St, Waterloo, ON', '555 Queen St, Burlington, ON', '666 King St, Oshawa, ON',
  '777 Yonge St, Barrie, ON', '888 Bay St, Thunder Bay, ON', '999 Front St, Sudbury, ON',
];

const SAMPLE_FIRST_NAMES_MALE = ['John', 'Michael', 'Robert', 'James', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Christopher'];
const SAMPLE_FIRST_NAMES_FEMALE = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy'];
const SAMPLE_LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const SPECIALTIES = ['elderly care', 'mobility assist', 'personal hygiene', 'medication management', 'companionship', 'meal preparation', 'light housekeeping', 'dementia care'];

function getRandomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function generateEmail(firstName, lastName, suffix) { return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}@example.com`; }

async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function getExistingCount(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.size;
}

async function addChunk(collectionName, items, startId) {
  const collectionRef = db.collection(collectionName);
  let successCount = 0;
  
  for (let i = 0; i < items.length; i++) {
    const docId = `${collectionName === 'clients' ? 'client' : 'psw'}_${startId + i + 1}`;
    try {
      // Check if document already exists
      const existing = await collectionRef.doc(docId).get();
      if (existing.exists) {
        console.log(`  ⏭ Skipping ${docId} (already exists)`);
        continue;
      }
      
      await collectionRef.doc(docId).set(items[i]);
      successCount++;
      console.log(`  ✓ Added ${docId}`);
      await sleep(500); // 500ms delay between each
    } catch (error) {
      if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED')) {
        console.error(`\n⚠️  Rate limit hit after ${successCount} documents. Wait 5 minutes and run again.`);
        console.log(`   Progress: ${successCount}/${items.length} added in this chunk.`);
        process.exit(1);
      }
      throw error;
    }
  }
  return successCount;
}

async function seedChunk(clientsCount = 10, workersCount = 5) {
  try {
    console.log(`🌱 Seeding chunk: ${clientsCount} clients, ${workersCount} workers\n`);

    // Check existing counts
    const existingClients = await getExistingCount('clients');
    const existingWorkers = await getExistingCount('psw_workers');
    console.log(`📊 Current database: ${existingClients} clients, ${existingWorkers} workers\n`);

    // Generate clients
    if (clientsCount > 0) {
      console.log(`👥 Generating ${clientsCount} clients...`);
      const clients = [];
      for (let i = 0; i < clientsCount; i++) {
        const isMale = Math.random() > 0.5;
        const firstName = isMale ? getRandomElement(SAMPLE_FIRST_NAMES_MALE) : getRandomElement(SAMPLE_FIRST_NAMES_FEMALE);
        const lastName = getRandomElement(SAMPLE_LAST_NAMES);
        clients.push({
          firstName, lastName,
          age: getRandomInt(18, 85),
          location: getRandomElement(SAMPLE_LOCATIONS),
          email: generateEmail(firstName, lastName, `.client.${existingClients + i + 1}`),
          phone: `+1${getRandomInt(2000000000, 9999999999)}`,
          createdAt: new Date().toISOString(),
          bookings: [],
        });
      }
      
      console.log(`Adding ${clientsCount} clients...`);
      const addedClients = await addChunk('clients', clients, existingClients);
      console.log(`✓ Added ${addedClients} clients\n`);
      await sleep(2000);
    }

    // Generate workers
    if (workersCount > 0) {
      console.log(`👷 Generating ${workersCount} workers...`);
      const workers = [];
      for (let i = 0; i < workersCount; i++) {
        const isMale = Math.random() > 0.5;
        const firstName = isMale ? getRandomElement(SAMPLE_FIRST_NAMES_MALE) : getRandomElement(SAMPLE_FIRST_NAMES_FEMALE);
        const lastName = getRandomElement(SAMPLE_LAST_NAMES);
        
        const workingDays = getRandomInt(3, 5);
        const selectedDays = new Set();
        while (selectedDays.size < workingDays) {
          selectedDays.add(getRandomInt(1, 5));
        }
        
        const availability = Array.from(selectedDays).map((day, idx) => ({
          id: `avail_${existingWorkers + i}_${idx}`,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '17:00',
          isRecurring: true,
        }));

        workers.push({
          firstName, lastName,
          age: getRandomInt(22, 65),
          location: getRandomElement(SAMPLE_LOCATIONS),
          email: generateEmail(firstName, lastName, `.psw.${existingWorkers + i + 1}`),
          phone: `+1${getRandomInt(2000000000, 9999999999)}`,
          specialties: [getRandomElement(SPECIALTIES), getRandomElement(SPECIALTIES)],
          hourlyRate: getRandomInt(15, 35),
          availability,
          bookings: [],
          createdAt: new Date().toISOString(),
        });
      }
      
      console.log(`Adding ${workersCount} workers...`);
      const addedWorkers = await addChunk('psw_workers', workers, existingWorkers);
      console.log(`✓ Added ${addedWorkers} workers\n`);
    }

    const finalClients = await getExistingCount('clients');
    const finalWorkers = await getExistingCount('psw_workers');
    
    console.log('✅ Chunk completed!');
    console.log(`📈 Total in database: ${finalClients} clients, ${finalWorkers} workers`);
    console.log(`\n💡 Run again to add more: npm run seed:chunk`);
    console.log(`   Or specify amounts: node scripts/seed-firebase-chunked.js 10 5`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const clientsArg = parseInt(process.argv[2]) || 10;
const workersArg = parseInt(process.argv[3]) || 5;

seedChunk(clientsArg, workersArg);



