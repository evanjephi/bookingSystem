// components/WorkerSearchView.tsx
'use client';

import { useState, useEffect } from 'react';
import { PSWWorker, ServiceLevel, Client } from '@/types';
import { Search, MapPin, DollarSign } from 'lucide-react';

interface WorkerSearchViewProps {
  onWorkerSelect: (worker: PSWWorker) => void;
  selectedClient?: Client | null;
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

export default function WorkerSearchView({ onWorkerSelect, selectedClient }: WorkerSearchViewProps) {
  const [workers, setWorkers] = useState<PSWWorker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<PSWWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [minRate, setMinRate] = useState(0);
  const [maxRate, setMaxRate] = useState(50);
  const [serviceLevelFilter, setServiceLevelFilter] = useState<ServiceLevel | ''>('');
  const [clientLocation, setClientLocation] = useState('');
  const [matchClientCityOnly, setMatchClientCityOnly] = useState(false);

  const [activeFilters, setActiveFilters] = useState({
    searchKeyword: '',
    selectedSpecialty: '',
    minRate: 0,
    maxRate: 50,
    serviceLevel: '' as ServiceLevel | '',
    clientLocation: '',
    matchClientCityOnly: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    const fetchWorkers = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (activeFilters.searchKeyword.trim()) params.set('keyword', activeFilters.searchKeyword.trim());
        if (activeFilters.selectedSpecialty) params.set('specialty', activeFilters.selectedSpecialty);
        if (activeFilters.minRate > 0) params.set('minRate', String(activeFilters.minRate));
        if (activeFilters.maxRate < 50) params.set('maxRate', String(activeFilters.maxRate));
        if (activeFilters.serviceLevel) params.set('serviceLevel', activeFilters.serviceLevel);
        if (activeFilters.clientLocation.trim()) params.set('clientLocation', extractCityFromAddress(activeFilters.clientLocation.trim()));
        if (activeFilters.matchClientCityOnly) params.set('matchClientCityOnly', 'true');

        const query = params.toString();
        const url = query ? `/api/psw-workers?${query}` : '/api/psw-workers';

        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error('Failed to fetch workers');
        }
        const data = await res.json();
        if (isActive) {
          setWorkers(data.workers || []);
          setFilteredWorkers(data.workers || []);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchWorkers();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [activeFilters]);

  useEffect(() => {
    if (selectedClient?.location) {
      const normalized = extractCityFromAddress(selectedClient.location);
      setClientLocation(normalized);
      setMatchClientCityOnly(true);
      setActiveFilters((prev) => ({
        ...prev,
        clientLocation: normalized,
        matchClientCityOnly: true,
      }));
    }
  }, [selectedClient?.id, selectedClient?.location]);

  const handleApplyFilters = () => {
    const normalizedLocation = extractCityFromAddress(clientLocation);
    setClientLocation(normalizedLocation);
    setActiveFilters({
      searchKeyword,
      selectedSpecialty,
      minRate,
      maxRate,
      serviceLevel: serviceLevelFilter,
      clientLocation: normalizedLocation,
      matchClientCityOnly,
    });
  };

  const specialties = Array.from(
    new Set(workers.flatMap((w) => w.specialties || []))
  );

  const serviceLevels = Array.from(
    new Set(
      workers.flatMap((w) => (w.serviceLevels && w.serviceLevels.length > 0 ? w.serviceLevels : []))
    )
  ) as ServiceLevel[];

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-8 shadow-lg text-center">
        <p className="text-gray-600">Loading workers...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-lg">
      <h2 className="mb-6 text-2xl font-bold text-gray-800">Find PSW Workers</h2>

      {!selectedClient && (
        <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
          Please select a client on the left before viewing worker details or booking.
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="mb-6 space-y-4">
        {/* Keyword Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or specialty..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Specialty Filter */}
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Specialties</option>
            {specialties.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>

          {/* Min Rate */}
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Min Rate: ${minRate}
            </label>
            <input
              type="range"
              min="0"
              max="50"
              value={minRate}
              onChange={(e) => setMinRate(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Max Rate */}
          <div>
            <label className="block text-xs font-medium text-gray-600">
              Max Rate: ${maxRate}
            </label>
            <input
              type="range"
              min="0"
              max="50"
              value={maxRate}
              onChange={(e) => setMaxRate(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Service Level & Proximity */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Service Level
            </label>
            <select
              value={serviceLevelFilter}
              onChange={(e) => setServiceLevelFilter(e.target.value as ServiceLevel | '')}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Levels</option>
              {serviceLevels.map((level) => (
                <option key={level} value={level} className="capitalize">
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Client Location (for proximity)
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="text"
                placeholder="e.g., Toronto"
                value={clientLocation}
                onChange={(e) => setClientLocation(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={matchClientCityOnly}
                onChange={(e) => setMatchClientCityOnly(e.target.checked)}
                className="h-4 w-4"
              />
              Only show workers in this city (required for booking)
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleApplyFilters}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Applying...' : 'Apply Filters'}
          </button>
        </div>
      </div>

      {/* Results Count */}
      <p className="mb-4 text-sm text-gray-600">
        Showing {filteredWorkers.length} of {workers.length} workers
      </p>

      {/* Workers Grid */}
      {filteredWorkers.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          No workers found matching your criteria
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredWorkers.map((worker) => (
            <div
              key={worker.id}
              className={`rounded-lg border border-gray-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-4 transition-shadow ${selectedClient ? 'hover:shadow-lg cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
              onClick={() => {
                if (!selectedClient) return;
                onWorkerSelect(worker);
              }}
            >
              {/* Name */}
              <h3 className="text-lg font-semibold text-gray-800">
                {worker.firstName} {worker.lastName}
              </h3>

              {/* Location */}
              <div className="mt-2 flex items-start gap-2 text-sm text-gray-700">
                <MapPin className="h-4 w-4 flex-shrink-0 text-indigo-600 mt-0.5" />
                <span>{worker.location}</span>
              </div>

              {/* Rate */}
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span>{worker.hourlyRate}/hour</span>
              </div>

              {/* Service Levels */}
              {worker.serviceLevels && worker.serviceLevels.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {/* Service Levels */}
                  {worker.serviceLevels && worker.serviceLevels.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {worker.serviceLevels.map((level) => (
                        <span
                          key={`${worker.id}-service-${level}`}
                          className="rounded-full bg-purple-100 px-3 py-1 font-semibold capitalize text-purple-700"
                        >
                          {level}
                        </span>
                      ))}
                    </div>
                  )}

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

                </div>
              )}

              {/* Availability */}
              <div className="mt-3 text-xs text-gray-600">
                Available: {worker.availability.length} days/week
              </div>

              {/* View Button */}
              <button className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
                View Profile
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-700">
          Error: {error}
        </div>
      )}
    </div>
  );
}
