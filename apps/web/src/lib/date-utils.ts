/**
 * Format a Date using its local-time components as "YYYY-MM-DD".
 *
 * Using `toISOString().slice(0, 10)` converts to UTC first, which shifts
 * the date back by one day for any timezone with a positive UTC offset
 * (e.g. Europe/Berlin) — this helper avoids that off-by-one.
 */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Get the day of week (0=Sun..6=Sat) for a "YYYY-MM-DD" date string,
 * interpreting it as a local date rather than UTC midnight.
 */
export function dayOfWeekFromDateStr(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}
