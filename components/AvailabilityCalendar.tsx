// components/AvailabilityCalendar.tsx
'use client';

import { useEffect, useState } from 'react';
import { format, isSameDay } from 'date-fns';

interface AvailabilityCalendarProps {
  workerId: string;
  onSelectSlot: (date: Date, startTime: string, endTime: string) => void;
  selectedDate?: Date;
}

type AvailableSlot = { start: string; end: string };

export function AvailabilityCalendar({
  workerId,
  onSelectSlot,
  selectedDate: externalSelectedDate,
}: AvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(externalSelectedDate || new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (externalSelectedDate && !isSameDay(externalSelectedDate, selectedDate)) {
      setSelectedDate(externalSelectedDate);
    }
  }, [externalSelectedDate, selectedDate]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!workerId) return;

      setIsLoading(true);
      setError(null);

      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const res = await fetch(`/api/psw-workers/${workerId}/availability?date=${dateStr}`);

        if (!res.ok) {
          throw new Error('Failed to fetch availability');
        }

        const data = await res.json();
        setAvailableSlots(data.availableSlots || []);
      } catch (err) {
        console.error('Error fetching availability:', err);
        setError('Failed to load availability. Please try again.');
        setAvailableSlots([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, [workerId, selectedDate]);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (!value) return;
    const nextDate = new Date(value);
    if (!Number.isNaN(nextDate.getTime())) {
      setSelectedDate(nextDate);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <label htmlFor="availability-date" className="text-sm font-medium text-gray-700">
          Pick a date
        </label>
        <input
          id="availability-date"
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={handleDateChange}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          min={format(new Date(), 'yyyy-MM-dd')}
        />
      </div>

      {isLoading ? (
        <div className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600">
          Loading availability...
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-gray-800">
            Available time slots for {format(selectedDate, 'MMMM d, yyyy')}
          </h3>

          {availableSlots.length === 0 ? (
            <p className="text-sm text-gray-600">No available time slots for this day.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {availableSlots.map((slot, index) => (
                <button
                  key={`${slot.start}-${slot.end}-${index}`}
                  type="button"
                  onClick={() => onSelectSlot(selectedDate, slot.start, slot.end)}
                  className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-100"
                >
                  {slot.start} - {slot.end}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}