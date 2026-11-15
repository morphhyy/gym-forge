// Pure helpers for the workout logger (kept framework-free for unit tests).

export type SetType = "normal" | "warmup" | "drop" | "failure";

export const DEFAULT_REST_SECONDS = 90;

export const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

export const SET_TYPE_META: Record<
  SetType,
  { label: string; short: string | null }
> = {
  normal: { label: "Normal", short: null },
  warmup: { label: "Warm-up", short: "W" },
  drop: { label: "Drop set", short: "D" },
  failure: { label: "To failure", short: "F" },
};

/** Parse a weight typed on a phone keyboard ("62,5" or "62.5"). */
export function parseWeight(input: string | undefined): number | null {
  if (input === undefined) return null;
  const trimmed = input.trim().replace(",", ".");
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > 2000) return null;
  return Math.round(value * 100) / 100;
}

export function parseReps(input: string | undefined): number | null {
  if (input === undefined) return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 0 || value > 1000) return null;
  return value;
}

/** Group consecutive entries sharing a supersetGroup. */
export function groupBySuperset<T extends { supersetGroup?: string }>(
  entries: readonly T[]
): { supersetGroup?: string; items: T[] }[] {
  const groups: { supersetGroup?: string; items: T[] }[] = [];
  for (const entry of entries) {
    const g = entry.supersetGroup || undefined;
    const current = groups[groups.length - 1];
    if (g && current && current.supersetGroup === g) {
      current.items.push(entry);
    } else {
      groups.push({ supersetGroup: g, items: [entry] });
    }
  }
  return groups;
}

/**
 * Decide what happens after a set is completed inside a (possibly
 * single-exercise) group: move to the next exercise of the superset round, or
 * start resting because the round is over.
 */
export function nextAfterSet<T extends { exerciseId: string; setCount: number }>(
  group: readonly T[],
  exerciseId: string,
  setIndex: number,
  isLogged: (exerciseId: string, setIndex: number) => boolean
): { focus: { exerciseId: string; setIndex: number } | null; startRest: boolean } {
  if (group.length > 1) {
    const pos = group.findIndex((e) => e.exerciseId === exerciseId);
    for (let i = pos + 1; i < group.length; i++) {
      const candidate = group[i];
      if (setIndex < candidate.setCount && !isLogged(candidate.exerciseId, setIndex)) {
        return { focus: { exerciseId: candidate.exerciseId, setIndex }, startRest: false };
      }
    }
  }
  return { focus: null, startRest: true };
}

/** Rest length: per-exercise (max across a superset), else user default, else 90s. */
export function resolveRestSeconds(
  group: readonly { restSeconds?: number }[],
  userDefault: number | undefined
): number {
  const perExercise = group
    .map((e) => e.restSeconds)
    .filter((s): s is number => typeof s === "number" && s > 0);
  if (perExercise.length > 0) return Math.max(...perExercise);
  if (typeof userDefault === "number" && userDefault > 0) return userDefault;
  return DEFAULT_REST_SECONDS;
}

export function computeSessionStats(
  sets: readonly { weight: number; repsActual: number; setType?: SetType }[]
): { totalSets: number; workingSets: number; volume: number } {
  let volume = 0;
  let workingSets = 0;
  for (const set of sets) {
    if (set.setType === "warmup") continue;
    workingSets++;
    volume += set.weight * set.repsActual;
  }
  return { totalSets: sets.length, workingSets, volume: Math.round(volume * 10) / 10 };
}

/** 65000 -> "1:05", 3723000 -> "1:02:03" */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatWeightValue(weight: number): string {
  return Number.isInteger(weight) ? String(weight) : String(Math.round(weight * 100) / 100);
}

// ---------------------------------------------------------------------------
// Plate calculator
// ---------------------------------------------------------------------------

export const PLATES = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
} as const;

export const DEFAULT_BAR = { kg: 20, lb: 45 } as const;

export function isBarbellExercise(equipment: string | undefined | null): boolean {
  return !!equipment && /barbell/i.test(equipment);
}

/**
 * Greedy plate loading per side. Returns the plates for ONE side (heaviest
 * first) and the weight that could not be loaded (0 when exact).
 */
export function calculatePlates(
  target: number,
  barWeight: number,
  plates: readonly number[]
): { perSide: number[]; loaded: number; remainder: number } {
  if (!Number.isFinite(target) || target <= barWeight) {
    return { perSide: [], loaded: Math.max(barWeight, 0), remainder: 0 };
  }
  // Work in hundredths to avoid floating-point drift (1.25 etc.)
  let remainingPerSide = Math.round(((target - barWeight) / 2) * 100);
  const perSide: number[] = [];
  for (const plate of [...plates].sort((a, b) => b - a)) {
    const p = Math.round(plate * 100);
    if (p <= 0) continue;
    while (remainingPerSide >= p) {
      perSide.push(plate);
      remainingPerSide -= p;
    }
  }
  const loaded = barWeight + (perSide.reduce((s, p) => s + p, 0) * 2);
  return {
    perSide,
    loaded: Math.round(loaded * 100) / 100,
    remainder: Math.round((target - loaded) * 100) / 100,
  };
}
