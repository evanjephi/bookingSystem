import admin from 'firebase-admin';
import { getFirestore } from '@/lib/firebaseAdmin';
import { formatLocalDate, toLocalDate } from '@/lib/dateUtils';
import { PSWWorker, WorkerBooking, ServiceLevel, RecurringPattern, Client } from '@/types';
import { addDays, addMonths, addHours, differenceInDays, isAfter } from 'date-fns';

export class BookingError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, status = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'BookingError';
    this.status = status;
    this.details = details;
  }
}

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface BookingPayload {
  id: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  pswWorkerId?: string;
  userId?: string;
  pswWorkerName?: string;
  clientId?: string;
  clientLocation?: string;
  serviceLevel?: ServiceLevel;
  price?: number;
  status?: BookingStatus;
  recurringPattern?: RecurringPattern;
  requestedAt?: string | Date;
  confirmationDeadline?: string | Date;
  confirmedAt?: string | Date;
  createdAt?: string | Date;
  [key: string]: unknown;
}

interface PreparedBooking {
  docRef: FirebaseFirestore.DocumentReference;
  payload: Record<string, unknown>;
}

function pruneUndefinedValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => pruneUndefinedValues(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, val]) => {
      const sanitized = pruneUndefinedValues(val);
      if (sanitized !== undefined) {
        acc[key] = sanitized;
      }
      return acc;
    }, {});
  }

  return value === undefined ? undefined : value;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map((value) => parseInt(value, 10));
  return (hours || 0) * 60 + (minutes || 0);
}

function normalizeWorkerBookings(raw: any[]): WorkerBooking[] {
  return raw.map((booking) => {
    const dateValue = booking.date;
    let normalizedDate: Date;

    if (dateValue instanceof Date) {
      normalizedDate = toLocalDate(dateValue);
    } else if (typeof dateValue === 'string') {
      normalizedDate = toLocalDate(dateValue);
    } else if (dateValue?.toDate) {
      normalizedDate = toLocalDate(dateValue.toDate());
    } else {
      normalizedDate = new Date();
    }

    const created = booking.createdAt;
    const createdAt = created instanceof Date
      ? created
      : created?.toDate?.() || new Date();

    const requested = booking.requestedAt;
    const requestedAt = requested instanceof Date
      ? requested
      : requested?.toDate?.() || undefined;

    const confirmationDeadlineValue = booking.confirmationDeadline;
    const confirmationDeadline = confirmationDeadlineValue instanceof Date
      ? confirmationDeadlineValue
      : confirmationDeadlineValue?.toDate?.() || undefined;

    const confirmedValue = booking.confirmedAt;
    const confirmedAt = confirmedValue instanceof Date
      ? confirmedValue
      : confirmedValue?.toDate?.() || undefined;

    return {
      id: booking.id || booking.bookingId || `${booking.pswWorkerId || 'worker'}_${booking.startTime}_${formatLocalDate(normalizedDate)}`,
      clientId: booking.clientId || '',
      clientName: booking.clientName || '',
      date: normalizedDate,
      startTime: booking.startTime || '09:00',
      endTime: booking.endTime || '10:00',
      serviceLevel: booking.serviceLevel,
      price: typeof booking.price === 'number' ? booking.price : undefined,
      status: booking.status || 'confirmed',
      createdAt,
      requestedAt,
      confirmationDeadline,
      confirmedAt,
      recurringPattern: booking.recurringPattern,
    } as WorkerBooking;
  });
}

const SERVICE_LEVEL_PRICING: Record<ServiceLevel, number> = {
  basic: 1,
  enhanced: 1.2,
  premium: 1.4,
};

const MIN_NOTICE_HOURS = 24;
const CONFIRMATION_WINDOW_HOURS = 12;

function expandRecurringBookings(bookings: BookingPayload[]): BookingPayload[] {
  const expanded: BookingPayload[] = [];

  for (const booking of bookings) {
    if (!booking.recurringPattern) {
      expanded.push(booking);
      continue;
    }

    const occurrences = generateRecurringOccurrences(booking);
    expanded.push(...occurrences);
  }

  return expanded;
}

