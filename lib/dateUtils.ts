// lib/dateUtils.ts
/**
 * Utility functions for consistent date handling across the application.
 * These functions ensure dates are always handled at local midnight to avoid timezone issues.
 */

/**
 * Parses a date string in YYYY-MM-DD format and returns a Date object at local midnight.
 * This prevents timezone issues where "2025-11-25" might be parsed as UTC midnight
 * and then displayed as the previous day in timezones behind UTC.
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object at local midnight
 */
export function parseLocalDate(dateString: string): Date {
  // Handle ISO strings or YYYY-MM-DD format
  const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD.`);
  }
  
  const [, year, month, day] = match;
  // Create date at local midnight (not UTC)
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

/**
 * Formats a Date object to YYYY-MM-DD string.
 * Uses local date components to avoid timezone conversion issues.
 * 
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts various date formats (Date, ISO string, YYYY-MM-DD string) to a Date object at local midnight.
 * 
 * @param date - Date object, ISO string, or YYYY-MM-DD string
 * @returns Date object at local midnight
 */
export function toLocalDate(date: Date | string): Date {
  if (date instanceof Date) {
    // If it's already a Date, create a new date from its local components
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  
  // Handle string inputs
  if (typeof date === 'string') {
    // Try YYYY-MM-DD format first
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return parseLocalDate(date);
    }
    
    // Handle ISO strings - extract the date part and parse at local midnight
    const dateMatch = date.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      return parseLocalDate(dateMatch[0]);
    }
    
    // Fallback to standard Date parsing, but then normalize to local midnight
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid date format: ${date}`);
    }
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  
  throw new Error(`Invalid date type: ${typeof date}`);
}

/**
 * Compares two dates by their date components only (ignoring time).
 * Returns true if both dates represent the same calendar day.
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates are on the same day
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = toLocalDate(date1);
  const d2 = toLocalDate(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Gets the date string representation (YYYY-MM-DD) from various date formats.
 * 
 * @param date - Date object, ISO string, or YYYY-MM-DD string
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateString(date: Date | string): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  return formatLocalDate(toLocalDate(date));
}


