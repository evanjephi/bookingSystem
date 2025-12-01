// lib/bookingEngine.ts
import { TimeSlot, User, BookingResult, ParsedBookingRequest } from '@/types';
import { getDatesForMonth, normalizeUserName } from './aiParser';

/**
 * Creates time slots for a booking request
 */
export function createBookingSlots(
  request: ParsedBookingRequest,
  users: User[]
): BookingResult {
  const bookings: TimeSlot[] = [];
  const errors: string[] = [];

  const availableUserNames = users.map((u) => u.name.toLowerCase());
  const normalizedAttendees: string[] = [];

  for (const attendee of request.attendees) {
    const normalized = normalizeUserName(attendee, availableUserNames);
    if (normalized) {
      normalizedAttendees.push(normalized);
    } else {
      errors.push(`User "${attendee}" not found`);
    }
  }

  if (normalizedAttendees.length === 0) {
    return {
      success: false,
      bookings: [],
      message: `No valid attendees found. Available users: ${users.map((u) => u.name).join(', ')}`,
    };
  }

  if (request.daysOfWeek.length === 0) {
    return {
      success: false,
      bookings: [],
      message: 'No days of week specified. Please specify days like Monday, Wednesday, etc.',
    };
  }

  const dates = getDatesForMonth(request.year, request.month, request.daysOfWeek);

  if (dates.length === 0) {
    return {
      success: false,
      bookings: [],
      message: `No dates found for the specified days in ${getMonthName(request.month)} ${request.year}`,
    };
  }

  for (const date of dates) {
    const attendeeIds = normalizedAttendees
      .map((name) => users.find((u) => u.name.toLowerCase() === name.toLowerCase()))
      .filter((user): user is User => user !== undefined)
      .map((u) => u.id);

    // Generate document ID from date and time: YYYY-MM-DD_HH-MM-SS
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = request.startTime.replace(':', '-'); // HH-MM
    const docId = `${dateStr}_${timeStr}_UTC`;

    const slot: TimeSlot = {
      id: docId,
      userId: attendeeIds[0], 
      date,
      startTime: request.startTime,
      endTime: request.endTime,
      title: request.title,
      attendees: attendeeIds,
      description: `Booked for: ${normalizedAttendees.join(', ')}`,
    };

    bookings.push(slot);
  }

  const message =
    errors.length > 0
      ? `Created ${bookings.length} bookings. Note: ${errors.join('; ')}`
      : `Successfully created ${bookings.length} bookings for ${request.title}`;

  return {
    success: true,
    bookings,
    message,
  };
}

/**
 * Checks for scheduling conflicts
 */
export function checkConflicts(
  newSlot: TimeSlot,
  existingSlots: TimeSlot[]
): TimeSlot[] {
  return existingSlots.filter((slot) => {
    // Check if same user and overlapping time
    if (!slot.attendees.some((id) => newSlot.attendees.includes(id))) {
      return false;
    }

    // Check if same date
    if (
      slot.date.toDateString() !== newSlot.date.toDateString()
    ) {
      return false;
    }

    // Check if overlapping time
    const newStart = timeToMinutes(newSlot.startTime);
    const newEnd = timeToMinutes(newSlot.endTime);
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd = timeToMinutes(slot.endTime);

    return newStart < slotEnd && newEnd > slotStart;
  });
}

/**
 * Helper functions
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getMonthName(month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[month - 1] || 'Unknown';
}
