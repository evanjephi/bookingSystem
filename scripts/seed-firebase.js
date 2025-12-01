// scripts/seed-firebase.js
// Run this script directly: node scripts/seed-firebase.js
// Make sure .env.local exists with FIREBASE_SERVICE_ACCOUNT

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error('FIREBASE_SERVICE_ACCOUNT not found in .env.local');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
  if (serviceAccount && typeof serviceAccount.private_key === 'string') {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
} catch (err) {
  console.error('FIREBASE_SERVICE_ACCOUNT is not valid JSON:', err.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Sample data generators (same as seedDatabase.ts)
const PRIMARY_CITY = 'Toronto';
const SAMPLE_LOCATIONS = [
  '123 Main St, Toronto, ON',
  '456 Oak Ave, Ottawa, ON',
  '789 Elm St, Hamilton, ON',
  '321 Maple Dr, London, ON',
  '654 Pine Rd, Mississauga, ON',
  '987 Cedar Ln, Brampton, ON',
  '111 Birch Way, Markham, ON',
  '222 Ash Ct, Windsor, ON',
  '333 Hickory Pl, Kitchener, ON',
  '444 Walnut St, Waterloo, ON',
  '555 Queen St, Burlington, ON',
  '666 King St, Oshawa, ON',
  '777 Yonge St, Barrie, ON',
  '888 Bay St, Thunder Bay, ON',
  '999 Front St, Sudbury, ON',
];

const SAMPLE_FIRST_NAMES_MALE = [
  'John', 'Michael', 'Robert', 'James', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Christopher',
];

const SAMPLE_FIRST_NAMES_FEMALE = [
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy',
];

const SAMPLE_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
];

const SPECIALTIES = [
  'elderly care',
  'mobility assist',
  'personal hygiene',
  'medication management',
  'companionship',
  'meal preparation',
  'light housekeeping',
  'dementia care',
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEmail(firstName, lastName, suffix) {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}@example.com`;
}

function generateClients(count) {
  const clients = [];
  for (let i = 0; i < count; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = isMale
      ? getRandomElement(SAMPLE_FIRST_NAMES_MALE)
      : getRandomElement(SAMPLE_FIRST_NAMES_FEMALE);
    const lastName = getRandomElement(SAMPLE_LAST_NAMES);

    clients.push({
      id: `client_${i + 1}`,
      firstName,
      lastName,
      age: getRandomInt(18, 85),
      location: PRIMARY_CITY,
      email: generateEmail(firstName, lastName, `.client.${i + 1}`),
      phone: `+1${getRandomInt(2000000000, 9999999999)}`,
      createdAt: new Date().toISOString(),
      bookings: [],
    });
  }
  return clients;
}

function generatePSWWorkers(count) {
  const workers = [];
  for (let i = 0; i < count; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = isMale
      ? getRandomElement(SAMPLE_FIRST_NAMES_MALE)
      : getRandomElement(SAMPLE_FIRST_NAMES_FEMALE);
    const lastName = getRandomElement(SAMPLE_LAST_NAMES);

    // Generate availability: 3-5 working days per week
    const workingDays = getRandomInt(3, 5);
    const selectedDays = new Set();
    while (selectedDays.size < workingDays) {
      const day = getRandomInt(1, 5); // Monday-Friday (1-5)
      selectedDays.add(day);
    }

    const availability = Array.from(selectedDays).map((day, idx) => ({
      id: `avail_${i}_${idx}`,
      dayOfWeek: day,
      startTime: '08:00',
      endTime: '17:00',
      isRecurring: true,
    }));

    workers.push({
      id: `psw_${i + 1}`,
      firstName,
      lastName,
      age: getRandomInt(22, 65),
      location: PRIMARY_CITY,
      email: generateEmail(firstName, lastName, `.psw.${i + 1}`),
      phone: `+1${getRandomInt(2000000000, 9999999999)}`,
      specialties: [
        getRandomElement(SPECIALTIES),
        getRandomElement(SPECIALTIES),
      ],
      hourlyRate: getRandomInt(15, 35),
      serviceLevels: ['basic', 'enhanced', 'premium'],
      availability,
      bookings: [],
      createdAt: new Date().toISOString(),
    });
  }
  return workers;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function addDocumentWithRetry(collectionRef, docId, data, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await collectionRef.doc(docId).set(data);
      return true;
    } catch (error) {
      if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('Quota exceeded')) {
        if (attempt < retries) {
          const waitTime = attempt * 5000; // 5s, 10s, 15s, 20s, 25s
          console.log(` Rate limit hit, waiting ${waitTime/1000}s before retry ${attempt + 1}/${retries}...`);
          await sleep(waitTime);
          continue;
        } else {
          throw new Error(`Failed after ${retries} retries: ${error.message}`);
        }
      }
      throw error;
    }
  }
  return false;
}

async function seedDatabase() {
  try {
    console.log('Starting database seed...\n');

    // Generate data
    console.log('Generating sample data...');
    const clients = generateClients(50);
    const pswWorkers = generatePSWWorkers(30);
    console.log(`Generated ${clients.length} clients and ${pswWorkers.length} PSW workers\n`);

    // Clear existing data
    console.log('Clearing existing data...');
    const clientSnapshot = await db.collection('clients').get();
    const workerSnapshot = await db.collection('psw_workers').get();
    
    if (!clientSnapshot.empty) {
      console.log(`  Deleting ${clientSnapshot.size} existing clients...`);
      const batch = db.batch();
      clientSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    
    if (!workerSnapshot.empty) {
      console.log(`  Deleting ${workerSnapshot.size} existing workers...`);
      const batch = db.batch();
      workerSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    console.log('Cleared existing data\n');

    // Add clients one by one with delays
    console.log('👥 Adding clients to Firestore...');
    console.log('   (This may take a few minutes due to rate limiting...)\n');
    const clientsRef = db.collection('clients');
    for (let i = 0; i < clients.length; i++) {
      try {
        await addDocumentWithRetry(clientsRef, clients[i].id, clients[i]);
        if ((i + 1) % 5 === 0) {
          console.log(`  Added ${i + 1}/${clients.length} clients`);
        }
        // Longer delay between documents to avoid rate limits
        if (i < clients.length - 1) {
          await sleep(300); // 300ms delay between each document
        }
      } catch (error) {
        console.error(`\nFailed to add client ${i + 1} (${clients[i].id}):`, error.message);
        console.log('\nQuota exceeded. Please wait 10-15 minutes and run the script again.');
        console.log(`Progress: ${i}/${clients.length} clients added so far.`);
        process.exit(1);
      }
    }
    console.log(`\n✓ Successfully added ${clients.length} clients\n`);

    // Wait a bit before adding workers
    console.log('Waiting 2 seconds before adding workers...\n');
    await sleep(2000);

    // Add workers one by one with delays
    console.log('Adding PSW workers to Firestore...');
    console.log('   (This may take a few minutes due to rate limiting...)\n');
    const workersRef = db.collection('psw_workers');
    for (let i = 0; i < pswWorkers.length; i++) {
      try {
        await addDocumentWithRetry(workersRef, pswWorkers[i].id, pswWorkers[i]);
        if ((i + 1) % 3 === 0) {
          console.log(`Added ${i + 1}/${pswWorkers.length} workers`);
        }
        // Longer delay between documents
        if (i < pswWorkers.length - 1) {
          await sleep(300); // 300ms delay between each document
        }
      } catch (error) {
        console.error(`\nFailed to add worker ${i + 1} (${pswWorkers[i].id}):`, error.message);
        console.log('\nQuota exceeded. Please wait 10-15 minutes and run the script again.');
        console.log(`   Progress: ${clients.length} clients added, ${i}/${pswWorkers.length} workers added.`);
        process.exit(1);
      }
    }
    console.log(`\n✓ Successfully added ${pswWorkers.length} PSW workers\n`);

    console.log('Database seed completed successfully!');
    console.log(`\nSummary:`);
    console.log(`   - Clients: ${clients.length}`);
    console.log(`   - PSW Workers: ${pswWorkers.length}`);
    console.log(`\nYou can now use the app with sample data!`);

    process.exit(0);
  } catch (error) {
    console.error('\nSeed error:', error.message);
    if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED')) {
      console.error('\nFirebase quota exceeded. Please wait 5-10 minutes and try again.');
    }
    process.exit(1);
  }
}

// Run the seed
seedDatabase();

