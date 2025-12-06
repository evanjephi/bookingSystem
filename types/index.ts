// types/index.ts
export interface User {
  id: string;
  name: string;
  email: string;
  availability: string; // Free form availability info
}

export type ServiceLevel = 'basic' | 'enhanced' | 'premium';

export type UserRole = 'admin' | 'worker' | 'client';

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  location: string; // Home address
  email: string;
  phone?: string;
  createdAt: Date;
  bookings: ClientBooking[]; // Array of booking references
  role?: UserRole;
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  daysOfWeek?: number[]; // 0-6, required for weekly patterns
  startDate?: Date;
  endDate?: Date;
}

export interface ClientBooking {
  id: string;
  pswWorkerId: string;
  pswWorkerName: string;
  date: Date;
  startTime: string; // HH:MM format
  endTime: string;
  serviceLevel: ServiceLevel;
  price?: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: Date;
  requestedAt?: Date;
  confirmationDeadline?: Date;
  confirmedAt?: Date;
  recurringPattern?: RecurringPattern;
}

export interface PSWWorker {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  location: string; // Work/home address
  email: string;
  phone?: string;
  specialties?: string[]; // e.g., ['elderly care', 'mobility assist']
  hourlyRate: number;
  availability: WorkerAvailability[];
  bookings: WorkerBooking[]; // Array of booking references
  createdAt: Date;
  serviceLevels?: ServiceLevel[]; // Supported service tiers
  role?: UserRole;
}

export interface UserSession {
  userId: string | null;
  role: UserRole;
  relatedWorkerId?: string | null;
  relatedClientId?: string | null;
}

export interface WorkerAvailability {
  id: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string;
  isRecurring: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface WorkerBooking {
  id: string;
  clientId: string;
  clientName: string;
  date: Date;
  startTime: string; // HH:MM format
  endTime: string;
  serviceLevel?: ServiceLevel;
  price?: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';
  createdAt: Date;
  requestedAt?: Date;
  confirmationDeadline?: Date;
  confirmedAt?: Date;
  recurringPattern?: RecurringPattern;
}

export interface TimeSlot {
  id: string;
  userId: string;
  date: Date;
  startTime: string; // HH:MM format
  endTime: string;
  title: string;
  attendees: string[]; // User IDs
  description?: string;
}

export interface ParsedBookingRequest {
  attendees: string[];
  daysOfWeek: string[];
  day?: number; // Day of month (1-31) - for specific dates like "November 25th"
  startTime: string;
  endTime: string;
  month: number;
  year: number;
  title: string;
  startDate?: string;
  endDate?: string;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
}

export interface BookingResult {
  success: boolean;
  bookings: TimeSlot[];
  message: string;
}

export interface MatchedWorker {
  worker: PSWWorker;
  conflicts: number; // Number of time conflicts (0 = available)
  distance?: number; // Distance from client location (if available)
  hourlyRate: number;
  score: number; // Matching score (0-100)
}
