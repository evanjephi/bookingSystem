// lib/availabilityUtils.ts
import { PSWWorker, WorkerAvailability, WorkerBooking } from '@/types';
import { addDays, isSameDay, parseISO, format, parse, isBefore, isAfter, addMinutes } from 'date-fns';

export function getAvailableSlots(
  worker: PSWWorker,
  date: Date,
  existingBookings: WorkerBooking[],
  slotDurationMinutes: number = 60
): { start: string; end: string }[] {
  const dayOfWeek = date.getDay(); // 0-6 (Sunday-Saturday)
  
  // Get worker's availability for this day of week
  const dayAvailability = worker.availability.filter(avail => 
    avail.dayOfWeek === dayOfWeek &&
    (!avail.dateRange || (
      (!avail.dateRange.start || new Date(avail.dateRange.start) <= date) &&
      (!avail.dateRange.end || new Date(avail.dateRange.end) >= date)
    ))
  );

  if (dayAvailability.length === 0) {
    return []; // No availability for this day
  }

  // Convert existing bookings to time ranges for easier comparison
  const bookedSlots = existingBookings
    .filter(booking => isSameDay(new Date(booking.date), date))
    .map(booking => ({
      start: parse(booking.startTime, 'HH:mm', date),
      end: parse(booking.endTime, 'HH:mm', date)
    }));

  const availableSlots: { start: string; end: string }[] = [];

  dayAvailability.forEach(avail => {
    const startTime = parse(avail.startTime, 'HH:mm', date);
    const endTime = parse(avail.endTime, 'HH:mm', date);
    
    let currentSlotStart = startTime;
    
    while (currentSlotStart < endTime) {
      const slotEnd = addMinutes(currentSlotStart, slotDurationMinutes);
      
      if (slotEnd > endTime) break;
      
      // Check if this slot is already booked
      const isBooked = bookedSlots.some(booked => 
        isBefore(currentSlotStart, booked.end) && 
        isAfter(slotEnd, booked.start)
      );
      
      if (!isBooked) {
        availableSlots.push({
          start: format(currentSlotStart, 'HH:mm'),
          end: format(slotEnd, 'HH:mm')
        });
      }
      
      currentSlotStart = slotEnd;
    }
  });

  return availableSlots;
}