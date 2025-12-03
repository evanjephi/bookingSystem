'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
//import NaturalLanguageInput from '@/components/NaturalLanguageInput';
import CalendarView from '@/components/CalendarView';
import BookingSummary from '@/components/BookingSummary';
import BookingDetailsModal from '@/components/BookingDetailsModal';
//import UserList from '@/components/UserList';
import WorkerSearchView from '@/components/WorkerSearchView';
import WorkerProfileModal from '@/components/WorkerProfileModal';
import ClientBookingFlow from '@/components/ClientBookingFlow';
import BookWithWorkerInput from '@/components/BookWithWorkerInput';
import ClientDashboard from '@/components/ClientDashboard';
import PSWDashboard from '@/components/PSWDashboard';
import { useCalendarStore } from '@/lib/store';
import { createBookingSlots } from '@/lib/bookingEngine';
import { BookingResult, TimeSlot, PSWWorker, Client } from '@/types';
import { Calendar, Briefcase, Users, BookOpen } from 'lucide-react';
import { toLocalDate } from '@/lib/dateUtils';

type TabType = 'calendar' | 'book-meeting' | 'find-workers' | 'my-bookings';

const extractCityFromAddress = (value?: string | null) => {
  if (!value) return '';
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return value.trim();
  const hasStreetNumber = /^\d/.test(parts[0]);
  if (hasStreetNumber && parts.length > 1) {
    return parts.slice(1).join(', ');
  }
  return value.trim();
};

const normalizeRole = (value: string | null): 'admin' | 'worker' | 'client' => {
  if (!value) return 'client';
  const lower = value.toLowerCase();
  if (lower === 'admin' || lower === 'worker' || lower === 'client') {
    return lower;
  }
  return 'client';
};

