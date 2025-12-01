'use client';

import React from 'react';
import { TimeSlot } from '@/types';
import { X, Clock } from 'lucide-react';
import { toLocalDate } from '@/lib/dateUtils';

interface Props {
  date: Date;
  bookings: TimeSlot[];
  onClose: () => void;
} 


export default function BookingDetailsModal({ date, bookings, onClose }: Props) {
  if (!bookings) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Bookings on {date.toLocaleDateString()}</h2>
            <p className="text-sm text-gray-600">{bookings.length} booking(s)</p>
          </div>
          
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
            <X />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {bookings.map((b) => {
            const worker = (b as any).workerName || (b as any).pswWorkerName || 'Unknown Worker';
            const client = (b as any).clientName || 'Unknown Client';
            const bookingDate = toLocalDate(b.date);
            const formattedDate = `${bookingDate.getMonth() + 1}/${bookingDate.getDate()}/${bookingDate.getFullYear()}`;
            const displayName = (b as any).workerName || b.title || 'Booking';


            return (
              <div key={b.id} className="rounded-lg border p-3">
                <div className="flex flex-col">

                  {/* Worker Name */}
                  <h3 className="font-semibold text-lg mb-1">
                    {worker}
                  </h3>

                  {/* Date & Time */}
                  <p className="text-sm text-gray-700 mb-1">
                    {formattedDate} from {b.startTime} to {b.endTime}
                  </p>

                  {/* P: Worker - C: Client */}
                  <p className="text-sm text-gray-800">
                    P: {worker} - C: {client}
                  </p>

                  {/* Optional description */}
                  {b.description && (
                    <p className="mt-2 text-sm text-gray-600">
                      {b.description}
                    </p>
                  )}

                </div>
              </div>

            );
          })}
        </div>

        <div className="mt-6 text-right">
          <button onClick={onClose} className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
