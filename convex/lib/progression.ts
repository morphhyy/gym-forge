/**
 * Double-progression engine.
 *
 * Pure functions only (no Convex imports) so it can be used from Convex
 * queries, React components and Vitest alike.
 *
 * Rules, evaluated against the most recent session for an exercise:
 *   1. Every working set reached the top of the rep range -> add load
 *      (smallest sensible increment for the units/equipment) and drop the
 *      rep target back to the bottom of the range.
 *   2. Otherwise, if the last N session-to-session comparisons were all
 *      stalls or regressions -> deload ~10% and rebuild to the top of the range.
 *   3. Otherwise -> keep the load and add a rep (towards the top of the range).
 *
 * Warm-up sets (`setType: "warmup"`) and drop sets (`setType: "drop"`) are
 * ignored. Untagged sets that are clearly lighter than the top set (below
 * WORKING_SET_THRESHOLD of it) are treated as warm-ups too.
 */

export type WeightUnit = "kg" | "lb";

export type SetType = "normal" | "warmup" | "drop" | "failure";

export interface ProgressionSet {
  weight: number;
  reps: number;
  setIndex?: number;
  /** Optional; older rows will not have it. */
  setType?: SetType | string;
}

export interface ProgressionSession {
  /** ISO date (YYYY-MM-DD). Used to order sessions. */
  date: string;
  sets: ProgressionSet[];
}

export interface RepRange {
  min: number;
  max: number;
}

export type ProgressionAction =
  | "start" // no usable history
  | "increase_load"
  | "add_reps"
  | "deload";

export interface NextTarget {
  action: ProgressionAction;
  /** Suggested working weight; null when there is no history to base it on. */
  weight: number | null;
  /** Suggested reps per working set. */
  reps: number;
  repRange: RepRange;
  /** Short human-readable explanation. */
  reason: string;
  /** Consecutive stalled/regressed sessions leading up to the latest one. */
  stallCount: number;
  /** Summary of the session the suggestion is based on. */
  last: { date: string; weight: number; reps: number[] } | null;
}

export interface ProgressionInput {
  /** Recent sessions containing this exercise, any order. */
  sessions: ProgressionSession[];
  repRange: RepRange;
  units: WeightUnit;
  /** Exercise equipment, e.g. "Barbell", "Dumbbell", "Cable", "Machine". */
  equipment?: string;
  /** Number of consecutive stalls/regressions that trigger a deload. Default 2. */
  stallsBeforeDeload?: number;
}

export const DEFAULT_REP_RANGE: RepRange = { min: 8, max: 12 };
export const DELOAD_FACTOR = 0.9;
/** Untagged sets lighter than this fraction of the top set are warm-ups. */
export const WORKING_SET_THRESHOLD = 0.85;
/** A weight drop of at least this fraction is treated as an intentional deload. */
const DELOAD_DETECTION_FACTOR = 0.95;

/** Smallest sensible load increment for the equipment and units. */
export function getLoadIncrement(
  units: WeightUnit,
  equipment?: string
): number {
  const eq = (equipment ?? "").toLowerCase();
  if (units === "kg") {
    if (eq.includes("dumbbell") || eq.includes("kettlebell")) return 2;
    if (eq.includes("machine")) return 5;
    return 2.5; // barbell, cable, bodyweight (belt/vest), unknown
  }
  if (eq.includes("dumbbell") || eq.includes("kettlebell")) return 2.5;
  if (eq.includes("machine")) return 10;
  return 5; // barbell, cable, bodyweight, unknown
}

/** Round to the nearest multiple of `step`, avoiding float noise. */
export function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(Math.round(value / step) * step * 100) / 100;
}

/** Round down to a multiple of `step`, avoiding float noise. */
function floorToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(Math.floor(value / step + 1e-9) * step * 100) / 100;
}

/**
 * Derive a rep range from a plan's per-set rep targets.
 * - Varying targets (e.g. 8, 10, 12) -> their min..max.
 * - A single fixed target T -> a 2-rep window ending at T (T-2..T), so a load
 *   jump drops you to T-2 and you rebuild to T.
 */
export function repRangeFromTargets(targets: number[]): RepRange {
  const valid = targets.filter((t) => Number.isFinite(t) && t > 0);
  if (valid.length === 0) return { ...DEFAULT_REP_RANGE };
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (min !== max) return { min, max };
  return { min: Math.max(1, max - 2), max };
}

/** Sets that count for progression: no warm-ups, no drop sets, no lighter ramp-up sets. */
export function getWorkingSets(sets: ProgressionSet[]): ProgressionSet[] {
  const candidates = sets
    .filter((s) => s.setType !== "warmup" && s.setType !== "drop")
    .filter((s) => Number.isFinite(s.reps) && s.reps > 0)
    .filter((s) => Number.isFinite(s.weight) && s.weight >= 0);
  if (candidates.length === 0) return [];
  const top = Math.max(...candidates.map((s) => s.weight));
  const working =
    top > 0
      ? candidates.filter((s) => s.weight >= top * WORKING_SET_THRESHOLD)
      : candidates;
  return [...working].sort((a, b) => (a.setIndex ?? 0) - (b.setIndex ?? 0));
}

