export type WeightUnit = "kg" | "lb";
export type ImportSource = "strong" | "hevy";

export interface ImportedSet {
  exerciseName: string;
  weight: number;
  /** Unit the weight is expressed in, or null when the file doesn't say. */
  unit: WeightUnit | null;
  reps: number;
  rpe?: number;
  isWarmup: boolean;
}

export interface ImportedWorkout {
  /** Local calendar date, YYYY-MM-DD */
  date: string;
  title: string;
  notes?: string;
  /** Sets in file order */
  sets: ImportedSet[];
}

export interface ParseResult {
  source: ImportSource;
  workouts: ImportedWorkout[];
  /** Rows that were ignored (cardio/timed-only, rest timers, invalid dates...) */
  skippedRows: number;
  /** True when at least one set has no unit info (user must choose) */
  hasUnknownUnits: boolean;
}

export const KG_PER_LB = 0.45359237;

export function convertWeight(
  weight: number,
  from: WeightUnit,
  to: WeightUnit
): number {
  if (from === to) return weight;
  const converted = from === "kg" ? weight / KG_PER_LB : weight * KG_PER_LB;
  return Math.round(converted * 100) / 100;
}

export function parseUnit(raw: string | undefined): WeightUnit | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "kg" || s === "kgs" || s === "kilograms") return "kg";
  if (s === "lb" || s === "lbs" || s === "pounds") return "lb";
  return null;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function validDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Extract the calendar date (as written in the file, no timezone shifting)
 * from the date/time formats Strong and Hevy use:
 *   "2024-08-01 18:23:30", "2024/08/01 18:23", "2024-08-01T18:23:30Z",
 *   "01 Aug 2024, 18:23", "Aug 1, 2024 6:23 PM"
 */
export function parseDateOnly(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return validDate(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{4})/);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()];
    return mon ? validDate(+m[3], mon, +m[1]) : null;
  }
  m = s.match(/^([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const mon = MONTHS[m[1].toLowerCase()];
    return mon ? validDate(+m[3], mon, +m[2]) : null;
  }
  return null;
}
