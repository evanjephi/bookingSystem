'use client';

import { TimeSlot } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { isSameDay, toLocalDate } from '@/lib/dateUtils';

interface CalendarViewProps {
  timeSlots: TimeSlot[];
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onDateClick?: (date: Date, slots: TimeSlot[]) => void;
}

export default function CalendarView({
  timeSlots,
  month,
  year,
  onMonthChange,
  onYearChange,
  onDateClick,
}: CalendarViewProps) {
  const monthNames = [
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

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [daysInMonth, firstDayOfMonth]);

  const getSlotsByDate = (day: number) => {
    const date = new Date(year, month - 1, day);
    return timeSlots.filter((slot) => {
      const slotDate = toLocalDate(slot.date);
      return isSameDay(slotDate, date);
    });
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      onYearChange(year - 1);
      onMonthChange(12);
    } else {
      onMonthChange(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onYearChange(year + 1);
      onMonthChange(1);
    } else {
      onMonthChange(month + 1);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-lg">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">
          {monthNames[month - 1]} {year}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrevMonth}
            className="rounded-lg border border-gray-300 p-2 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={handleNextMonth}
            className="rounded-lg border border-gray-300 p-2 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="mb-2 grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-2 text-center font-semibold text-gray-600">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, index) => {
          const slots = day ? getSlotsByDate(day) : [];
          const isToday =
            day &&
            new Date(year, month - 1, day).toDateString() === new Date().toDateString();

          return (
            <div
              key={index}
              className={`min-h-24 rounded-lg border p-2 ${
                day
                  ? isToday
                    ? 'border-indigo-500 bg-indigo-50'
                    : slots.length > 0
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  : 'bg-gray-100'
              }`}
              onClick={() => {
                if (day) {
                  const date = new Date(year, month - 1, day);
                  onDateClick?.(date, slots);
                }
              }}
            >
              {day && (
                <>
                  <p
                    className={`mb-1 text-right text-sm font-semibold ${
                      isToday ? 'text-indigo-600' : 'text-gray-600'
                    }`}
                  >
                    {day}
                  </p>
                  {slots.length > 0 && (
                    <div className="space-y-1 text-xs">
                      {slots.slice(0, 2).map((slot) => {
                        const tooltipText = ('workerName' in slot) && ('clientName' in slot)
                          ? `P: ${(slot as any).workerName} - C: ${(slot as any).clientName} (${slot.startTime}-${slot.endTime})`
                          : slot.title
                          ? `${slot.title} (${slot.startTime}-${slot.endTime})`
                          : `${slot.startTime}-${slot.endTime}`;
                        return (
                          <div
                            key={slot.id}
                            className="truncate rounded bg-indigo-200 px-1 py-0.5 text-indigo-800"
                            title={tooltipText}
                          >
                            {slot.startTime}
                          </div>
                        );
                      })}
                      {slots.length > 2 && (
                        <p className="text-gray-600">+{slots.length - 2} more</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border border-indigo-500 bg-indigo-50"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border border-green-300 bg-green-50"></div>
          <span>Has Bookings</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border border-gray-200 bg-gray-50"></div>
          <span>Available</span>
        </div>
      </div>
    </div>
  );
}