function generateRecurringOccurrences(booking: BookingPayload): BookingPayload[] {
  const occurrences: BookingPayload[] = [];
  const baseDate = toLocalDate(booking.date as string | Date);
  const pattern = booking.recurringPattern as RecurringPattern;
  const endDate = pattern.endDate ? toLocalDate(pattern.endDate) : baseDate;

  if (isAfter(baseDate, endDate)) {
    return [booking];
  }

  const addOccurrence = (date: Date) => {
    const dateString = formatLocalDate(date);
    const timeFragment = (booking.startTime || '09:00').replace(':', '-');
    const workerFragment = booking.pswWorkerId || booking.userId || 'slot';
    const generatedId = `${dateString}_${timeFragment}_${workerFragment}`;

    occurrences.push({
      ...booking,
      id: generatedId,
      date: dateString,
      recurringPattern: undefined,
    });
  };

  const daysBetween = differenceInDays(endDate, baseDate);

  switch (pattern.frequency) {
    case 'daily': {
      for (let i = 0; i <= daysBetween; i++) {
        addOccurrence(addDays(baseDate, i));
      }
      break;
    }
    case 'weekly':
    case 'biweekly': {
      const daysOfWeek = pattern.daysOfWeek && pattern.daysOfWeek.length > 0
        ? pattern.daysOfWeek
        : [baseDate.getDay()];

      for (let i = 0; i <= daysBetween; i++) {
        const current = addDays(baseDate, i);
        const diff = differenceInDays(current, baseDate);
        const withinInterval = pattern.frequency === 'weekly' || Math.floor(diff / 7) % 2 === 0;
        if (withinInterval && daysOfWeek.includes(current.getDay())) {
          addOccurrence(current);
        }
      }
      break;
    }
    case 'monthly': {
      let current = new Date(baseDate);
      while (current <= endDate) {
        addOccurrence(current);
        current = addMonths(current, 1);
      }
      break;
    }
    default: {
      addOccurrence(baseDate);
    }
  }

  return occurrences;
}

function ensureAdvanceNotice(targetDate: Date, startTime: string) {
  const [hours, minutes] = startTime.split(':').map((value) => parseInt(value, 10));
  const slotStart = new Date(targetDate);
  slotStart.setHours(hours || 0, minutes || 0, 0, 0);

  const diffHours = (slotStart.getTime() - Date.now()) / (1000 * 60 * 60);
  if (diffHours < MIN_NOTICE_HOURS) {
    throw new BookingError('Bookings must be requested at least 24 hours in advance.', 400);
  }
}

function calculatePrice(hourlyRate: number, serviceLevel: ServiceLevel, durationMinutes: number): number {
  const multiplier = SERVICE_LEVEL_PRICING[serviceLevel] ?? 1;
  const hours = durationMinutes / 60;
  const price = hourlyRate * multiplier * hours;
  return Math.round(price * 100) / 100;
}

