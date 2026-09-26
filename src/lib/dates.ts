/**
 * Date and time utilities with proper timezone handling
 *
 * Indian Standard Time (IST): Asia/Kolkata, UTC+5:30
 */

const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Format a date for display in IST
 */
export function formatDate(date: Date, locale: string = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Format a time for display in IST
 */
export function formatTime(date: Date, locale: string = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Format a date and time for display in IST
 */
export function formatDateTime(date: Date, locale: string = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Format a date for display in short format
 */
export function formatDateShort(date: Date, locale: string = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * Format a relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(
  date: Date,
  locale: string = "en-IN"
): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (Math.abs(diffSec) < 60) {
    return rtf.format(diffSec, "second");
  } else if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, "minute");
  } else if (Math.abs(diffHour) < 24) {
    return rtf.format(diffHour, "hour");
  } else {
    return rtf.format(diffDay, "day");
  }
}

/**
 * Parse a date-only string (YYYY-MM-DD) as a calendar date in IST
 * Returns a Date object set to midnight IST on that date
 */
export function parseCalendarDate(dateStr: string): Date {
  // Parse as calendar date, not as timestamp
  const [year, month, day] = dateStr.split("-").map(Number);

  // Create date in IST timezone
  const date = new Date(
    Date.UTC(year, month - 1, day) - 5.5 * 60 * 60 * 1000
  );

  return date;
}

/**
 * Format a calendar date (date without time) for storage
 */
export function formatCalendarDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}

/**
 * Check if a date is today (in IST)
 */
export function isToday(date: Date): boolean {
  const today = formatCalendarDate(new Date());
  const dateStr = formatCalendarDate(date);
  return today === dateStr;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add hours to a date
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

/**
 * Get the start of day in IST
 */
export function startOfDayIST(date: Date): Date {
  const dateStr = formatCalendarDate(date);
  return parseCalendarDate(dateStr);
}

/**
 * Get the end of day in IST
 */
export function endOfDayIST(date: Date): Date {
  const start = startOfDayIST(date);
  return addDays(start, 1);
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number, locale: string = "en-IN"): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}
