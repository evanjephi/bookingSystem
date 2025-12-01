// lib/clientSearchEngine.ts
import { PSWWorker, ServiceLevel } from '@/types';

export interface WorkerSearchFilters {
  keyword?: string; // Search in name, location, specialties
  minRate?: number;
  maxRate?: number;
  location?: string; // Location keyword for proximity
  specialty?: string; // Filter by specialty
  availableDaysOfWeek?: number[]; // e.g., [1, 2, 3, 4, 5] for Mon-Fri
  sortBy?: 'rate' | 'name' | 'location'; // Sort order
  serviceLevel?: ServiceLevel;
  clientLocation?: string;
  matchClientCityOnly?: boolean;
}

function normalizeLocation(value: string | undefined): string {
  if (!value) return '';
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return value.trim().toLowerCase();
  const hasStreetNumber = /^\d/.test(parts[0]);
  const relevantParts = hasStreetNumber && parts.length > 1 ? parts.slice(1) : parts;
  return relevantParts.join(', ').toLowerCase();
}

/**
 * Search and filter PSW workers based on criteria
 */
export function searchWorkers(
  workers: PSWWorker[],
  filters: WorkerSearchFilters
): PSWWorker[] {
  let results = [...workers];

  // Keyword search in name, location, specialties
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase();
    results = results.filter((worker) => {
      const fullName = `${worker.firstName} ${worker.lastName}`.toLowerCase();
      const location = worker.location.toLowerCase();
      const specialties = (worker.specialties || []).join(' ').toLowerCase();

      return (
        fullName.includes(keyword) ||
        location.includes(keyword) ||
        specialties.includes(keyword)
      );
    });
  }

  // Filter by hourly rate
  if (filters.minRate !== undefined) {
    results = results.filter((worker) => worker.hourlyRate >= filters.minRate!);
  }
  if (filters.maxRate !== undefined) {
    results = results.filter((worker) => worker.hourlyRate <= filters.maxRate!);
  }

  // Filter by location keyword
  if (filters.location) {
    const locationKeyword = filters.location.toLowerCase();
    results = results.filter((worker) =>
      worker.location.toLowerCase().includes(locationKeyword) ||
      normalizeLocation(worker.location).includes(locationKeyword)
    );
  }

  // Filter by specialty
  if (filters.specialty) {
    results = results.filter((worker) =>
      worker.specialties?.some((s) =>
        s.toLowerCase().includes(filters.specialty!.toLowerCase())
      )
    );
  }

  if (filters.serviceLevel) {
    results = results.filter((worker) =>
      worker.serviceLevels?.includes(filters.serviceLevel!)
    );
  }

  if (filters.matchClientCityOnly && filters.clientLocation) {
    const clientCity = normalizeLocation(filters.clientLocation);
    results = results.filter((worker) => normalizeLocation(worker.location) === clientCity);
  }

  // Filter by available days of week
  if (filters.availableDaysOfWeek && filters.availableDaysOfWeek.length > 0) {
    results = results.filter((worker) => {
      const workerAvailableDays = worker.availability.map((a) => a.dayOfWeek);
      return filters.availableDaysOfWeek!.some((day) =>
        workerAvailableDays.includes(day)
      );
    });
  }

  // Sort results
  if (filters.sortBy === 'rate') {
    results.sort((a, b) => a.hourlyRate - b.hourlyRate);
  } else if (filters.sortBy === 'name') {
    results.sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`
      )
    );
  } else if (filters.sortBy === 'location') {
    results.sort((a, b) => a.location.localeCompare(b.location));
  }

  return results;
}

/**
 * Get worker's available time slots for a specific date
 */
export function getWorkerAvailableSlots(
  worker: PSWWorker,
  date: Date
): { startTime: string; endTime: string } | null {
  const dayOfWeek = date.getDay();
  const availability = worker.availability.find((a) => a.dayOfWeek === dayOfWeek);

  if (!availability) return null;

  return {
    startTime: availability.startTime,
    endTime: availability.endTime,
  };
}

/**
 * Check if worker has any bookings on a specific date
 */
export function getWorkerBookingsOnDate(
  worker: PSWWorker,
  date: Date
): any[] {
  const dateStr = date.toDateString();
  return worker.bookings.filter(
    (booking) => new Date(booking.date).toDateString() === dateStr
  );
}

/**
 * Get available time windows on a date (gaps between existing bookings)
 */
export function getAvailableTimeWindows(
  worker: PSWWorker,
  date: Date
): { startTime: string; endTime: string }[] {
  const availability = getWorkerAvailableSlots(worker, date);
  if (!availability) return [];

  const bookings = getWorkerBookingsOnDate(worker, date);

  if (bookings.length === 0) {
    return [availability];
  }

  // Sort bookings by start time
  bookings.sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  const windows = [];
  let currentTime = availability.startTime;

  for (const booking of bookings) {
    if (currentTime < booking.startTime) {
      windows.push({
        startTime: currentTime,
        endTime: booking.startTime,
      });
    }
    currentTime = booking.endTime;
  }

  if (currentTime < availability.endTime) {
    windows.push({
      startTime: currentTime,
      endTime: availability.endTime,
    });
  }

  return windows;
}
