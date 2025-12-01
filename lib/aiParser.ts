// lib/aiParser.ts
import { ParsedBookingRequest } from '@/types';


3
export function parseBookingRequest(input: string): ParsedBookingRequest | null {
  try {
    // Extract attendees (supports commas and 'and')
    const attendeesMatch = input.match(/with\s+([\s\S]+?)(?:\s+for\s+|\s+at\s+|$)/i);
    let attendees: string[] = [];
    if (attendeesMatch) {
      attendees = attendeesMatch[1]
        .split(/\s*(?:,|and)\s*/i)
        .map((name) => name.trim().toLowerCase())
        .filter((name) => name.length > 0);
    }

    // Extract days of week
    const daysPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/gi;
    const daysMatches = input.match(daysPattern) || [];
    const daysOfWeek = [...new Set(daysMatches.map((d) => d.toLowerCase()))];

    // Extract time range or single time (supports '9am', '9:00', '9am-10am', '9:00-11:00')
    let startTime = '09:00';
    let endTime = '10:00';

    const rangeRegex = /at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
    const singleRegex = /at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)(?!\s*(?:-|to))/i;

    function parseTimeString(t: string): string {
      const cleaned = t.trim().toLowerCase();
      const ampmMatch = cleaned.match(/(am|pm)$/);
      let hhmm = cleaned.replace(/\s*(am|pm)$/i, '');
      if (!hhmm.includes(':')) {
        hhmm = hhmm + ':00';
      }
      let [h, m] = hhmm.split(':').map((s) => parseInt(s, 10));
      if (ampmMatch) {
        const ampm = ampmMatch[1];
        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
      }
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    const rangeMatch = input.match(rangeRegex);
    if (rangeMatch) {
      startTime = parseTimeString(rangeMatch[1]);
      endTime = parseTimeString(rangeMatch[2]);
    } else {
      const singleMatch = input.match(singleRegex);
      if (singleMatch) {
        startTime = parseTimeString(singleMatch[1]);
        // default duration 1 hour
        const [sh, sm] = startTime.split(':').map(Number);
        const end = new Date();
        end.setHours(sh + 1, sm, 0, 0);
        endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
      }
    }

    // Extract month and year
    let month = new Date().getMonth() + 1;
    let year = new Date().getFullYear();

    const monthMatch = input.match(
      /(January|February|March|April|May|June|July|August|September|October|November|December)/i
    );
    if (monthMatch) {
      const monthMap: { [key: string]: number } = {
        january: 1,
        february: 2,
        march: 3,
        april: 4,
        may: 5,
        june: 6,
        july: 7,
        august: 8,
        september: 9,
        october: 10,
        november: 11,
        december: 12,
      };
      month = monthMap[monthMatch[1].toLowerCase()];
    }

    const yearMatch = input.match(/(\d{4})/);
    if (yearMatch) {
      year = parseInt(yearMatch[1]);
    }

    // Extract title (optional) - capture words between 'book' and 'with' or 'for'
    const titleMatch = input.match(/(?:book|schedule)\s+(?:a\s+|an\s+)?(.+?)\s+(?:with|for)\s+/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Team Meeting';

    return {
      attendees: attendees.length > 0 ? attendees : [],
      daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : [],
      startTime,
      endTime,
      month,
      year,
      title,
    };
  } catch (error) {
    console.error('Error parsing booking request:', error);
    return null;
  }
}

/**
 * Converts day names to day of week numbers (0 = Sunday, 1 = Monday, etc.)
 */
export function dayNameToNumber(dayName: string): number {
  const dayMap: { [key: string]: number } = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  return dayMap[dayName.toLowerCase()] || -1;
}

/**
 * Gets all dates in a month that match specified days of week
 */
export function getDatesForMonth(
  year: number,
  month: number,
  daysOfWeek: string[]
): Date[] {
  const dates: Date[] = [];
  const daysToMatch = daysOfWeek.map(dayNameToNumber);

  const lastDay = new Date(year, month, 0).getDate();

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month - 1, day);
    if (daysToMatch.includes(date.getDay())) {
      dates.push(date);
    }
  }

  return dates;
}

/**
 * Normalizes user names to match available users (fuzzy matching)
 */
export function normalizeUserName(input: string, availableUsers: string[]): string | null {
  const lowerInput = input.toLowerCase().trim();

  // Exact match
  const exactMatch = availableUsers.find((name) => name.toLowerCase() === lowerInput);
  if (exactMatch) return exactMatch;

  // Partial match
  const partialMatch = availableUsers.find((name) =>
    name.toLowerCase().includes(lowerInput) || lowerInput.includes(name.toLowerCase())
  );
  if (partialMatch) return partialMatch;

  return null;
}