export default function Home() {
  const { users, timeSlots, addTimeSlot, setTimeSlots } = useCalendarStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionRole = normalizeRole(searchParams.get('role'));
  const sessionClientId = searchParams.get('clientId');
  const sessionWorkerId = searchParams.get('workerId');
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  
  // Worker search & booking state
  const [selectedWorker, setSelectedWorker] = useState<PSWWorker | null>(null);
  const [showWorkerProfile, setShowWorkerProfile] = useState(false);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [nearbyWorkers, setNearbyWorkers] = useState<PSWWorker[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateSlots, setSelectedDateSlots] = useState<TimeSlot[] | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedWorkerData, setSelectedWorkerData] = useState<PSWWorker | null>(null);
  const [workers, setWorkers] = useState<PSWWorker[]>([]);

  // Fetch clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients');
        if (!res.ok) throw new Error('Failed to fetch clients');
        const data = await res.json();
        setClients(data.clients || []);
      } catch (err) {
        console.warn('Error fetching clients:', err);
      }
    };

    fetchClients();
  }, []);

  // Fetch workers on mount
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const res = await fetch('/api/psw-workers');
        if (!res.ok) throw new Error('Failed to fetch workers');
        const data = await res.json();
        setWorkers(data.workers || []);
      } catch (err) {
        console.warn('Error fetching workers:', err);
      }
    };

    fetchWorkers();
  }, []);

  useEffect(() => {
    if (sessionRole === 'client' && sessionClientId && clients.length > 0) {
      const match = clients.find((client) => client.id === sessionClientId);
      if (match) {
        setSelectedClient(match);
      }
    }
  }, [sessionRole, sessionClientId, clients]);

  useEffect(() => {
    if (sessionRole === 'worker' && sessionWorkerId && workers.length > 0) {
      const match = workers.find((worker) => worker.id === sessionWorkerId);
      if (match) {
        setSelectedWorkerData(match);
      }
    }
  }, [sessionRole, sessionWorkerId, workers]);

  // If client role, show the simplified client dashboard
  if (sessionRole === 'client') {
    return (
      <ClientDashboard
        client={selectedClient}
        onBack={() => router.push('/')}
      />
    );
  }

  // If worker role, show the PSW worker dashboard
  if (sessionRole === 'worker') {
    return (
      <PSWDashboard
        worker={selectedWorkerData}
        onBack={() => router.push('/')}
      />
    );
  }

  // Fetch bookings from Firebase on page load
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const params = new URLSearchParams();
        params.set('role', sessionRole);
        if (sessionClientId) params.set('clientId', sessionClientId);
        if (sessionWorkerId) params.set('workerId', sessionWorkerId);
        const res = await fetch(`/api/bookings-get?${params.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
          console.warn('Failed to fetch bookings:', res.status);
          return;
        }

        const data = await res.json();
        const bookings: TimeSlot[] = data.bookings || [];

        if (bookings.length > 0) {
          // Dates are now stored as YYYY-MM-DD strings - keep them as strings
          // Components will use toLocalDate() when needed for display/comparison
          setTimeSlots(bookings);
        }
      } catch (error) {
        console.warn('Error fetching bookings:', error);
      }
    };

    fetchBookings();
  }, [setTimeSlots, sessionRole, sessionClientId, sessionWorkerId]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchNearbyWorkers = async () => {
      if (!selectedClient?.location) {
        setNearbyWorkers([]);
        setNearbyError(null);
        setNearbyLoading(false);
        return;
      }

      const city = extractCityFromAddress(selectedClient.location);
      if (!city) {
        setNearbyWorkers([]);
        setNearbyError(null);
        setNearbyLoading(false);
        return;
      }

      try {
        setNearbyLoading(true);
        setNearbyError(null);
        const params = new URLSearchParams({
          clientLocation: city,
          matchClientCityOnly: 'true',
        });
        const res = await fetch(`/api/psw-workers?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error('Failed to fetch nearby workers');
        }
        const data = await res.json();
        setNearbyWorkers(data.workers || []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setNearbyError(err instanceof Error ? err.message : 'Unknown error fetching workers');
        setNearbyWorkers([]);
      } finally {
        setNearbyLoading(false);
      }
    };

    fetchNearbyWorkers();

    return () => {
      controller.abort();
    };
  }, [selectedClient?.id, selectedClient?.location]);

  const handleBookingRequest = async (input: string) => {
    setIsLoading(true);
    try {
      // Call server-side AI parser
      const res = await fetch('/api/parse-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      const body = await res.json();

      if (!res.ok) {
        setBookingResult({
          success: false,
          bookings: [],
          message: body.error || 'Failed to parse request. Check API key in .env.local',
        });
        return;
      }

      const parsed = body?.parsed;

      if (!parsed) {
        setBookingResult({
          success: false,
          bookings: [],
          message: 'Failed to parse your request. Please ensure OPENAI_API_KEY or ANTHROPIC_API_KEY is set.',
        });
        return;
      }

      // Create booking slots
      const result = createBookingSlots(parsed, users);

      // Add slots to store if successful
      if (result.success) {
        result.bookings.forEach((slot) => addTimeSlot(slot));

        // Persist bookings server-side (non-blocking)
        try {
          fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookings: result.bookings }),
          }).catch((e) => console.warn('Failed to persist bookings:', e));
        } catch (e) {
          console.warn('Error sending bookings to server:', e);
        }
      }

      setBookingResult(result);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkerSelected = (worker: PSWWorker) => {
    if (!selectedClient) return;
    setSelectedWorker(worker);
    setShowWorkerProfile(true);
  };

  const handleWorkerBook = (worker: PSWWorker) => {
    if (!selectedClient) return;
    setSelectedWorker(worker);
    setShowWorkerProfile(false);
    setShowBookingFlow(true);
  };

  const handleBookingComplete = () => {
    setShowBookingFlow(false);
    setSelectedWorker(null);
    setActiveTab('my-bookings');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-800">Smart Calendar AI</h1>
          <p className="text-lg text-gray-600">
            Book meetings and manage PSW workers
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex flex-wrap gap-2 rounded-lg bg-white p-2 shadow-lg">


          <button
            onClick={() => setActiveTab('book-meeting')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors ${
              activeTab === 'book-meeting'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Briefcase size={18} />
            Book Meeting
          </button>

          <button
            onClick={() => setActiveTab('find-workers')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors ${
              activeTab === 'find-workers'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users size={18} />
            Find PSW Workers
          </button>

          <button
            onClick={() => setActiveTab('my-bookings')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors ${
              activeTab === 'my-bookings'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BookOpen size={18} />
            My Bookings
          </button>
        </div>

        {/* Tab Content */}
        <div className="grid gap-8 md:grid-cols-3">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Show relevant sidebar based on tab */}
              {activeTab === 'book-meeting' && (
                <>
                  <div className="rounded-lg bg-white p-6 shadow-lg">
                    <h3 className="font-semibold text-gray-800 mb-4">Select Client</h3>
                    <select
                      value={selectedClient?.id || ''}
                      onChange={(e) => {
                        const client = clients.find(c => c.id === e.target.value);
                        setSelectedClient(client || null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a client...</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.firstName} {client.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedClient && (
                    <>
                      <div className="rounded-lg bg-white p-6 shadow-lg">
                        <h3 className="font-semibold text-gray-800">Available PSWs in {extractCityFromAddress(selectedClient.location) || 'client city'}</h3>
                        {nearbyLoading && (
                          <p className="mt-2 text-sm text-gray-600">Loading nearby workers...</p>
                        )}
                        {nearbyError && (
                          <p className="mt-2 text-sm text-red-600">{nearbyError}</p>
                        )}
                        {!nearbyLoading && !nearbyError && nearbyWorkers.length === 0 && (
                          <p className="mt-2 text-sm text-gray-600">No PSW workers found in this city yet.</p>
                        )}
                        {!nearbyLoading && !nearbyError && nearbyWorkers.length > 0 && (
                          <div className="mt-4 max-h-64 overflow-y-auto space-y-3">
                            {nearbyWorkers.map((worker) => (
                              <div key={worker.id} className="rounded border border-gray-200 p-3">
                                <div className="flex items-center justify-between text-sm">
                                  <div>
                                    <p className="font-semibold text-gray-800">{worker.firstName} {worker.lastName}</p>
                                    <p className="text-xs text-gray-500">{worker.location}</p>
                                  </div>
                                  <p className="text-xs text-gray-600">${worker.hourlyRate}/hr</p>
                                </div>
                                {worker.availability && worker.availability.length > 0 ? (
                                  <ul className="mt-2 text-xs text-gray-700 space-y-1">
                                    {worker.availability.slice(0, 3).map((slot) => (
                                      <li key={slot.id}>
                                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][slot.dayOfWeek] || 'Day'}: {slot.startTime} - {slot.endTime}
                                      </li>
                                    ))}
                                    {worker.availability.length > 3 && (
                                      <li className="text-[11px] text-gray-500">+{worker.availability.length - 3} more slots</li>
                                    )}
                                  </ul>
                                ) : (
                                  <p className="mt-2 text-xs text-gray-500">Availability not provided.</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg bg-white p-6 shadow-lg">
                        <h3 className="font-semibold text-gray-800 mb-4">Book with Worker</h3>
                        <BookWithWorkerInput 
                          selectedClient={selectedClient}
                          onBookingSuccess={() => {
                            // Refresh bookings after successful booking
                            setActiveTab('my-bookings');
                          }}
                          sessionRole={sessionRole}
                          sessionClientId={sessionClientId ?? selectedClient?.id ?? null}
                          sessionWorkerId={sessionWorkerId}
                        />
                      </div>
                    </>
                  )}

                  {/* <NaturalLanguageInput onSubmit={handleBookingRequest} isLoading={isLoading} /> */}
                  {/* <UserList users={users} /> */}
                </>
              )}

              {activeTab === 'find-workers' && (
                <>
                  <div className="rounded-lg bg-white p-6 shadow-lg">
                    <h3 className="font-semibold text-gray-800 mb-4">Select Client — Booking for:</h3>
                    <select
                      value={selectedClient?.id || ''}
                      onChange={(e) => {
                        const client = clients.find((c) => c.id === e.target.value);
                        setSelectedClient(client || null);
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a client...</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.firstName} {client.lastName}
                        </option>
                      ))}
                    </select>
                    {selectedClient && (
                      <p className="mt-2 text-xs text-gray-600">
                        City: {selectedClient.location || 'Unknown'}
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg bg-white p-6 shadow-lg">
                    <h3 className="font-semibold text-gray-800">Search Tip</h3>
                    <p className="mt-2 text-sm text-gray-600">
                      Choose a client first, then apply filters to find PSW workers in their city and service tier.
                    </p>
                  </div>
                </>
              )}

              {activeTab === 'my-bookings' && (
                <div className="rounded-lg bg-white p-6 shadow-lg">
                    <h3 className="font-semibold text-gray-800">Bookings Summary</h3>
                    <div className="mt-4 space-y-2 text-sm text-gray-700">
                      <p>
                        <strong>Total Bookings:</strong> {timeSlots.length}
                      </p>
                      <div className="mt-2 space-y-1">
                        {timeSlots.slice(0, 4).map((s) => (
                          <div key={s.id} className="text-sm text-gray-700">
                            {('workerName' in s) && ('clientName' in s) ? (
                              <span>P: {(s as any).workerName} - C: {(s as any).clientName}</span>
                            ) : s.title ? (
                              <span>{s.title}</span>
                            ) : (
                              <span>{toLocalDate(s.date).toLocaleDateString()}</span>
                            )}
                          </div>
                        ))}
                        {timeSlots.length > 4 && (
                          <div className="text-xs text-gray-500">+{timeSlots.length - 4} more</div>
                        )}
                      </div>
                    </div>
                </div>
              )}

              {/* {activeTab === 'calendar' && (
                <UserList users={users} />
              )} */}
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Calendar Tab */}
            {activeTab === 'calendar' && (
              <>
                <CalendarView
                  timeSlots={timeSlots}
                  month={selectedMonth}
                  year={selectedYear}
                  onMonthChange={setSelectedMonth}
                  onYearChange={setSelectedYear}
                  onDateClick={(date, slots) => {
                    setSelectedDate(date);
                    setSelectedDateSlots(slots);
                    setShowDateModal(true);
                  }}
                />
              </>
            )}

            {/* Book Meeting Tab */}
            {activeTab === 'book-meeting' && (
              <>
                {bookingResult && <BookingSummary result={bookingResult} />}

                <CalendarView
                  timeSlots={timeSlots}
                  month={selectedMonth}
                  year={selectedYear}
                  onMonthChange={setSelectedMonth}
                  onYearChange={setSelectedYear}
                  onDateClick={(date, slots) => {
                    setSelectedDate(date);
                    setSelectedDateSlots(slots);
                    setShowDateModal(true);
                  }}
                />
              </>
            )}

            {/* Find PSW Workers Tab */}
            {activeTab === 'find-workers' && (
              <WorkerSearchView onWorkerSelect={handleWorkerSelected} selectedClient={selectedClient} />
            )}

            {/* My Bookings Tab */}
            {activeTab === 'my-bookings' && (
              <div className="rounded-lg bg-white p-6 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">My Bookings</h2>
                {timeSlots.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No bookings yet. Start by booking a meeting or a PSW worker.</p>
                ) : (
                  <div className="space-y-3">
                    {timeSlots.map((slot) => {
                      const worker = (slot as any).workerName || (slot as any).pswWorkerName || 'Unknown Worker';
                      const client = (slot as any).clientName || 'Unknown Client';
                      const slotDate = toLocalDate(slot.date);
                      // Format date as M/D/YYYY
                      const formattedDate = `${slotDate.getMonth() + 1}/${slotDate.getDate()}/${slotDate.getFullYear()}`;
                      
                      // Determine display name - prioritize workerName for PSW bookings
                      const displayName = (slot as any).workerName || slot.title || 'Booking';
                      console.log('displayName', displayName)
                      return (
                        <div
                          key={slot.id}
                          className="rounded-lg border border-indigo-200 bg-indigo-50 p-4"
                        >
                          <div className="flex flex-col">
                            {/* Worker/Title Name */}
                   <h3 className="font-semibold text-lg mb-1">
                    {worker}
                  </h3>

                  {/* Date & Time */}
                  <p className="text-sm text-gray-700 mb-1">
                    {formattedDate} from {slot.startTime} to {slot.endTime}
                  </p>

                  {/* P: Worker - C: Client */}
                  <p className="text-sm text-gray-800">
                    P: {worker} - C: {client}
                  </p>

                  {/* Optional description */}
                  {slot.description && (
                    <p className="mt-2 text-sm text-gray-600">
                      {slot.description}
                    </p>
                  )}
                            
                            {/* Status (if available) */}
                            {('status' in slot) && (slot as any).status && (
                              <p className="text-xs text-gray-600 mt-2">
                                Status: {(slot as any).status}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Worker Profile Modal */}
      {showWorkerProfile && (
        <WorkerProfileModal
          worker={selectedWorker}
          onClose={() => setShowWorkerProfile(false)}
          onBook={handleWorkerBook}
        />
      )}

      {/* Booking Flow Modal */}
      {showBookingFlow && (
        <ClientBookingFlow
          worker={selectedWorker}
          clients={clients}
          initialClient={selectedClient}
          onBookingComplete={handleBookingComplete}
          onCancel={() => {
            setShowBookingFlow(false);
            setSelectedWorker(null);
          }}
          onClose={() => {
            setShowBookingFlow(false);
            setSelectedWorker(null);
          }}
        />
      )}
      {/* Booking Details Modal (date click) */}
      {showDateModal && selectedDate && selectedDateSlots && (
        <BookingDetailsModal
          date={selectedDate}
          bookings={selectedDateSlots}
          onClose={() => {
            setShowDateModal(false);
            setSelectedDate(null);
            setSelectedDateSlots(null);
          }}
        />
      )}
    </main>
  );
}
