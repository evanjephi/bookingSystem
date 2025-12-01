'use client';

import { useState } from 'react';
import { Client } from '@/types';
import { Send, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { toLocalDate } from '@/lib/dateUtils';

interface BookWithWorkerInputProps {
  selectedClient: Client | null;
  onBookingSuccess?: () => void;
}

interface BookingResponse {
  success: boolean;
  message: string;
  booking?: {
    id: string;
    clientId: string;
    pswWorkerId: string;
    clientName: string;
    workerName: string;
    date: string;
    startTime: string;
    endTime: string;
  };
}

export default function BookWithWorkerInput({ selectedClient, onBookingSuccess }: BookWithWorkerInputProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BookingResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !selectedClient) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/book-with-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: input.trim(),
          clientId: selectedClient.id,
        }),
      });

      const data: BookingResponse = await res.json();
      setResult(data);

      if (data.success) {
        setInput('');
        if (onBookingSuccess) {
          onBookingSuccess();
        }
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedClient) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>Please select a client first to book with a PSW worker</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 font-medium mb-2">Book with PSW Worker</p>
        <p className="text-sm text-blue-700">
          <strong>Client:</strong> {selectedClient.firstName} {selectedClient.lastName}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Booking Request
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Example: "book a meeting with Barbara Johnson at 9am-12pm on december 10"'
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
          />
          <p className="text-xs text-gray-500 mt-1">
            Describe who (PSW worker name), when (time), and which days you want to book.
          </p>
        </div>

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Booking...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Book with Worker
            </>
          )}
        </button>
      </form>

      {result && (
        <div
          className={`rounded-lg p-4 flex gap-3 ${
            result.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {result.success ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.message}
            </p>
            {result.booking && (
              <div className="mt-2 text-sm space-y-1 text-green-700">
                <p><strong>Worker:</strong> {result.booking.workerName}</p>
                <p><strong>Date:</strong> {toLocalDate(result.booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                <p><strong>Time:</strong> {result.booking.startTime} - {result.booking.endTime}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
