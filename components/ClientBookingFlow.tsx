// components/ClientBookingFlow.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { PSWWorker, Client, ServiceLevel, RecurringPattern } from '@/types';
import {X, Calendar, Clock, Check, AlertCircle, RefreshCcw } from 'lucide-react';
import { formatLocalDate, toLocalDate } from '@/lib/dateUtils';

interface ClientBookingFlowProps {
  worker: PSWWorker | null;
  clients: Client[];
  initialClient?: Client | null;
  onBookingComplete: () => void;
  onCancel: () => void;
  onClose: () => void;
  sessionRole: 'admin' | 'worker' | 'client';
  sessionClientId?: string | null;
  sessionWorkerId?: string | null;
}

export default function ClientBookingFlow({
  worker,
  clients,
  initialClient,
  onBookingComplete,
  onCancel,
  onClose,
  sessionRole,
  sessionClientId,
  sessionWorkerId,
}: ClientBookingFlowProps) {
  const [step, setStep] = useState<'select-client' | 'select-date-time' | 'confirm'>(initialClient ? 'select-date-time' : 'select-client');
  const [selectedClient, setSelectedClient] = useState<Client | null>(initialClient ?? null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [serviceLevel, setServiceLevel] = useState<ServiceLevel>('basic');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurringPattern['frequency']>('weekly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serviceLevelMultipliers: Record<ServiceLevel, number> = useMemo(() => ({
    basic: 1,
    enhanced: 1.2,
    premium: 1.4,
  }), []);

  useEffect(() => {
    if (worker?.serviceLevels?.length) {
      setServiceLevel(worker.serviceLevels[0]);
    } else {
      setServiceLevel('basic');
    }
  }, [worker]);

  useEffect(() => {
    if (initialClient) {
      setSelectedClient(initialClient);
      setStep('select-date-time');
    } else {
      setSelectedClient(null);
      setStep('select-client');
    }
  }, [initialClient?.id]);

  useEffect(() => {
    if (!isRecurring) {
      setRecurrenceDaysOfWeek([]);
      setRecurrenceEndDate('');
    }
  }, [isRecurring]);

  if (!worker) return null;

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setStep('select-date-time');
    setError(null);
  };

  const handleAddDate = (date: string) => {
    if (!selectedDates.includes(date)) {
      if (isRecurring) {
        setSelectedDates([date]);
      } else {
        setSelectedDates([...selectedDates, date]);
      }
    }
  };

  const handleRemoveDate = (date: string) => {
    setSelectedDates(selectedDates.filter((d) => d !== date));
  };

  const handleProceedToConfirm = () => {
    if (selectedDates.length === 0) {
      setError('Please select at least one date');
      return;
    }

    if (isRecurring && !recurrenceEndDate) {
      setError('Please choose an end date for the recurring series.');
      return;
    }

    if (isRecurring && recurrenceEndDate) {
      const start = toLocalDate(selectedDates[0]);
      const end = toLocalDate(recurrenceEndDate);
      if (end < start) {
        setError('Recurring series end date must be after the first selected date.');
        return;
      }
    }

    if (
      isRecurring &&
      (recurrenceFrequency === 'weekly' || recurrenceFrequency === 'biweekly') &&
      recurrenceDaysOfWeek.length === 0
    ) {
      setError('Select at least one weekday for the recurring pattern.');
      return;
    }
    setStep('confirm');
    setError(null);
  };

  const buildRecurringPattern = (): RecurringPattern | undefined => {
    if (!isRecurring || selectedDates.length === 0) return undefined;

    const startDate = toLocalDate(selectedDates[0]);
    const endDate = recurrenceEndDate ? toLocalDate(recurrenceEndDate) : startDate;

    return {
      frequency: recurrenceFrequency,
      startDate,
      endDate,
      daysOfWeek:
        recurrenceFrequency === 'monthly'
          ? undefined
          : recurrenceDaysOfWeek.length > 0
            ? recurrenceDaysOfWeek
            : [startDate.getDay()],
    };
  };

  const handleConfirmBooking = async () => {
    if (!selectedClient || selectedDates.length === 0) {
      setError('Invalid booking data');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create bookings for each date
      const recurrence = buildRecurringPattern();

      const makeBookingPayload = (date: string) => {
        const dateStr = formatLocalDate(toLocalDate(date));
        const timeStr = startTime.replace(':', '-');
        const bookingId = `${dateStr}_${timeStr}_${worker.id}`;

        return {
          id: bookingId,
          clientId: selectedClient.id,
          clientName: `${selectedClient.firstName} ${selectedClient.lastName}`,
          pswWorkerId: worker.id,
          pswWorkerName: `${worker.firstName} ${worker.lastName}`,
          date: dateStr,
          startTime,
          endTime,
          serviceLevel,
          status: 'pending' as const,
          createdAt: new Date(),
          ...(recurrence ? { recurringPattern: recurrence } : {}),
        };
      };

      const bookings = recurrence
        ? [makeBookingPayload(selectedDates[0])]
        : selectedDates.map((date) => makeBookingPayload(date));

      // Save to Firebase (POST to a new endpoint or update existing bookings)
      const params = new URLSearchParams();
      params.set('role', sessionRole);
      if (sessionClientId) params.set('clientId', sessionClientId);
      if (sessionWorkerId) params.set('workerId', sessionWorkerId);
      const endpoint = `/api/bookings?${params.toString()}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookings }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create bookings');
      }

      // Also update the client's booking list (optional - if you have a dedicated endpoint)
      // And update the PSW worker's booking list

      onBookingComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Select Client
  if (step === 'select-client') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-8 shadow-2xl">

          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 hover:bg-gray-100 transition-colors"
            aria-label="Close booking flow"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Select Client</h2>
          <p className="mt-2 text-gray-600">
            Booking for: <strong>{worker.firstName} {worker.lastName}</strong>
          </p>

          <div className="mt-6 space-y-3">
            {clients.length === 0 ? (
              <p className="text-gray-600">No clients available</p>
            ) : (
              clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-left hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                >
                  <p className="font-semibold text-gray-800">
                    {client.firstName} {client.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{client.location}</p>
                  <p className="text-xs text-gray-500">Age: {client.age}</p>
                </button>
              ))
            )}
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={onCancel}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Select Date & Time
  if (step === 'select-date-time') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-8 shadow-2xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 hover:bg-gray-100 transition-colors"
            aria-label="Close booking flow"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Select Dates & Time</h2>
          <p className="mt-2 text-gray-600">
            Client: <strong>{selectedClient?.firstName} {selectedClient?.lastName}</strong>
          </p>

          <div className="mt-6 space-y-4">
            {/* Time Selection */}
            <div className="rounded-lg bg-gray-50 p-4">
              <label className="block text-sm font-semibold text-gray-700">
                <Clock className="mb-2 inline-block h-4 w-4" /> Time Slot
              </label>
              <div className="mt-3 flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div className="rounded-lg bg-gray-50 p-4">
              <label className="block text-sm font-semibold text-gray-700">
                <Calendar className="mb-2 inline-block h-4 w-4" /> Select Dates
              </label>
              <input
                type="date"
                multiple
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddDate(e.target.value);
                  }
                }}
                className="mt-3 w-full rounded border border-gray-300 px-3 py-2"
              />

              {/* Selected Dates */}
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700">Selected Dates:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedDates.length === 0 ? (
                    <p className="text-xs text-gray-500">No dates selected</p>
                  ) : (
                    selectedDates.map((date) => (
                      <div
                        key={date}
                        className="flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-700"
                      >
                        {toLocalDate(date).toLocaleDateString()}
                        <button
                          onClick={() => handleRemoveDate(date)}
                          className="font-bold text-indigo-700 hover:text-indigo-900"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Service Level */}
            <div className="rounded-lg bg-gray-50 p-4">
              <label className="block text-sm font-semibold text-gray-700">
                Service Level
              </label>
              <select
                value={serviceLevel}
                onChange={(e) => setServiceLevel(e.target.value as ServiceLevel)}
                className="mt-3 w-full rounded border border-gray-300 px-3 py-2 capitalize"
              >
                {(worker.serviceLevels?.length ? worker.serviceLevels : (['basic', 'enhanced', 'premium'] as ServiceLevel[])).map((level) => (
                  <option key={level} value={level} className="capitalize">
                    {level}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                Choose a tier to reflect care intensity and pricing.
              </p>
            </div>

            {/* Recurrence */}
            <div className="rounded-lg bg-gray-50 p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <RefreshCcw className="h-4 w-4" /> Recurring Booking
                <input
                  type="checkbox"
                  className="ml-auto h-4 w-4"
                  checked={isRecurring}
                  onChange={(e) => {
                    setIsRecurring(e.target.checked);
                    if (!e.target.checked) {
                      setRecurrenceEndDate('');
                    }
                  }}
                />
              </label>

              {isRecurring && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs text-gray-600">Frequency</label>
                    <select
                      value={recurrenceFrequency}
                      onChange={(e) => setRecurrenceFrequency(e.target.value as RecurringPattern['frequency'])}
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  {(recurrenceFrequency === 'weekly' || recurrenceFrequency === 'biweekly') && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-2">Days of Week</label>
                      <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((label, idx) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              setRecurrenceDaysOfWeek((prev) =>
                                prev.includes(idx)
                                  ? prev.filter((d) => d !== idx)
                                  : [...prev, idx]
                              );
                            }}
                            className={`rounded-full border px-3 py-1 ${recurrenceDaysOfWeek.includes(idx) ? 'border-indigo-600 bg-indigo-100 text-indigo-700' : 'border-gray-300 text-gray-600'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-gray-600">Series End Date</label>
                    <input
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                    />
                  </div>

                  <p className="text-xs text-gray-500">
                    Recurring bookings will auto-expand when submitted. Make sure the first date represents the start of the series.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 flex gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => {
                setStep('select-client');
                setError(null);
              }}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleProceedToConfirm}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              disabled={selectedDates.length === 0}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Confirm Booking
  if (step === 'confirm') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-8 shadow-2xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 hover:bg-gray-100 transition-colors"
            aria-label="Close booking flow"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Confirm Booking</h2>

          {/* Summary */}
          <div className="mt-6 space-y-4">
            {/* Worker Info */}
            <div className="rounded-lg bg-indigo-50 p-4 border border-indigo-200">
              <p className="font-semibold text-indigo-900">PSW Worker</p>
              <p className="text-indigo-800">
                {worker.firstName} {worker.lastName}
              </p>
              <p className="text-sm text-indigo-700">${worker.hourlyRate}/hour</p>
              <p className="text-xs text-indigo-600 mt-1 capitalize">Service Level: {serviceLevel}</p>
            </div>

            {/* Client Info */}
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
              <p className="font-semibold text-blue-900">Client</p>
              <p className="text-blue-800">
                {selectedClient?.firstName} {selectedClient?.lastName}
              </p>
            </div>

            {/* Booking Details */}
            <div className="rounded-lg bg-green-50 p-4 border border-green-200">
              <p className="font-semibold text-green-900">Booking Details</p>
              <p className="text-green-800 mt-2">
                <strong>Time:</strong> {startTime} - {endTime}
              </p>
              <p className="text-green-800">
                <strong>{isRecurring ? 'Series starts' : 'Dates'}:</strong> {selectedDates.length} day(s)
              </p>
              {selectedDates.length <= 5 ? (
                <ul className="mt-2 ml-4 text-green-800">
                  {selectedDates.map((date) => (
                    <li key={date}>{toLocalDate(date).toLocaleDateString()}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-green-700 mt-2">
                  From {toLocalDate(selectedDates[0]).toLocaleDateString()} to{' '}
                  {toLocalDate(selectedDates[selectedDates.length - 1]).toLocaleDateString()}
                </p>
              )}
              {isRecurring && (
                <div className="mt-2 text-xs text-green-700">
                  <p>Repeats: {recurrenceFrequency}</p>
                  {recurrenceEndDate && <p>Ends: {toLocalDate(recurrenceEndDate).toLocaleDateString()}</p>}
                </div>
              )}
            </div>

            {/* Cost Estimate */}
            <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
              <p className="font-semibold text-yellow-900">Estimated Cost</p>
              <p className="text-xl font-bold text-yellow-800 mt-2">
                {(() => {
                  const durationHours = Math.max(
                    (new Date(`1970-01-01T${endTime}:00`).getTime() - new Date(`1970-01-01T${startTime}:00`).getTime()) /
                      (1000 * 60 * 60),
                    0
                  );
                  const multiplier = serviceLevelMultipliers[serviceLevel] ?? 1;
                  const sessions = isRecurring ? 1 : selectedDates.length;
                  return `$${(worker.hourlyRate * durationHours * multiplier * sessions).toFixed(2)}`;
                })()}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Includes service-tier multiplier ({serviceLevel}). Recurring series will be priced per occurrence.
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 flex gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => {
                setStep('select-date-time');
                setError(null);
              }}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Back
            </button>
            <button
              onClick={handleConfirmBooking}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? 'Processing...' : <><Check className="h-4 w-4" /> Confirm & Book</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
