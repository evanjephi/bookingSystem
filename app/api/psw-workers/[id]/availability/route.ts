// app/api/psw-workers/[id]/availability/route.ts
import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin';
import { getAvailableSlots } from '@/lib/availabilityUtils';
import { PSWWorker, WorkerBooking } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const workerId = params.id;
    if (!workerId) {
      return NextResponse.json(
        { error: 'Worker ID is required.' },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const dateParam = url.searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Query parameter "date" (YYYY-MM-DD) is required.' },
        { status: 400 }
      );
    }

    const targetDate = new Date(dateParam);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const workerDoc = await db.collection('psw_workers').doc(workerId).get();

    if (!workerDoc.exists) {
      return NextResponse.json(
        { error: 'Worker not found.' },
        { status: 404 }
      );
    }

    const workerData = workerDoc.data() || {};
    const worker: PSWWorker = {
      id: workerDoc.id,
      firstName: workerData.firstName,
      lastName: workerData.lastName,
      age: workerData.age,
      location: workerData.location,
      email: workerData.email,
      phone: workerData.phone,
      specialties: workerData.specialties,
      hourlyRate: workerData.hourlyRate,
      availability: workerData.availability || [],
      bookings: workerData.bookings || [],
      createdAt: workerData.createdAt ? new Date(workerData.createdAt) : new Date(),
    };

    // Fetch bookings for this worker on the given date (dates are stored as YYYY-MM-DD strings).
    const bookingDocs = await db
      .collection('bookings')
      .where('pswWorkerId', '==', workerId)
      .where('date', '==', dateParam)
      .get();

    const existingBookings: WorkerBooking[] = bookingDocs.docs.map((doc) => {
      const data = doc.data();
      const bookingDate = data.date instanceof Date
        ? data.date
        : typeof data.date === 'string'
        ? new Date(data.date)
        : data.date?.toDate?.() ?? targetDate;

      return {
        id: doc.id,
        clientId: data.clientId,
        clientName: data.clientName,
        date: bookingDate,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status ?? 'confirmed',
        createdAt:
          data.createdAt instanceof Date
            ? data.createdAt
            : data.createdAt?.toDate?.() ?? new Date(),
      } as WorkerBooking;
    });

    const availableSlots = getAvailableSlots(worker, targetDate, existingBookings);

    return NextResponse.json(
      {
        workerId,
        workerName: `${worker.firstName} ${worker.lastName}`.trim(),
        date: dateParam,
        availableSlots,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Worker availability API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
