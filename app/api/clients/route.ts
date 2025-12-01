// app/api/clients/route.ts
import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin';
import { Client } from '@/types';

export async function GET() {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('clients').get();

    const clients: Client[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      clients.push({
        ...data,
        createdAt: new Date(data.createdAt),
      } as Client);
    });

    return NextResponse.json({ clients }, { status: 200 });
  } catch (error) {
    console.error('Get clients error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
