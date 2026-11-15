/**
 * Pure calendar helpers for the weekly recap. They operate on YYYY-MM-DD
 * strings supplied by the client (its local "today"), using UTC arithmetic
 * only as a calendar calculator, so the server's clock/timezone never matters.
 * Weeks start on Sunday, matching the rest of the app.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDateString(s: string): boolean {
  const m = s.match(DATE_RE);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function toUtc(s: string): Date {
  const m = s.match(DATE_RE)!;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fmt(d);
}

export function weekdayOf(date: string): number {
  return toUtc(date).getUTCDay();
}

/** The Sunday..Saturday week before the week containing `today`. */
export function getPreviousWeekRange(today: string): { start: string; end: string } {
  const thisWeekStart = addDays(today, -weekdayOf(today));
  const start = addDays(thisWeekStart, -7);
  return { start, end: addDays(start, 6) };
}
