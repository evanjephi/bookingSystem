'use client';

import { useState, useMemo, useEffect } from 'react';
import { Client, ClientBooking } from '@/types';
import { formatLocalDate, toLocalDate } from '@/lib/dateUtils';
import { Clock, Calendar, AlertCircle, X, Edit2, ArrowRight, Home, Plus } from 'lucide-react';
import CalendarView from './CalendarView';
import BookWithWorkerInput from './BookWithWorkerInput';
import WorkerListSidebar from './WorkerListSidebar';

interface ClientDashboardProps {
  client: Client | null;
  onBack: () => void;
}

type ViewType = 'overview' | 'calendar' | 'list';

export default function ClientDashboard({ client, onBack }: ClientDashboardProps) {
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('overview');
  const [selectedBooking, setSelectedBooking] = useState<ClientBooking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [actionType, setActionType] = useState<'view' | 'cancel' | 'reschedule' | 'request-changes'>('view');
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Get next upcoming booking - call useMemo unconditionally
  const nextBooking = useMemo(() => {
    if (!bookings || bookings.length === 0) return null;
    const now = new Date();
    const upcoming = bookings
      .filter(b => {
        const bookingDate = toLocalDate(b.date);
        return bookingDate >= now && (b.status === 'confirmed' || b.status === 'pending');
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return upcoming[0] || null;
  }, [bookings]);

  // Fetch client bookings - call useEffect unconditionally
  useEffect(() => {
    if (!client) {
      setBookings([]);
      return;
    }

    const fetchBookings = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/bookings-get?role=client&clientId=${client.id}`);
        if (res.ok) {
          const data = await res.json();
          setBookings(data.bookings || []);
        }
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [client]);

  // Handle booking actions
  const handleBookingAction = (booking: ClientBooking, action: typeof actionType) => {
    setSelectedBooking(booking);
    setActionType(action);
    setShowDetailsModal(true);
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    try {
      setCancelling(true);
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookings: [
            {
              id: selectedBooking.id,
              status: 'cancelled',
              cancellationReason,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        alert('Failed to cancel booking. Please try again.');
        return;
      }

      // Successfully cancelled - remove from view
      setBookings(bookings.filter(b => b.id !== selectedBooking.id));
      setShowDetailsModal(false);
      setSelectedBooking(null);
      setCancellationReason('');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Error cancelling booking. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handleRescheduleBooking = async () => {
    if (!selectedBooking || !newDate || !newStartTime || !newEndTime) return;

    try {
      setRescheduling(true);
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookings: [
            {
              id: selectedBooking.id,
              date: newDate,
              startTime: newStartTime,
              endTime: newEndTime,
              status: 'pending', // Reset to pending after reschedule
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        alert('Failed to reschedule booking. Please try again.');
        return;
      }

      // Successfully rescheduled - update local state
      setBookings(
        bookings.map(b =>
          b.id === selectedBooking.id
            ? ({
                ...b,
                date: newDate as any,
                startTime: newStartTime,
                endTime: newEndTime,
                status: 'pending',
              } as ClientBooking)
            : b
        )
      );
      setShowDetailsModal(false);
      setSelectedBooking(null);
      setNewDate('');
      setNewStartTime('');
      setNewEndTime('');
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      alert('Error rescheduling booking. Please try again.');
    } finally {
      setRescheduling(false);
    }
  };

  if (!client) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg mb-4">No client selected</p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-2 rounded-lg transition"
          >
            <Home className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <button
              onClick={onBack}
              className="mb-4 inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </button>

            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome, {client.firstName}!
              </h1>
              <p className="text-white/70">
                {client.location} • Age {client.age}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowBookingModal(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-lg transition font-semibold h-fit"
          >
            <Plus className="h-5 w-5" />
            New Booking
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-8">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-sm text-white/60 mb-1">Total Bookings</p>
            <p className="text-2xl font-bold text-emerald-300">{bookings.length}</p>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
            <p className="text-sm text-white/60 mb-1">Confirmed</p>
            <p className="text-2xl font-bold text-blue-300">
              {bookings.filter(b => b.status === 'confirmed').length}
            </p>
          </div>
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
            <p className="text-sm text-white/60 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-300">
              {bookings.filter(b => b.status === 'pending').length}
            </p>
          </div>
          <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
            <p className="text-sm text-white/60 mb-1">Completed</p>
            <p className="text-2xl font-bold text-purple-300">
              {bookings.filter(b => b.status === 'completed').length}
            </p>
          </div>
        </div>

        {/* Next Upcoming Booking */}
        {nextBooking && (
          <div className="mb-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-emerald-300 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Next Upcoming Booking
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-300 text-xs font-semibold">
                {nextBooking.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-white/60 text-sm">PSW Worker</p>
                  <p className="text-lg font-semibold text-white">{nextBooking.pswWorkerName}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Date & Time</p>
                  <p className="text-lg font-semibold text-white">
                    {formatLocalDate(toLocalDate(nextBooking.date))}
                  </p>
                  <p className="text-sm text-white/70">
                    {nextBooking.startTime} - {nextBooking.endTime}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-white/60 text-sm">Service Level</p>
                  <p className="text-lg font-semibold text-white capitalize">
                    {nextBooking.serviceLevel}
                  </p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Price</p>
                  <p className="text-lg font-semibold text-white">
                    ${nextBooking.price?.toFixed(2) || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3 flex-wrap">
              <button
                onClick={() => handleBookingAction(nextBooking, 'view')}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition"
              >
                <Calendar className="h-4 w-4" />
                View Details
              </button>
              {nextBooking.status === 'confirmed' && (
                <>
                  <button
                    onClick={() => handleBookingAction(nextBooking, 'reschedule')}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
                  >
                    <Edit2 className="h-4 w-4" />
                    Reschedule
                  </button>
                  <button
                    onClick={() => handleBookingAction(nextBooking, 'cancel')}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* View Toggle */}
        <div className="mb-6 flex gap-2 border-b border-white/10">
          <button
            onClick={() => setViewType('overview')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
              viewType === 'overview'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Bookings List
          </button>
          <button
            onClick={() => setViewType('calendar')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
              viewType === 'calendar'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Calendar View
          </button>
        </div>

        {/* Bookings List View */}
        {viewType === 'overview' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-white/50">Loading bookings...</div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/60 mb-4">No bookings yet</p>
                <button 
                  onClick={() => setShowBookingModal(true)}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-6 py-2 rounded-lg transition"
                >
                  <ArrowRight className="h-4 w-4" />
                  Book a PSW Worker
                </button>
              </div>
            ) : (
              bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {booking.pswWorkerName}
                      </h3>
                      <p className="text-white/70 text-sm">
                        {formatLocalDate(toLocalDate(booking.date))} •{' '}
                        {booking.startTime}-{booking.endTime}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        booking.status === 'confirmed'
                          ? 'bg-green-500/20 text-green-300'
                          : booking.status === 'completed'
                          ? 'bg-blue-500/20 text-blue-300'
                          : booking.status === 'cancelled'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-yellow-500/20 text-yellow-300'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-white/10">
                    <div>
                      <p className="text-xs text-white/60 uppercase mb-1">Service</p>
                      <p className="text-sm font-semibold text-white capitalize">
                        {booking.serviceLevel}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60 uppercase mb-1">Price</p>
                      <p className="text-sm font-semibold text-white">
                        ${booking.price?.toFixed(2) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60 uppercase mb-1">Requested</p>
                      <p className="text-sm font-semibold text-white">
                        {booking.requestedAt
                          ? formatLocalDate(toLocalDate(booking.requestedAt))
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60 uppercase mb-1">Confirmed</p>
                      <p className="text-sm font-semibold text-white">
                        {booking.confirmedAt
                          ? formatLocalDate(toLocalDate(booking.confirmedAt))
                          : 'Pending'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleBookingAction(booking, 'view')}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded text-sm transition"
                    >
                      <Calendar className="h-4 w-4" />
                      Details
                    </button>
                    {(booking.status === 'confirmed' || booking.status === 'pending') && (
                      <>
                        <button
                          onClick={() => handleBookingAction(booking, 'reschedule')}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm transition"
                        >
                          <Edit2 className="h-4 w-4" />
                          Reschedule
                        </button>
                        <button
                          onClick={() => handleBookingAction(booking, 'cancel')}
                          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm transition"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Calendar View */}
        {viewType === 'calendar' && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <CalendarView
              timeSlots={bookings.map(b => ({
                id: b.id,
                userId: client?.id || 'client',
                date: toLocalDate(b.date),
                startTime: b.startTime,
                endTime: b.endTime,
                title: b.pswWorkerName,
                attendees: [client?.id || 'client'],
                description: `${b.serviceLevel} - $${b.price}`,
              }))}
              month={selectedMonth}
              year={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />
          </div>
        )}

        {/* Booking Details Modal */}
        {showDetailsModal && selectedBooking && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/10">
              {actionType === 'cancel' ? (
                <div className="p-6 space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">Cancel Booking</h2>
                    <p className="text-white/70 text-sm">
                      Are you sure you want to cancel this booking with {selectedBooking.pswWorkerName}?
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Reason for cancellation (optional)
                    </label>
                    <textarea
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Enter reason..."
                      className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition"
                    >
                      Keep Booking
                    </button>
                    <button
                      onClick={handleCancelBooking}
                      disabled={cancelling}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition"
                    >
                      {cancelling ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                  </div>
                </div>
              ) : actionType === 'reschedule' ? (
                <div className="p-6 space-y-6">
                  <h2 className="text-xl font-bold text-white">Reschedule Booking</h2>
                  <p className="text-white/70 text-sm">
                    Currently scheduled for {formatLocalDate(toLocalDate(selectedBooking.date))} at{' '}
                    {selectedBooking.startTime}
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        New Date
                      </label>
                      <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={newStartTime}
                          onChange={(e) => setNewStartTime(e.target.value)}
                          className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={newEndTime}
                          onChange={(e) => setNewEndTime(e.target.value)}
                          className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <p className="text-xs text-blue-200">
                        ℹ️ Rescheduling will set the booking status to pending. The PSW worker will need to confirm the new time.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRescheduleBooking}
                      disabled={rescheduling || !newDate || !newStartTime || !newEndTime}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition"
                    >
                      {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  <h2 className="text-xl font-bold text-white">Booking Details</h2>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-white/60 uppercase mb-1">PSW Worker</p>
                      <p className="text-lg font-semibold text-white">
                        {selectedBooking.pswWorkerName}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-white/60 uppercase mb-1">Date</p>
                        <p className="text-sm font-semibold text-white">
                          {formatLocalDate(toLocalDate(selectedBooking.date))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60 uppercase mb-1">Time</p>
                        <p className="text-sm font-semibold text-white">
                          {selectedBooking.startTime}-{selectedBooking.endTime}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-white/60 uppercase mb-1">Status</p>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          selectedBooking.status === 'confirmed'
                            ? 'bg-green-500/20 text-green-300'
                            : selectedBooking.status === 'completed'
                            ? 'bg-blue-500/20 text-blue-300'
                            : selectedBooking.status === 'cancelled'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}
                      >
                        {selectedBooking.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-white/60 uppercase mb-1">Service Level</p>
                        <p className="text-sm font-semibold text-white capitalize">
                          {selectedBooking.serviceLevel}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60 uppercase mb-1">Price</p>
                        <p className="text-sm font-semibold text-white">
                          ${selectedBooking.price?.toFixed(2) || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {selectedBooking.recurringPattern && (
                      <div>
                        <p className="text-xs text-white/60 uppercase mb-1">Recurring</p>
                        <p className="text-sm font-semibold text-white capitalize">
                          {selectedBooking.recurringPattern.frequency}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Booking Modal */}
        {showBookingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden border border-white/10 flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between flex-shrink-0 bg-slate-900">
                <h2 className="text-2xl font-bold text-white">Book a PSW Worker</h2>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="text-white/60 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Content - Two Column Layout */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Column - Booking Form */}
                <div className="flex-1 overflow-y-auto p-6 border-r border-white/10">
                  <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                    <p className="text-sm text-emerald-200">
                      <strong>Booking for:</strong> {client?.firstName} {client?.lastName}
                    </p>
                    <p className="text-sm text-emerald-200/70">
                      Location: {client?.location}
                    </p>
                  </div>

                  <BookWithWorkerInput
                    selectedClient={client}
                    onBookingSuccess={() => {
                      setShowBookingModal(false);
                      // Refresh bookings
                      if (client) {
                        fetch(`/api/bookings-get?role=client&clientId=${client.id}`)
                          .then(res => res.json())
                          .then(data => setBookings(data.bookings || []))
                          .catch(err => console.error('Error refreshing bookings:', err));
                      }
                    }}
                    sessionRole="client"
                    sessionClientId={client?.id}
                  />
                </div>

                {/* Right Column - Available Workers */}
                <div className="w-80 overflow-y-auto p-6 bg-slate-950/50">
                  <h3 className="text-lg font-semibold text-white mb-4">Available Workers</h3>
                  <WorkerListSidebar client={client} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
