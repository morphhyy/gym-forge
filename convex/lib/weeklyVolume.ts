/**
 * Weekly working-set counts per muscle group.
 *
 * Pure date-string arithmetic only: "today" always comes from the client so
 * the week boundaries follow the user's local calendar, not the server's.
 */

export const WEEKLY_SETS_GUIDELINE = { min: 10, max: 20 } as const;

export type VolumeStatus = "under" | "in_range" | "over";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Add days to a YYYY-MM-DD string (calendar math in UTC, so no DST drift). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Start of the week containing `date`. weekStartsOn: 0 = Sunday (app default), 1 = Monday. */
export function getWeekStart(date: string, weekStartsOn: 0 | 1 = 0): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = (day - weekStartsOn + 7) % 7;
  return addDays(date, -diff);
}

export function classifyWeeklySets(
  sets: number,
  guideline: { min: number; max: number } = WEEKLY_SETS_GUIDELINE
): VolumeStatus {
  if (sets < guideline.min) return "under";
  if (sets > guideline.max) return "over";
  return "in_range";
}

export interface VolumeSetInput {
  date: string;
  muscleGroup?: string | null;
  reps: number;
  setType?: string;
}

export interface MuscleWeeklySets {
  muscleGroup: string;
  currentWeek: number;
  previousWeek: number;
  status: VolumeStatus;
}

export interface WeeklyMuscleSetsResult {
  currentWeekStart: string;
  previousWeekStart: string;
  /** Days of the current week elapsed including today (1-7). */
  daysElapsed: number;
  guideline: { min: number; max: number };
  muscles: MuscleWeeklySets[];
}

/** A set counts if it was performed (reps > 0) and is not a warm-up. */
export function isWorkingSet(set: { reps: number; setType?: string }): boolean {
  return set.reps > 0 && set.setType !== "warmup";
}

export function computeWeeklyMuscleSets(
  sets: VolumeSetInput[],
  today: string,
  weekStartsOn: 0 | 1 = 0
): WeeklyMuscleSetsResult {
  const currentWeekStart = getWeekStart(today, weekStartsOn);
  const previousWeekStart = addDays(currentWeekStart, -7);
  const counts = new Map<string, { current: number; previous: number }>();

  for (const set of sets) {
    if (!isWorkingSet(set)) continue;
    if (set.date > today || set.date < previousWeekStart) continue;
    const group = set.muscleGroup?.trim() || "Other";
    const entry = counts.get(group) ?? { current: 0, previous: 0 };
    if (set.date >= currentWeekStart) entry.current++;
    else entry.previous++;
    counts.set(group, entry);
  }

  const muscles = [...counts.entries()]
    .map(([muscleGroup, c]) => ({
      muscleGroup,
      currentWeek: c.current,
      previousWeek: c.previous,
      status: classifyWeeklySets(c.current),
    }))
    .sort(
      (a, b) =>
        b.currentWeek - a.currentWeek ||
        b.previousWeek - a.previousWeek ||
        a.muscleGroup.localeCompare(b.muscleGroup)
    );

  const elapsed =
    Math.round(
      (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${currentWeekStart}T00:00:00Z`)) /
        86_400_000
    ) + 1;

  return {
    currentWeekStart,
    previousWeekStart,
    daysElapsed: elapsed,
    guideline: { ...WEEKLY_SETS_GUIDELINE },
    muscles,
  };
}
