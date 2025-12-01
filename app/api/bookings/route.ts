import { NextResponse } from 'next/server';
import { TimeSlot } from '@/types';
import { validateAndSaveBookings, BookingError } from '@/lib/bookingPersistence';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bookings: TimeSlot[] = body?.bookings;
    const result = await validateAndSaveBookings(bookings as any);
    return NextResponse.json({ success: true, count: result.count });
  } catch (err) {
    console.error('bookings API error:', err);
    if (err instanceof BookingError) {
      return NextResponse.json(
        { error: err.message, ...(err.details ? { details: err.details } : {}) },
        { status: err.status }
      );
    }
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
