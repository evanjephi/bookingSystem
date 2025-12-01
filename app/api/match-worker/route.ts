// app/api/match-worker/route.ts
import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin';
import { findAvailableWorkers, findBestMatch } from '@/lib/matchingEngine';
import { Client, PSWWorker } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, dates, startTime, endTime, findBest } = body;

    if (!clientId || !dates || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, dates, startTime, endTime' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Fetch client
    const clientDoc = await db.collection('clients').doc(clientId).get();
    if (!clientDoc.exists) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = clientDoc.data() as Client;

    // Fetch all PSW workers
    const workersSnapshot = await db.collection('psw_workers').get();
    const workers: PSWWorker[] = [];
    workersSnapshot.forEach((doc) => {
      workers.push(doc.data() as PSWWorker);
    });

    // Convert date strings to Date objects
    const dateObjects = (dates as string[]).map((d) => new Date(d));

    let result;

    if (findBest) {
      // Find best single match
      const bestMatch = findBestMatch(client, workers, dateObjects, startTime, endTime);
      result = bestMatch
        ? {
            success: true,
            bestMatch,
            message: `Found best match: ${bestMatch.worker.firstName} ${bestMatch.worker.lastName}`,
          }
        : {
            success: false,
            bestMatch: null,
            message: 'No available workers found',
          };
    } else {
      // Find all available workers
      const matches = findAvailableWorkers(client, workers, dateObjects, startTime, endTime);
      result = {
        success: matches.length > 0,
        matches,
        message: matches.length > 0
          ? `Found ${matches.length} available workers`
          : 'No available workers found',
      };
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Match worker error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'POST to /api/match-worker with { clientId, dates, startTime, endTime, findBest }',
      example: {
        clientId: 'client_1',
        dates: ['2025-12-15', '2025-12-16'],
        startTime: '09:00',
        endTime: '12:00',
        findBest: true,
      },
    },
    { status: 200 }
  );
}
