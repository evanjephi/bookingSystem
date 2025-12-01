// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { generateSampleData, convertClientsForFirestore, convertPSWWorkersForFirestore } from '@/lib/seedDatabase';
import { getFirestore } from '@/lib/firebaseAdmin';
import admin from 'firebase-admin';

// Firestore batch limit is 500 operations
const BATCH_LIMIT = 500;

async function clearCollection(db: admin.firestore.Firestore, collectionName: string) {
  const snapshot = await db.collection(collectionName).get();
  if (snapshot.empty) {
    console.log(`Collection ${collectionName} is already empty`);
    return;
  }

  // Use smaller batches for deletions too
  const SMALL_BATCH_SIZE = 50;
  const batches: admin.firestore.WriteBatch[] = [];
  let currentBatch = db.batch();
  let operationCount = 0;

  snapshot.docs.forEach((doc) => {
    if (operationCount >= SMALL_BATCH_SIZE) {
      batches.push(currentBatch);
      currentBatch = db.batch();
      operationCount = 0;
    }
    currentBatch.delete(doc.ref);
    operationCount++;
  });

  if (operationCount > 0) {
    batches.push(currentBatch);
  }

  // Commit all batches with delays
  for (let i = 0; i < batches.length; i++) {
    try {
      await batches[i].commit();
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }
    } catch (error: any) {
      if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED')) {
        console.log(`Rate limit hit during deletion, waiting 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        await batches[i].commit();
      } else {
        throw error;
      }
    }
  }
  console.log(`Cleared ${snapshot.size} documents from ${collectionName}`);
}

async function addDocumentsInBatches(
  db: admin.firestore.Firestore,
  collectionName: string,
  documents: any[]
) {
  // Use even smaller batches to avoid quota issues (10 instead of 50)
  const SMALL_BATCH_SIZE = 10;
  const batches: admin.firestore.WriteBatch[] = [];
  let currentBatch = db.batch();
  let operationCount = 0;

  console.log(`Preparing ${documents.length} documents for ${collectionName}...`);
  
  documents.forEach((doc) => {
    if (operationCount >= SMALL_BATCH_SIZE) {
      batches.push(currentBatch);
      currentBatch = db.batch();
      operationCount = 0;
    }
    const docRef = db.collection(collectionName).doc(doc.id);
    currentBatch.set(docRef, doc);
    operationCount++;
  });

  if (operationCount > 0) {
    batches.push(currentBatch);
  }

  console.log(`Created ${batches.length} batches for ${collectionName}`);

  // Commit all batches with delays to avoid rate limiting
  for (let i = 0; i < batches.length; i++) {
    try {
      console.log(`Committing batch ${i + 1}/${batches.length} for ${collectionName}...`);
      
      // Add timeout wrapper
      const commitPromise = batches[i].commit();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Batch commit timeout after 30 seconds')), 30000)
      );
      
      await Promise.race([commitPromise, timeoutPromise]);
      console.log(`✓ Successfully committed batch ${i + 1}/${batches.length} for ${collectionName}`);
      
      // Add delay between batches to avoid rate limiting (except for last batch)
      if (i < batches.length - 1) {
        console.log(`Waiting 1 second before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    } catch (error: any) {
      console.error(`Error committing batch ${i + 1}/${batches.length}:`, error.message);
      
      if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('Quota exceeded')) {
        console.log(`Rate limit hit, waiting 10 seconds before retrying batch ${i + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        try {
          // Retry the batch
          await batches[i].commit();
          console.log(`✓ Successfully committed batch ${i + 1}/${batches.length} after retry`);
        } catch (retryError: any) {
          console.error(`Retry also failed for batch ${i + 1}:`, retryError.message);
          throw new Error(`Failed to commit batch ${i + 1} after retry: ${retryError.message}`);
        }
      } else if (error.message?.includes('timeout')) {
        console.error(`Batch ${i + 1} timed out. This might indicate a network or quota issue.`);
        throw new Error(`Batch commit timed out. Please wait a few minutes and try again.`);
      } else {
        throw error;
      }
    }
  }
  
  console.log(`✓ Completed adding all documents to ${collectionName}`);
}

export async function POST() {
  try {
    console.log('Starting database seed...');
    
    // Generate sample data
    console.log('Generating sample data...');
    const { clients, pswWorkers } = generateSampleData();
    console.log(`Generated ${clients.length} clients and ${pswWorkers.length} PSW workers`);

    // Get Firestore instance
    console.log('Connecting to Firestore...');
    const db = getFirestore();
    console.log('Connected to Firestore successfully');

    // Clear existing collections
    console.log('Clearing existing data...')
    await clearCollection(db, 'clients')
    // Add delay between clearing and adding
    await new Promise(resolve => setTimeout(resolve, 1000))
    await clearCollection(db, 'psw_workers');
    // Add delay before adding new data
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Convert and add clients
    console.log('Adding clients to Firestore...');
    console.log(`Converting ${clients.length} clients for Firestore...`);
    const clientsForDb = convertClientsForFirestore(clients);
    console.log(`Converted ${clientsForDb.length} clients, starting batch upload...`);
    await addDocumentsInBatches(db, 'clients', clientsForDb);
    console.log(`Successfully added ${clients.length} clients`);
    
    // Add delay before adding workers
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Convert and add PSW workers
    console.log('Adding PSW workers to Firestore...');
    console.log(`Converting ${pswWorkers.length} PSW workers for Firestore...`);
    const workersForDb = convertPSWWorkersForFirestore(pswWorkers);
    console.log(`Converted ${workersForDb.length} workers, starting batch upload...`);
    await addDocumentsInBatches(db, 'psw_workers', workersForDb);
    console.log(`✓ Successfully added ${pswWorkers.length} PSW workers`);

    console.log('Database seed completed successfully!');

    return NextResponse.json(
      {
        success: true,
        message: `Seeded ${clients.length} clients and ${pswWorkers.length} PSW workers`,
        data: {
          clientsCount: clients.length,
          workersCount: pswWorkers.length,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Seed error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Check for quota/rate limit errors
    if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('Quota exceeded')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Firebase quota exceeded. Please wait a few minutes before trying again. The free tier has rate limits.',
          details: 'You may have hit Firebase\'s rate limits. Wait 5-10 minutes and try again, or upgrade your Firebase plan.',
        },
        { status: 429 }
      );
    }
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      code: error.code,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'POST to /api/seed to populate the database with sample data (50 clients, 30 PSW workers)',
    },
    { status: 200 }
  );
}
