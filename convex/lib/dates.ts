/**
 * Pure calendar-date helpers operating on "YYYY-MM-DD" strings.
 *
 * Calendar dates have no timezone. All arithmetic here is done on UTC
 * midnights built from the y/m/d components, so results are identical
 * regardless of the server's (or test runner's) local timezone.
 *
 * "Today" is a user-local concept: the server must NOT derive it from the
 * clock. Queries that need it accept the client's local date as an arg
 * (format(new Date(), "yyyy-MM-dd") on the client) and run it through
 * `resolveToday`.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcMs(dateStr: string): number {
  const match = DATE_RE.exec(dateStr);
  if (!match) {
    throw new Error(`Invalid date string (expected YYYY-MM-DD): ${dateStr}`);
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const ms = Date.UTC(y, m - 1, d);
  const check = new Date(ms);
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    throw new Error(`Invalid calendar date: ${dateStr}`);
  }
  return ms;
}

function fromUtcMs(ms: number): string {
  const d = new Date(ms);
  const y = String(d.getUTCFullYear()).padStart(4, "0");
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True if the string is a real calendar date in YYYY-MM-DD form. */
export function isDateStr(value: string): boolean {
  try {
    toUtcMs(value);
    return true;
  } catch {
    return false;
  }
}

/** Throws if the string is not a valid YYYY-MM-DD calendar date. */
export function assertDateStr(value: string): void {
  toUtcMs(value);
}

/** Weekday of a calendar date: 0=Sunday ... 6=Saturday (matches JS Date.getDay()). */
export function weekdayOf(dateStr: string): number {
  return new Date(toUtcMs(dateStr)).getUTCDay();
}

/** Add (or subtract, with negative n) whole days to a calendar date. */
export function addDays(dateStr: string, days: number): string {
  return fromUtcMs(toUtcMs(dateStr) + Math.trunc(days) * MS_PER_DAY);
}

/** Signed number of days from `from` to `to` (to - from). */
export function diffDays(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** Sunday that starts the week containing the given date. */
export function weekStartSunday(dateStr: string): string {
  return addDays(dateStr, -weekdayOf(dateStr));
}

/** First and last calendar dates of a month (month is 1-12). */
export function monthRange(
  year: number,
  month: number
): { start: string; end: string } {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid year/month: ${year}-${month}`);
  }
  const start = fromUtcMs(Date.UTC(year, month - 1, 1));
  // Day 0 of the next month is the last day of this month.
  const end = fromUtcMs(Date.UTC(year, month, 0));
  return { start, end };
}

/** Today's date in UTC. Only used as a fallback when the client didn't send its local date. */
export function utcTodayStr(now: Date = new Date()): string {
  return now.toISOString().split("T")[0];
}

/**
 * Resolve the user's "today". Prefers the client-supplied local date; falls
 * back to the UTC date for old clients that don't send it yet.
 */
export function resolveToday(today: string | undefined): string {
  if (today === undefined) return utcTodayStr();
  assertDateStr(today);
  return today;
}
