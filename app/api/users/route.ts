import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin';
import { User } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const users: User[] = body?.users;
    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: 'Invalid users payload' }, { status: 400 });
    }

    const db = getFirestore();
    const batch = db.batch();
    const collection = db.collection('users');

    for (const u of users) {
      const docRef = collection.doc(u.id);
      batch.set(docRef, u, { merge: true });
    }

    await batch.commit();
    return NextResponse.json({ success: true, count: users.length });
  } catch (err) {
    console.error('users API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getFirestore();
    const snap = await db.collection('users').get();
    const users = snap.docs.map((doc) => doc.data() as User);
    return NextResponse.json({ users });
  } catch (err) {
    console.error('users GET error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
