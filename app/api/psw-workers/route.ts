// app/api/psw-workers/route.ts
import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin';
import { PSWWorker, WorkerBooking } from '@/types';
import { searchWorkers, WorkerSearchFilters } from '@/lib/clientSearchEngine';
import { getAvailableSlots } from '@/lib/availabilityUtils';

export async function GET(request: Request) {
  try {
    const db = getFirestore();
    const url = new URL(request.url);

    // extract optional ?date=YYYY-MM-DD
    const dateParam = url.searchParams.get('date');
    let selectedDate: Date | null = null;

    if (dateParam) {
      selectedDate = new Date(dateParam);
      if (isNaN(selectedDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }
    }

    // Fetch all workers
    const snapshot = await db.collection('psw_workers').get();
    const allWorkers: PSWWorker[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      allWorkers.push({
        id: doc.id,
        ...data,
        createdAt: new Date(data.createdAt),
      } as PSWWorker);
    });

    // Parse filters
    const filters: WorkerSearchFilters = {
      keyword: url.searchParams.get('keyword') || undefined,
      minRate: url.searchParams.get('minRate')
        ? parseInt(url.searchParams.get('minRate')!)
        : undefined,
      maxRate: url.searchParams.get('maxRate')
        ? parseInt(url.searchParams.get('maxRate')!)
        : undefined,
      location: url.searchParams.get('location') || undefined,
      specialty: url.searchParams.get('specialty') || undefined,
      sortBy: (url.searchParams.get('sortBy') as any) || 'name',
      serviceLevel: (url.searchParams.get('serviceLevel') as any) || undefined,
      clientLocation: url.searchParams.get('clientLocation') || undefined,
      matchClientCityOnly: url.searchParams.get('matchClientCityOnly') === 'true',
    };

    const daysParam = url.searchParams.get('availableDays');
    if (daysParam) {
      filters.availableDaysOfWeek = daysParam
        .split(',')
        .map((d) => parseInt(d));
    }

    // Apply search filters
    const filteredWorkers = searchWorkers(allWorkers, filters);

    // If no date is passed, just return workers normally
    if (!selectedDate) {
      return NextResponse.json(
        { workers: filteredWorkers, total: filteredWorkers.length },
        { status: 200 }
      );
    }

    // Fetch availability for each worker on the given date
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const workersWithAvailability = [];

    for (const worker of filteredWorkers) {
      const bookingsSnap = await db
        .collection('bookings')
        .where('pswWorkerId', '==', worker.id)
        .where('date', '>=', startOfDay)
        .where('date', '<=', endOfDay)
        .get();

      const existingBookings: WorkerBooking[] = bookingsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WorkerBooking[];

      const availableSlots = getAvailableSlots(worker, selectedDate, existingBookings);

      workersWithAvailability.push({
        ...worker,
        availableSlots,
      });
    }

    return NextResponse.json(
      {
        date: selectedDate.toISOString().split('T')[0],
        workers: workersWithAvailability,
        total: workersWithAvailability.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get PSW workers error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workerId } = body;

    if (!workerId) {
      return NextResponse.json(
        { error: 'workerId is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const doc = await db.collection('psw_workers').doc(workerId).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    const data = doc.data();
    const worker = {
      ...data,
      createdAt: new Date(data!.createdAt),
    } as PSWWorker;

    return NextResponse.json({ worker }, { status: 200 });
  } catch (error) {
    console.error('Get PSW worker error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
