import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin';
import { TimeSlot } from '@/types';
import admin from 'firebase-admin';
import { formatLocalDate, toLocalDate } from '@/lib/dateUtils';

export async function GET() {
  try {
    const db = getFirestore();
    const snap = await db.collection('bookings').get();
    const bookings = snap.docs.map((doc) => {
      const data = doc.data();
      // Handle date - if it's a Timestamp, convert to local date string
      // If it's already a string (YYYY-MM-DD), use it as is
      let dateValue: string;
      if (data.date instanceof admin.firestore.Timestamp) {
        const dateObj = data.date.toDate();
        dateValue = formatLocalDate(toLocalDate(dateObj));
      } else if (typeof data.date === 'string') {
        dateValue = data.date; // Already in YYYY-MM-DD format
      } else {
        // Fallback: try to parse whatever it is
        dateValue = formatLocalDate(toLocalDate(data.date as any));
      }
      
      return {
        ...data,
        date: dateValue, // Return as YYYY-MM-DD string
      } as TimeSlot;
    });
    return NextResponse.json({ bookings });
  } catch (err) {
    console.error('bookings GET error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
