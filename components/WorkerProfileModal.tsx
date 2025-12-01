// components/WorkerProfileModal.tsx
'use client';

import { PSWWorker } from '@/types';
import { X, MapPin, DollarSign, Clock, Award } from 'lucide-react';
import { toLocalDate } from '@/lib/dateUtils';

interface WorkerProfileModalProps {
  worker: PSWWorker | null;
  onClose: () => void;
  onBook: (worker: PSWWorker) => void;
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function WorkerProfileModal({
  worker,
  onClose,
  onBook,
}: WorkerProfileModalProps) {
  if (!worker) return null;

  const recurringAvailability = worker.availability.filter((a) => a.isRecurring);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 hover:bg-gray-100 transition-colors"
        >
          <X className="h-6 w-6 text-gray-600" />
        </button>

        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-gray-800">
            {worker.firstName} {worker.lastName}
          </h2>
          <p className="mt-2 text-gray-600">PSW Worker</p>
        </div>

        {/* Quick Info Grid */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Location */}
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-600">Location</p>
                <p className="text-gray-800">{worker.location}</p>
              </div>
            </div>
          </div>

          {/* Hourly Rate */}
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-600">Hourly Rate</p>
                <p className="text-gray-800">${worker.hourlyRate}/hour</p>
              </div>
            </div>
          </div>

          {/* Age */}
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <Award className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-600">Age</p>
                <p className="text-gray-800">{worker.age} years old</p>
              </div>
            </div>
          </div>

          {/* Current Bookings */}
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-600">Active Bookings</p>
                <p className="text-gray-800">{worker.bookings.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800">Contact Info</h3>
          <div className="mt-2 space-y-2 text-gray-700">
            <p>
              <strong>Email:</strong> {worker.email}
            </p>
            {worker.phone && (
              <p>
                <strong>Phone:</strong> {worker.phone}
              </p>
            )}
          </div>
        </div>

        {/* Specialties */}
        {/* Specialties */}
        {worker.specialties && worker.specialties.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {worker.specialties.map((specialty) => (
              <span
                key={`${worker.id}-specialty-${specialty}`}
                className="inline-block rounded-full bg-indigo-200 px-2 py-1 text-xs text-indigo-800"
              >
                {specialty}
              </span>
            ))}
          </div>
        )}

        {/* Availability */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800">Availability</h3>
          <div className="mt-3 space-y-2">
            {recurringAvailability.length > 0 ? (
              recurringAvailability.map((avail) => (
                <div
                  key={avail.id}
                  className="rounded-lg bg-green-50 p-3 text-green-800"
                >
                  <strong>{DAY_NAMES[avail.dayOfWeek]}</strong>: {avail.startTime} -{' '}
                  {avail.endTime}
                </div>
              ))
            ) : (
              <p className="text-gray-600">No recurring availability</p>
            )}
          </div>
        </div>

        {/* Current Bookings */}
        {worker.bookings.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Upcoming Bookings
            </h3>
            <div className="mt-3 space-y-2">
              {worker.bookings.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-lg bg-blue-50 p-3 text-blue-800 text-sm"
                >
                  <p>
                    <strong>Client:</strong> {booking.clientName}
                  </p>
                  <p>
                    <strong>Date:</strong>{' '}
                    {toLocalDate(booking.date).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Time:</strong> {booking.startTime} - {booking.endTime}
                  </p>
                </div>
              ))}
              {worker.bookings.length > 5 && (
                <p className="text-sm text-gray-600">
                  +{worker.bookings.length - 5} more bookings
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onBook(worker)}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Select & Book
          </button>
        </div>
      </div>
    </div>
  );
}
