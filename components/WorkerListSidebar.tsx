'use client';

import { useState, useEffect } from 'react';
import { PSWWorker, Client } from '@/types';
import { MapPin, DollarSign, Loader, AlertCircle, Clock, Calendar } from 'lucide-react';

interface WorkerListSidebarProps {
  client: Client | null;
  onWorkerSelect?: (worker: PSWWorker) => void;
}

const extractCityFromAddress = (value: string): string => {
  if (!value) return '';
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return value.trim();
  const hasStreetNumber = /^\d/.test(parts[0]);
  if (hasStreetNumber && parts.length > 1) {
    return parts.slice(1).join(', ');
  }
  return value.trim();
};

const getDayName = (dayOfWeek: number): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayOfWeek] || '';
};

const formatAvailabilityHours = (availability: PSWWorker['availability']): string => {
  if (!availability || availability.length === 0) {
    return 'No hours set';
  }

  // Group availability by start/end time to show typical hours
  const timeGroups = new Map<string, number[]>();
  
  availability.forEach((slot) => {
    const key = `${slot.startTime}-${slot.endTime}`;
    if (!timeGroups.has(key)) {
      timeGroups.set(key, []);
    }
    timeGroups.get(key)!.push(slot.dayOfWeek);
  });

  // Format each time slot with its days
  const formatted: string[] = [];
  timeGroups.forEach((days, timeRange) => {
    const [startTime, endTime] = timeRange.split('-');
    const dayList = days.sort().map(getDayName).join(', ');
    formatted.push(`${startTime}-${endTime} (${dayList})`);
  });

  return formatted.slice(0, 2).join(' • ');
};

export default function WorkerListSidebar({ client, onWorkerSelect }: WorkerListSidebarProps) {
  const [workers, setWorkers] = useState<PSWWorker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client?.location) {
      setWorkers([]);
      setError(null);
      return;
    }

    const fetchWorkers = async () => {
      try {
        setLoading(true);
        setError(null);

        const city = extractCityFromAddress(client.location);
        if (!city) {
          setWorkers([]);
          setError('Unable to extract city from location');
          return;
        }

        const params = new URLSearchParams({
          clientLocation: city,
          matchClientCityOnly: 'true',
        });

        const res = await fetch(`/api/psw-workers?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to fetch workers');
        }

        const data = await res.json();
        setWorkers(data.workers || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setWorkers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, [client?.location, client?.id]);

  if (!client) {
    return (
      <div className="text-center text-white/50 py-8">
        <p>No client selected</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-white/60">
        <Loader className="h-6 w-6 animate-spin mb-2" />
        <p>Loading workers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-200">Error</p>
            <p className="text-xs text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (workers.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-8 w-8 text-yellow-400 mx-auto mb-3 opacity-50" />
        <p className="text-sm text-white/60">
          No PSW workers found in {extractCityFromAddress(client.location)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto">
      <p className="text-xs font-semibold text-white/60 uppercase mb-3">
        Available in {extractCityFromAddress(client.location)} ({workers.length})
      </p>

      {workers.map((worker) => (
        <div
          key={worker.id}
          className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 hover:bg-emerald-500/10 cursor-pointer transition"
          onClick={() => onWorkerSelect?.(worker)}
        >
          <div className="mb-2">
            <h4 className="font-semibold text-white text-sm">
              {worker.firstName} {worker.lastName}
            </h4>
          </div>

          <div className="space-y-1.5 text-xs mb-3">
            <div className="flex items-center gap-2 text-white/70">
              <MapPin className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
              <span>{worker.location}</span>
            </div>

            <div className="flex items-center gap-2 text-white/70">
              <DollarSign className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
              <span>${worker.hourlyRate}/hour</span>
            </div>

            {worker.availability && worker.availability.length > 0 && (
              <div className="flex items-start gap-2 text-white/70">
                <Clock className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs text-white/60">
                    {formatAvailabilityHours(worker.availability)}
                  </div>
                </div>
              </div>
            )}

            {worker.availability && worker.availability.length > 0 && (
              <div className="flex items-start gap-2">
                <Calendar className="h-3.5 w-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(worker.availability.map(a => a.dayOfWeek)))
                    .sort()
                    .map((day) => (
                      <span
                        key={day}
                        className="inline-block rounded px-1.5 py-0.5 text-xs bg-purple-600/30 text-purple-300"
                      >
                        {getDayName(day)}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>

          {worker.serviceLevels && worker.serviceLevels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {worker.serviceLevels.map((level) => (
                <span
                  key={`${worker.id}-${level}`}
                  className="inline-block rounded text-xs px-2 py-0.5 bg-emerald-600/30 text-emerald-300 capitalize"
                >
                  {level}
                </span>
              ))}
            </div>
          )}

          {worker.specialties && worker.specialties.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {worker.specialties.slice(0, 2).map((specialty, idx) => (
                <span
                  key={`${worker.id}-specialty-${idx}`}
                  className="inline-block rounded text-xs px-2 py-0.5 bg-blue-600/30 text-blue-300"
                >
                  {specialty}
                </span>
              ))}
              {worker.specialties.length > 2 && (
                <span key={`${worker.id}-specialty-more`} className="inline-block rounded text-xs px-2 py-0.5 bg-white/10 text-white/60">
                  +{worker.specialties.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