export interface SessionSummary {
  date: string;
  topWeight: number;
  reps: number[];
  bestE1RM: number;
}

function e1rm(weight: number, reps: number): number {
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export function summarizeSession(session: ProgressionSession): SessionSummary | null {
  const working = getWorkingSets(session.sets);
  if (working.length === 0) return null;
  return {
    date: session.date,
    topWeight: Math.max(...working.map((s) => s.weight)),
    reps: working.map((s) => s.reps),
    bestE1RM: Math.max(...working.map((s) => e1rm(s.weight, s.reps))),
  };
}

type Comparison = "progress" | "stall" | "regression" | "reset";

/** Compare a session against the one before it. */
export function compareSessions(
  newer: SessionSummary,
  older: SessionSummary
): Comparison {
  if (newer.topWeight > older.topWeight) return "progress";
  if (newer.topWeight < older.topWeight * DELOAD_DETECTION_FACTOR) return "reset";
  if (newer.topWeight < older.topWeight) {
    // Small weight drop: judge by estimated strength.
    if (newer.bestE1RM > older.bestE1RM) return "progress";
    return newer.bestE1RM < older.bestE1RM ? "regression" : "stall";
  }
  // Same weight: compare reps over the sets both sessions have.
  const n = Math.min(newer.reps.length, older.reps.length);
  const sum = (r: number[]) => r.slice(0, n).reduce((a, b) => a + b, 0);
  const a = sum(newer.reps);
  const b = sum(older.reps);
  if (a > b) return "progress";
  if (a < b) return "regression";
  // Same reps on shared sets but more sets done counts as progress.
  return newer.reps.length > older.reps.length ? "progress" : "stall";
}

/** Count consecutive stalls/regressions, newest first. */
export function countStalls(summaries: SessionSummary[]): number {
  let count = 0;
  for (let i = 0; i + 1 < summaries.length; i++) {
    const cmp = compareSessions(summaries[i], summaries[i + 1]);
    if (cmp === "stall" || cmp === "regression") count++;
    else break;
  }
  return count;
}

function fmt(weight: number, units: WeightUnit): string {
  return `${Math.round(weight * 100) / 100} ${units}`;
}

export function getNextTarget(input: ProgressionInput): NextTarget {
  const repRange = normalizeRange(input.repRange);
  const stallsBeforeDeload = input.stallsBeforeDeload ?? 2;
  const increment = getLoadIncrement(input.units, input.equipment);

  const summaries = [...input.sessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(summarizeSession)
    .filter((s): s is SessionSummary => s !== null);

  if (summaries.length === 0) {
    return {
      action: "start",
      weight: null,
      reps: repRange.min,
      repRange,
      reason: `Pick a weight you can lift for ${repRange.min}–${repRange.max} clean reps.`,
      stallCount: 0,
      last: null,
    };
  }

  const latest = summaries[0];
  const last = { date: latest.date, weight: latest.topWeight, reps: latest.reps };
  const stallCount = countStalls(summaries);
  const u = input.units;

  // Rule 1: top of the range on every working set -> add load.
  if (latest.reps.every((r) => r >= repRange.max)) {
    const isBodyweight = latest.topWeight === 0;
    const weight = roundToStep(latest.topWeight + increment, 0.01);
    return {
      action: "increase_load",
      weight,
      reps: repRange.min,
      repRange,
      reason: isBodyweight
        ? `Hit ${repRange.max} reps on all sets. Add ${fmt(increment, u)} (belt or vest) and aim for ${repRange.min}.`
        : `Hit ${repRange.max} reps on all sets at ${fmt(latest.topWeight, u)}. Add ${fmt(increment, u)} and aim for ${repRange.min}.`,
      stallCount,
      last,
    };
  }

  // Rule 2: repeated stalls/regressions -> deload ~10%.
  if (stallCount >= stallsBeforeDeload && latest.topWeight > 0) {
    let weight = floorToStep(latest.topWeight * DELOAD_FACTOR, increment);
    if (weight >= latest.topWeight) weight = Math.max(0, latest.topWeight - increment);
    return {
      action: "deload",
      weight,
      reps: repRange.max,
      repRange,
      reason: `No progress for ${stallCount + 1} sessions. Drop to ${fmt(weight, u)} (about 10% lighter) and build back up to ${repRange.max} reps.`,
      stallCount,
      last,
    };
  }

  // Rule 3: keep the load, add a rep to the weakest set.
  const lowest = Math.min(...latest.reps);
  const reps = Math.min(repRange.max, Math.max(repRange.min, lowest + 1));
  const lastReps = latest.reps.join(", ");
  const hold =
    latest.topWeight > 0 ? `Stay at ${fmt(latest.topWeight, u)}` : "Keep the load";
  return {
    action: "add_reps",
    weight: latest.topWeight,
    reps,
    repRange,
    reason: `${hold} and aim for ${reps} reps on every set (last: ${lastReps}).`,
    stallCount,
    last,
  };
}

function normalizeRange(range: RepRange): RepRange {
  const min = Math.max(1, Math.round(Math.min(range.min, range.max)));
  const max = Math.max(min, Math.round(Math.max(range.min, range.max)));
  return { min, max };
}
