// app/api/book-with-worker/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseBookingRequestWithAI } from '@/lib/openaiParser';
import { getFirestore } from '@/lib/firebaseAdmin';
import { PSWWorker, Client } from '@/types';
import { format, getDay } from 'date-fns';
import * as chrono from 'chrono-node';
import { formatLocalDate, toLocalDate } from '@/lib/dateUtils';
import { validateAndSaveBookings, BookingError } from '@/lib/bookingPersistence';

interface WorkerWithId extends PSWWorker {
  id: string;
}

const MONTH_LOOKUP: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function detectMonthFromInput(text: string): number | undefined {
  const words = text.toLowerCase();
  for (const [name, value] of Object.entries(MONTH_LOOKUP)) {
    if (words.includes(name)) {
      return value;
    }
  }
  return undefined;
}

function detectYearFromInput(text: string): number | undefined {
  const match = text.match(/\b(20\d{2})\b/);
  if (match) {
    const parsed = parseInt(match[1], 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

/**
 * Parse natural language booking request and create booking with PSW worker
 * Example: "book a meeting with Barbara Johnson at 9am-12pm on december 10"
 * 
 * Request body:
 * {
 *   input: string,          // Natural language booking request
 *   clientId: string        // ID of the client making the booking
 * }
 * 
 * Returns:
 * {
 *   success: boolean,
 *   booking?: { clientId, pswWorkerId, date, startTime, endTime },
 *   message: string,
 *   errors?: Array
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { input, clientId } = await req.json();

    if (!input || !clientId) {
      return NextResponse.json(
        { success: false, message: 'Missing input or clientId' },
        { status: 400 }
      );
    }

    // Step 1: Parse the natural language request
    const { parsed, errors } = await parseBookingRequestWithAI(input);

    if (!parsed) {
      return NextResponse.json(
        { success: false, message: 'Failed to parse booking request', errors },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Step 2: Verify client exists
    const clientDoc = await db.collection('clients').doc(clientId).get();
    if (!clientDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'Client not found' },
        { status: 404 }
      );
    }
    const client = clientDoc.data() as Client;

    // Step 3: Find PSW worker by name (from attendees list)
    if (!parsed.attendees || parsed.attendees.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No worker name found in booking request' },
        { status: 400 }
      );
    }

    const workerName = parsed.attendees[0]; // First attendee is the PSW worker
    const workersSnapshot = await db.collection('psw_workers').get();
    
    const normalizedWorkerName = workerName.toLowerCase().trim();
    let matchedWorker: WorkerWithId | null = null;
    let exactMatch: WorkerWithId | null = null;
    let partialMatch: WorkerWithId | null = null;
    
    for (const doc of workersSnapshot.docs) {
      const worker = doc.data() as PSWWorker;
      const firstNameLower = worker.firstName.toLowerCase();
      const lastNameLower = worker.lastName.toLowerCase();
      const fullNameLower = `${firstNameLower} ${lastNameLower}`;
      
      // Priority 1: Exact match (full name) - best match, stop searching
      if (fullNameLower === normalizedWorkerName) {
        exactMatch = { ...worker, id: doc.id };
        break; // Stop searching once we have an exact match
      }
      
      // Priority 2: First name exact match (if only first name provided)
      if (firstNameLower === normalizedWorkerName) {
        if (!exactMatch && !partialMatch) {
          partialMatch = { ...worker, id: doc.id };
        }
        continue;
      }
      
      // Priority 3: Last name exact match
      if (lastNameLower === normalizedWorkerName) {
        if (!exactMatch && !partialMatch) {
          partialMatch = { ...worker, id: doc.id };
        }
        continue;
      }
      
      // Priority 4: Full name contains the search term
      if (fullNameLower.includes(normalizedWorkerName)) {
        if (!exactMatch && !partialMatch) {
          partialMatch = { ...worker, id: doc.id };
        }
        continue;
      }
      
      // Priority 5: Search term contains first or last name
      if (normalizedWorkerName.includes(firstNameLower) || normalizedWorkerName.includes(lastNameLower)) {
        if (!exactMatch && !partialMatch) {
          partialMatch = { ...worker, id: doc.id };
        }
      }
    }
    
    matchedWorker = exactMatch || partialMatch;

    if (!matchedWorker) {
      return NextResponse.json(
        { success: false, message: `PSW worker "${workerName}" not found in database` },
        { status: 404 }
      );
    }

    // Type guard: ensure matchedWorker is not null for the rest of the function
    const worker: WorkerWithId = matchedWorker;

    // Step 4: Build booking date using deterministic parsing first
    const now = new Date();
    const normalizedInput = input.toLowerCase();
    const chronoResults = chrono.parse(input, now, { forwardDate: true });
    const chronoStart = chronoResults[0]?.start ?? null;

    const inferMonth = () => parsed.month || detectMonthFromInput(normalizedInput) || now.getMonth() + 1;
    const inferYear = () => parsed.year || detectYearFromInput(normalizedInput) || now.getFullYear();

    let month = inferMonth();
    let year = inferYear();

    // If no explicit year provided and inferred month already passed, assume next year
    if (!parsed.year && !detectYearFromInput(normalizedInput)) {
      const candidate = new Date(year, month - 1, 1);
      if (candidate < now && month < now.getMonth() + 1) {
        year += 1;
      }
    }

    const normalizeFutureDate = (date: Date | null) => {
      if (!date) return null;
      let adjusted = new Date(date);
      if (adjusted.getTime() <= now.getTime()) {
        adjusted = new Date(adjusted.getTime() + 24 * 60 * 60 * 1000);
      }
      return adjusted;
    };

    let bookingDate: Date | null = null;
    if (chronoStart) {
      let chronoDate = chronoStart.date();

      if (!chronoStart.isCertain('year') && chronoDate < now) {
        chronoDate = new Date(now.getFullYear(), chronoDate.getMonth(), chronoDate.getDate(), chronoDate.getHours(), chronoDate.getMinutes());
        if (chronoDate < now) {
          chronoDate = new Date(now.getFullYear() + 1, chronoDate.getMonth(), chronoDate.getDate(), chronoDate.getHours(), chronoDate.getMinutes());
        }
      }

      bookingDate = chronoDate;
    }

    // Priority 1: If a specific day of month is provided and chrono didn't parse it, use it
    if (!bookingDate && parsed.day && parsed.day >= 1 && parsed.day <= 31) {
      try {
        const testDate = new Date(year, month - 1, parsed.day);
        if (testDate.getFullYear() === year && testDate.getMonth() === month - 1 && testDate.getDate() === parsed.day) {
          bookingDate = testDate;
        }
      } catch (error) {
        console.error('Invalid date:', error);
      }
    }

    // Priority 2: If no specific day but daysOfWeek is provided, find matching day
    if (!bookingDate && parsed.daysOfWeek && parsed.daysOfWeek.length > 0) {
      const targetDayName = parsed.daysOfWeek[0].toLowerCase();
      const dayMap: Record<string, number> = {
        'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
        'friday': 5, 'saturday': 6, 'sunday': 0
      };
      const targetDayNum = dayMap[targetDayName];
      
      if (targetDayNum !== undefined) {
        for (let day = 1; day <= 31; day++) {
          try {
            const testDate = new Date(year, month - 1, day);
            if (testDate.getMonth() === month - 1 && getDay(testDate) === targetDayNum) {
              bookingDate = testDate;
              break;
            }
          } catch {
            break;
          }
        }
      }
    }

    // Default to first day of specified month if no specific date or day of week matched
    if (!bookingDate) {
      bookingDate = new Date(year, month - 1, 1);
    }

    if (!bookingDate || isNaN(bookingDate.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Could not determine booking date' },
        { status: 400 }
      );
    }

    // Ensure the occurrence is in the future relative to now.
    if (bookingDate.getTime() <= now.getTime()) {
      if (parsed.daysOfWeek && parsed.daysOfWeek.length > 0) {
        while (bookingDate.getTime() <= now.getTime()) {
          bookingDate = new Date(bookingDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
      } else {
        bookingDate = new Date(year + 1, month - 1, bookingDate.getDate());
      }
    }

    bookingDate = normalizeFutureDate(bookingDate);
    if (!bookingDate) {
      return NextResponse.json(
        { success: false, message: 'Could not determine booking date' },
        { status: 400 }
      );
    }

    // Step 5: Check worker availability
    const dayOfWeek = getDay(bookingDate); // 0 = Sunday, 1 = Monday, etc.
    const isAvailable = worker.availability.some((avail: any) => 
      avail.dayOfWeek === dayOfWeek || avail.dayOfWeek === (dayOfWeek === 0 ? 7 : dayOfWeek)
    );

    if (!isAvailable) {
      return NextResponse.json(
        { success: false, message: `${worker.firstName} ${worker.lastName} is not available on ${format(bookingDate, 'EEEE')}` },
        { status: 400 }
      );
    }

    // Step 6 & 7: Build booking payload and delegate to central validator
    const deriveTimeComponent = () => {
      if (!chronoStart) return null;
      if (!chronoStart.isCertain('hour')) return null;
      const hour = chronoStart.get('hour');
      const minute = chronoStart.isCertain('minute') ? chronoStart.get('minute') : 0;
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    };

    const derivedStartTime = deriveTimeComponent();
    const startTime = parsed.startTime || derivedStartTime || '09:00';
    const endTime = parsed.endTime || '10:00';
    const localBookingDate = toLocalDate(bookingDate);
    const dateString = formatLocalDate(localBookingDate);
    const bookingId = `${dateString}_${startTime.replace(':', '-')}_UTC`;
    const bookingPayload = {
      id: bookingId,
      clientId,
      pswWorkerId: worker.id,
      clientName: `${client.firstName} ${client.lastName}`,
      pswWorkerName: `${worker.firstName} ${worker.lastName}`,
      date: dateString,
      startTime,
      endTime,
      status: 'confirmed' as const,
      createdAt: new Date().toISOString(),
    };

    await validateAndSaveBookings([bookingPayload]);

    return NextResponse.json(
      {
        success: true,
        message: `Booking confirmed with ${worker.firstName} ${worker.lastName}`,
        booking: bookingPayload,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Booking error:', error);
    if (error instanceof BookingError) {
      return NextResponse.json(
        { success: false, message: error.message, ...(error.details ? { details: error.details } : {}) },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'POST to /api/book-with-worker with { input: string, clientId: string } to book with a PSW worker',
      example: {
        input: 'book a meeting with Barbara Johnson at 9am-12pm on monday',
        clientId: 'client_1'
      }
    },
    { status: 200 }
  );
}
