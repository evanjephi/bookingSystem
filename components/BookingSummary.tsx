'use client';

import { BookingResult } from '@/types';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { toLocalDate } from '@/lib/dateUtils';

interface BookingSummaryProps {
  result: BookingResult;
}

export default function BookingSummary({ result }: BookingSummaryProps) {
  return (
    <div
      className={`rounded-lg p-6 shadow-lg ${
        result.success
          ? 'border-l-4 border-green-500 bg-green-50'
          : 'border-l-4 border-red-500 bg-red-50'
      }`}
    >
      <div className="mb-3 flex items-start gap-3">
        {result.success ? (
          <CheckCircle size={24} className="mt-0.5 flex-shrink-0 text-green-600" />
        ) : (
          <AlertCircle size={24} className="mt-0.5 flex-shrink-0 text-red-600" />
        )}
        <div className="flex-1">
          <h3
            className={`text-lg font-semibold ${
              result.success ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {result.success ? 'Bookings Created' : 'Booking Failed'}
          </h3>
          <p className={`mt-1 text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.message}
          </p>
        </div>
      </div>

      {result.bookings.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">Booked dates:</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {result.bookings.map((booking) => {
              const bookingDate = toLocalDate(booking.date);
              const formattedDate = `${bookingDate.getMonth() + 1}/${bookingDate.getDate()}/${bookingDate.getFullYear()}`;
              const displayName = (booking as any).workerName || booking.title || 'Booking';
              
              return (
                <div
                  key={booking.id}
                  className="rounded bg-white p-3 text-sm text-gray-700"
                >
                  <div className="flex flex-col">
                    {/* Worker/Title Name */}
                    <h4 className="font-semibold text-base mb-1">
                      {displayName}
                    </h4>
                    
                    {/* Date and Time */}
                    <p className="text-sm text-gray-700 mb-1">
                      {formattedDate} from {booking.startTime} to {booking.endTime}
                    </p>
                    
                    {/* P: Worker - C: Client format */}
                    {('workerName' in booking) && ('clientName' in booking) ? (
                      <p className="text-sm text-gray-800">
                        P: {(booking as any).workerName} - C: {(booking as any).clientName}
                      </p>
                    ) : booking.title ? (
                      <p className="text-sm text-gray-800">{booking.title}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
