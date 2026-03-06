/**
 * Shared time-math utilities for the restaurant booking system.
 * All times are stored as strings like "6:00 PM", "11:30 AM".
 * This module converts them to minutes-since-midnight for easy arithmetic.
 */

/**
 * Parse a 12-hour time string (e.g. "6:30 PM") into minutes since midnight.
 */
export function parseTime(timeStr: string): number {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Check if two time windows overlap.
 * Window A: [startA, startA + durationA)
 * Window B: [startB, startB + durationB)
 * Returns true if they overlap.
 */
export function windowsOverlap(
  startA: number,
  durationA: number,
  startB: number,
  durationB: number
): boolean {
  const endA = startA + durationA;
  const endB = startB + durationB;
  return startA < endB && startB < endA;
}

/**
 * BUFFER_MINUTES — the pre-booking buffer before a reservation starts.
 * If a table is booked for 8:00 PM, it becomes unavailable from 7:45 PM.
 */
export const BUFFER_MINUTES = 15;

/**
 * Get the current time as minutes since midnight (server local time).
 */
export function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Get today's date as YYYY-MM-DD.
 */
export function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}
