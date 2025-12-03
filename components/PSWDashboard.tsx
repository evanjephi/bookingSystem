'use client';

import { useState, useMemo, useEffect } from 'react';
import { PSWWorker, WorkerBooking } from '@/types';
import { formatLocalDate, toLocalDate } from '@/lib/dateUtils';
import { Clock, Calendar, AlertCircle, X, Check, Home, Briefcase, Users } from 'lucide-react';

interface PSWDashboardProps {
  worker: PSWWorker | null;
  onBack: () => void;
}

type ViewType = 'overview' | 'calendar' | 'requests';

export default function PSWDashboard({ worker, onBack }: PSWDashboardProps) {
  const [bookings, setBookings] = useState<WorkerBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('overview');
  const [selectedBooking, setSelectedBooking] = useState<WorkerBooking | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'confirm' | 'decline' | 'cancel'>('confirm');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch worker bookings
  useEffect(() => {
    if (!worker) {
      setBookings([]);
      return;
    }

    const fetchBookings = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/bookings-get?role=worker&workerId=${worker.id}`);
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
  }, [worker]);

  // Get pending requests (pending status)
  const pendingRequests = useMemo(() => {
    return bookings.filter(b => b.status === 'pending');
  }, [bookings]);

  // Get confirmed bookings
  const confirmedBookings = useMemo(() => {
    return bookings.filter(b => b.status === 'confirmed');
  }, [bookings]);

  // Get next upcoming booking
  const nextBooking = useMemo(() => {
    if (!confirmedBookings || confirmedBookings.length === 0) return null;
    const now = new Date();
    const upcoming = confirmedBookings
      .filter(b => {
        const bookingDate = toLocalDate(b.date);
        return bookingDate >= now;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return upcoming[0] || null;
  }, [confirmedBookings]);

  // Get unique clients
  const uniqueClients = useMemo(() => {
    const clients = new Set(bookings.map(b => b.clientName));
    return clients.size;
  }, [bookings]);

  // Handle booking actions
  const handleBookingAction = (booking: WorkerBooking, action: typeof actionType) => {
    setSelectedBooking(booking);
    setActionType(action);
    setShowActionModal(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedBooking) return;

    try {
      setProcessingId(selectedBooking.id);
      let newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';
      
      if (actionType === 'decline') {
        newStatus = 'rejected';
      } else if (actionType === 'cancel') {
        newStatus = 'cancelled';
      } else {
        newStatus = 'confirmed';
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookings: [
            {
              id: selectedBooking.id,
              status: newStatus,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        alert(`Failed to ${actionType} booking. Please try again.`);
        return;
      }

      // Update local state
      setBookings(
        bookings.map(b =>
          b.id === selectedBooking.id ? { ...b, status: newStatus } : b
        )
      );
      setShowActionModal(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Error updating booking. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  if (!worker) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg mb-4">No worker selected</p>
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
              className="mb-4 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </button>

            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome, {worker.firstName}!
              </h1>
              <p className="text-white/70">
                {worker.location} • ${worker.hourlyRate}/hour
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-8">
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
            <p className="text-sm text-white/60 mb-1">Total Bookings</p>
            <p className="text-2xl font-bold text-blue-300">{bookings.length}</p>
          </div>
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
            <p className="text-sm text-white/60 mb-1">Confirmed</p>
            <p className="text-2xl font-bold text-green-300">{confirmedBookings.length}</p>
          </div>
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
            <p className="text-sm text-white/60 mb-1">Pending Requests</p>
            <p className="text-2xl font-bold text-yellow-300">{pendingRequests.length}</p>
          </div>
          <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
            <p className="text-sm text-white/60 mb-1">Unique Clients</p>
            <p className="text-2xl font-bold text-purple-300">{uniqueClients}</p>
          </div>
        </div>

        {/* Next Upcoming Booking */}
        {nextBooking && (
          <div className="mb-8 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-blue-300 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Next Confirmed Booking
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-green-500/30 text-green-300 text-xs font-semibold">
                Confirmed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-white/60 text-sm">Client</p>
                  <p className="text-lg font-semibold text-white">{nextBooking.clientName}</p>
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
                onClick={() => handleBookingAction(nextBooking, 'cancel')}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition"
              >
                <X className="h-4 w-4" />
                Cancel Booking
              </button>
            </div>
          </div>
        )}

        {/* View Toggle */}
        <div className="mb-6 flex gap-2 border-b border-white/10">
          <button
            onClick={() => setViewType('overview')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
              viewType === 'overview'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            All Bookings
          </button>
          <button
            onClick={() => setViewType('requests')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
              viewType === 'requests'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Pending Requests ({pendingRequests.length})
          </button>
          <button
            onClick={() => setViewType('calendar')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
              viewType === 'calendar'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Confirmed Bookings ({confirmedBookings.length})
          </button>
        </div>

        {/* All Bookings View */}
        {viewType === 'overview' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-white/50">Loading bookings...</div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/60 mb-4">No bookings yet</p>
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
                        {booking.clientName}
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
                          : (booking.status === 'cancelled' || booking.status === 'rejected')
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
                    {booking.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleBookingAction(booking, 'confirm')}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-sm transition"
                        >
                          <Check className="h-4 w-4" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleBookingAction(booking, 'decline')}
                          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm transition"
                        >
                          <X className="h-4 w-4" />
                          Decline
                        </button>
                      </>
                    ) : booking.status === 'confirmed' ? (
                      <button
                        onClick={() => handleBookingAction(booking, 'cancel')}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm transition"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pending Requests View */}
        {viewType === 'requests' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-white/50">Loading requests...</div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/60">No pending requests</p>
              </div>
            ) : (
              pendingRequests.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-6 hover:bg-yellow-500/20 transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {booking.clientName}
                      </h3>
                      <p className="text-white/70 text-sm">
                        {formatLocalDate(toLocalDate(booking.date))} •{' '}
                        {booking.startTime}-{booking.endTime}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-yellow-500/30 text-yellow-300 text-xs font-semibold">
                      Pending
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 pb-4 border-b border-white/10">
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
                      <p className="text-xs text-white/60 uppercase mb-1">Duration</p>
                      <p className="text-sm font-semibold text-white">
                        {booking.startTime} - {booking.endTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => handleBookingAction(booking, 'confirm')}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg transition font-semibold"
                      disabled={processingId === booking.id}
                    >
                      <Check className="h-5 w-5" />
                      {processingId === booking.id ? 'Processing...' : 'Accept Request'}
                    </button>
                    <button
                      onClick={() => handleBookingAction(booking, 'decline')}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg transition font-semibold"
                      disabled={processingId === booking.id}
                    >
                      <X className="h-5 w-5" />
                      {processingId === booking.id ? 'Processing...' : 'Decline Request'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Confirmed Bookings View */}
        {viewType === 'calendar' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-white/50">Loading bookings...</div>
            ) : confirmedBookings.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/60">No confirmed bookings yet</p>
              </div>
            ) : (
              confirmedBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-lg border border-green-500/20 bg-green-500/10 p-6 hover:bg-green-500/20 transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {booking.clientName}
                      </h3>
                      <p className="text-white/70 text-sm">
                        {formatLocalDate(toLocalDate(booking.date))} •{' '}
                        {booking.startTime}-{booking.endTime}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-green-500/30 text-green-300 text-xs font-semibold">
                      Confirmed
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
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleBookingAction(booking, 'cancel')}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition text-sm font-semibold"
                  >
                    <X className="h-4 w-4" />
                    Cancel Booking
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Action Modal */}
        {showActionModal && selectedBooking && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-lg max-w-md w-full border border-white/10">
              <div className="p-6">
                {actionType === 'confirm' ? (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white">Accept Booking Request?</h2>
                    <div className="bg-white/5 rounded-lg p-4 space-y-2">
                      <p className="text-sm text-white/70">
                        <strong>Client:</strong> {selectedBooking.clientName}
                      </p>
                      <p className="text-sm text-white/70">
                        <strong>Date:</strong> {formatLocalDate(toLocalDate(selectedBooking.date))}
                      </p>
                      <p className="text-sm text-white/70">
                        <strong>Time:</strong> {selectedBooking.startTime} - {selectedBooking.endTime}
                      </p>
                      <p className="text-sm text-white/70">
                        <strong>Price:</strong> ${selectedBooking.price?.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowActionModal(false)}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmAction}
                        disabled={processingId === selectedBooking.id}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition font-semibold"
                      >
                        {processingId === selectedBooking.id ? 'Processing...' : 'Accept'}
                      </button>
                    </div>
                  </div>
                ) : actionType === 'decline' ? (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white">Decline Booking Request?</h2>
                    <div className="bg-white/5 rounded-lg p-4 space-y-2">
                      <p className="text-sm text-white/70">
                        <strong>Client:</strong> {selectedBooking.clientName}
                      </p>
                      <p className="text-sm text-white/70">
                        <strong>Date:</strong> {formatLocalDate(toLocalDate(selectedBooking.date))}
                      </p>
                      <p className="text-sm text-white/70">
                        <strong>Time:</strong> {selectedBooking.startTime} - {selectedBooking.endTime}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowActionModal(false)}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition"
                      >
                        Keep It
                      </button>
                      <button
                        onClick={handleConfirmAction}
                        disabled={processingId === selectedBooking.id}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition font-semibold"
                      >
                        {processingId === selectedBooking.id ? 'Processing...' : 'Decline'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white">Cancel Booking?</h2>
                    <div className="bg-white/5 rounded-lg p-4 space-y-2">
                      <p className="text-sm text-white/70">
                        <strong>Client:</strong> {selectedBooking.clientName}
                      </p>
                      <p className="text-sm text-white/70">
                        <strong>Date:</strong> {formatLocalDate(toLocalDate(selectedBooking.date))}
                      </p>
                      <p className="text-sm text-white/70">
                        <strong>Time:</strong> {selectedBooking.startTime} - {selectedBooking.endTime}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowActionModal(false)}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition"
                      >
                        Keep It
                      </button>
                      <button
                        onClick={handleConfirmAction}
                        disabled={processingId === selectedBooking.id}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition font-semibold"
                      >
                        {processingId === selectedBooking.id ? 'Processing...' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