export async function validateAndSaveBookings(bookings: BookingPayload[] | undefined | null) {
  if (!bookings || !Array.isArray(bookings)) {
    throw new BookingError('Invalid bookings payload', 400);
  }

  if (bookings.length === 0) {
    throw new BookingError('No bookings provided', 400);
  }

  const bookingsToProcess = expandRecurringBookings(bookings);
  const db = getFirestore();
  const prepared: PreparedBooking[] = [];

  for (const booking of bookingsToProcess) {
    if (!booking.id) {
      throw new BookingError('Each booking must have an id field', 400);
    }

    if (!booking.date) {
      throw new BookingError(`Booking ${booking.id} is missing a date field`, 400);
    }

    const workerId = booking.pswWorkerId || booking.userId;
    if (!workerId) {
      throw new BookingError(`Booking ${booking.id} is missing worker/user ID`, 400);
    }

    const clientId = booking.clientId;
    if (!clientId) {
      throw new BookingError(`Booking ${booking.id} is missing client ID`, 400);
    }

    const localDate = toLocalDate(booking.date as string | Date);
    const dateString = formatLocalDate(localDate);

    const workerDoc = await db.collection('psw_workers').doc(workerId).get();
    if (!workerDoc.exists) {
      throw new BookingError(`PSW worker with ID ${workerId} not found`, 404);
    }

    const workerData = workerDoc.data() as PSWWorker;
    const workerName = booking.pswWorkerName || `${workerData?.firstName ?? ''} ${workerData?.lastName ?? ''}`.trim() || 'Worker';

    const clientDoc = await db.collection('clients').doc(clientId).get();
    if (!clientDoc.exists) {
      throw new BookingError(`Client with ID ${clientId} not found`, 404);
    }
    const clientData = clientDoc.data() as Client;

    const workerLocation = (workerData.location || '').trim().toLowerCase();
    const clientLocation = (clientData.location || '').trim().toLowerCase();

    if (!workerLocation || !clientLocation || workerLocation !== clientLocation) {
      throw new BookingError(
        `${workerName} is not available because they are located in ${workerData.location || 'a different city'}. ` +
          `Clients can only book PSW workers within ${clientData.location || 'their own city'}.`,
        409,
        {
          workerLocation: workerData.location || null,
          clientLocation: clientData.location || null,
        }
      );
    }

    const startTime = booking.startTime || '09:00';
    const endTime = booking.endTime || '10:00';
    const durationMinutes = Math.max(timeToMinutes(endTime) - timeToMinutes(startTime), 0);
    if (durationMinutes <= 0) {
      throw new BookingError(`Invalid time range for booking ${booking.id}`, 400);
    }

    ensureAdvanceNotice(localDate, startTime);

    const serviceLevel: ServiceLevel = booking.serviceLevel || 'basic';
    if (workerData.serviceLevels && !workerData.serviceLevels.includes(serviceLevel)) {
      throw new BookingError(
        `${workerName} does not offer the ${serviceLevel} service level.`,
        409
      );
    }

    const workerDayAvailability = (workerData.availability || []).filter((avail) => {
      if (avail.dayOfWeek === undefined || avail.dayOfWeek === null) return false;
      return avail.dayOfWeek === localDate.getDay();
    });

    if (workerDayAvailability.length === 0) {
      throw new BookingError(`${workerName} is not available on ${dateString}`, 409);
    }

    const withinAvailability = workerDayAvailability.some((avail) => {
      const availStart = timeToMinutes(avail.startTime);
      const availEnd = timeToMinutes(avail.endTime);
      const newStart = timeToMinutes(startTime);
      const newEnd = timeToMinutes(endTime);
      return newStart >= availStart && newEnd <= availEnd;
    });

    if (!withinAvailability) {
      throw new BookingError(`${workerName} is not available at ${startTime}-${endTime} on ${dateString}`, 409);
    }

    const bookingsSnapshot = await db
      .collection('bookings')
      .where('pswWorkerId', '==', workerId)
      .where('date', '==', dateString)
      .get();

    const existingBookingsFromCollection = bookingsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    });

    const workerBookings = Array.isArray(workerData.bookings) ? normalizeWorkerBookings(workerData.bookings) : [];
    const collectionWorkerBookings = normalizeWorkerBookings(existingBookingsFromCollection);

    const combinedBookingsMap = new Map<string, WorkerBooking>();
    for (const wb of [...workerBookings, ...collectionWorkerBookings]) {
      combinedBookingsMap.set(wb.id, wb);
    }

    const combinedBookings = Array.from(combinedBookingsMap.values());
    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);

    const hasConflict = combinedBookings.some((existing) => {
      const existingStart = timeToMinutes(existing.startTime);
      const existingEnd = timeToMinutes(existing.endTime);
      return newStart < existingEnd && newEnd > existingStart && formatLocalDate(existing.date) === dateString;
    });

    if (hasConflict) {
      throw new BookingError(
        `${workerName} already has a booking at ${startTime}-${endTime} on ${dateString}. Please choose a different time.`,
        409
      );
    }

    const docRef = db.collection('bookings').doc(booking.id);
    const createdAt = booking.createdAt ? new Date(booking.createdAt as string | Date) : new Date();
    const requestedAt = booking.requestedAt ? new Date(booking.requestedAt as string | Date) : new Date();
    const confirmationDeadline = booking.confirmationDeadline
      ? new Date(booking.confirmationDeadline as string | Date)
      : addHours(requestedAt, CONFIRMATION_WINDOW_HOURS);
    const price = booking.price ?? calculatePrice(workerData.hourlyRate, serviceLevel, durationMinutes);

    const payload = {
      ...booking,
      pswWorkerId: workerId,
      date: dateString,
      serviceLevel,
      price,
      status: (booking.status as BookingStatus) || 'pending',
      requestedAt: admin.firestore.Timestamp.fromDate(requestedAt),
      confirmationDeadline: admin.firestore.Timestamp.fromDate(confirmationDeadline),
      createdAt: admin.firestore.Timestamp.fromDate(createdAt),
    } as Record<string, unknown>;

    const sanitizedPayload = pruneUndefinedValues(payload) as Record<string, unknown>;

    prepared.push({ docRef, payload: sanitizedPayload });
  }

  const batch = db.batch();
  for (const entry of prepared) {
    batch.set(entry.docRef, entry.payload);
  }

  await batch.commit();

  return { count: bookingsToProcess.length };
}
