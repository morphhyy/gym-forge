import { convertWeight, ImportedWorkout, WeightUnit } from "./types";

/**
 * Exercise-name matching against the GymForge catalog.
 *
 * Strong/Hevy name exercises like "Bench Press (Barbell)" or
 * "Seated Cable Row - V Grip (Cable)"; the catalog uses "Bench Press",
 * "Dumbbell Bench Press", "Seated Cable Row". We try, in order:
 *   1. exact normalized match (case/whitespace/punctuation/plural-insensitive)
 *   2. explicit alias table
 *   3. "<Equipment> <Base>" and "<Base>" derived from "Base (Equipment)",
 *      also with any " - variant" suffix removed
 * Anything left is reported as unmatched and created as a custom exercise.
 */

export interface CatalogExercise {
  id: string;
  name: string;
}

/** lowercase, punctuation -> space, collapse whitespace, singularize tokens */
export function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (t.length >= 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t))
    .join(" ");
}

/** Source-app names (normalized) -> catalog names. Keys are run through normalizeExerciseName. */
const RAW_ALIASES: Record<string, string> = {
  "bicep curl (barbell)": "Barbell Curl",
  "bicep curl (dumbbell)": "Dumbbell Curl",
  "biceps curl (barbell)": "Barbell Curl",
  "biceps curl (dumbbell)": "Dumbbell Curl",
  "ez bar curl": "Barbell Curl",
  "bent over row (barbell)": "Barbell Row",
  "bent over row": "Barbell Row",
  "pendlay row (barbell)": "Barbell Row",
  "bent over one arm row (dumbbell)": "Dumbbell Row",
  "dumbbell row": "Dumbbell Row",
  "single arm dumbbell row": "Dumbbell Row",
  "seated row (cable)": "Seated Cable Row",
  "seated cable row": "Seated Cable Row",
  "lat pulldown": "Lat Pulldown",
  "pulldown (cable)": "Lat Pulldown",
  "overhead press (barbell)": "Overhead Press",
  "strict military press (barbell)": "Overhead Press",
  "military press": "Overhead Press",
  "shoulder press (barbell)": "Overhead Press",
  "shoulder press (dumbbell)": "Dumbbell Shoulder Press",
  "seated shoulder press (dumbbell)": "Dumbbell Shoulder Press",
  "incline bench press (dumbbell)": "Incline Dumbbell Press",
  "incline press (dumbbell)": "Incline Dumbbell Press",
  "bench press (dumbbell)": "Dumbbell Bench Press",
  "chest press (dumbbell)": "Dumbbell Bench Press",
  "chest fly (dumbbell)": "Chest Fly",
  "fly (dumbbell)": "Chest Fly",
  "cable fly crossover": "Cable Crossover",
  "cable crossover": "Cable Crossover",
  "triceps pushdown": "Tricep Pushdown",
  "triceps pushdown (cable straight bar)": "Tricep Pushdown",
  "triceps rope pushdown": "Tricep Pushdown",
  "skullcrusher (barbell)": "Skull Crusher",
  "skullcrusher": "Skull Crusher",
  "lying triceps extension (barbell)": "Skull Crusher",
  "triceps dip": "Tricep Dip",
  "chest dip": "Tricep Dip",
  "bench press close grip (barbell)": "Close-Grip Bench Press",
  "close grip bench press": "Close-Grip Bench Press",
  "back squat": "Squat",
  "squat (barbell)": "Squat",
  "front squat (barbell)": "Front Squat",
  "romanian deadlift (barbell)": "Romanian Deadlift",
  "rdl": "Romanian Deadlift",
  "lying leg curl (machine)": "Leg Curl",
  "seated leg curl (machine)": "Leg Curl",
  "hamstring curl": "Leg Curl",
  "standing calf raise (machine)": "Calf Raise",
  "seated calf raise (machine)": "Calf Raise",
  "standing calf raise": "Calf Raise",
  "lunge (dumbbell)": "Lunges",
  "walking lunge (dumbbell)": "Lunges",
  "walking lunge": "Lunges",
  "bulgarian split squat": "Bulgarian Split Squat",
  "split squat (dumbbell)": "Bulgarian Split Squat",
  "lateral raise (dumbbell)": "Lateral Raise",
  "side lateral raise": "Lateral Raise",
  "reverse fly (dumbbell)": "Rear Delt Fly",
  "rear delt reverse fly (dumbbell)": "Rear Delt Fly",
  "face pull (cable)": "Face Pull",
  "pull up": "Pull-Up",
  "pull up (assisted)": "Pull-Up",
  "push up": "Push-Up",
  "hanging leg raise": "Hanging Leg Raise",
  "cable crunch": "Cable Crunch",
  "crunch (cable)": "Cable Crunch",
  "ab wheel": "Ab Wheel Rollout",
  "ab wheel rollout": "Ab Wheel Rollout",
  "t bar row": "T-Bar Row",
};

const ALIASES: Map<string, string> = new Map(
  Object.entries(RAW_ALIASES).map(([k, v]) => [normalizeExerciseName(k), v])
);

function candidateNames(name: string): string[] {
  const out: string[] = [name];
  const paren = name.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  const base = (paren ? paren[1] : name).trim();
  const equipment = paren ? paren[2].trim() : "";
  const baseNoVariant = base.split(/\s+-\s+/)[0].trim();
  for (const b of new Set([base, baseNoVariant])) {
    if (equipment) {
      out.push(`${equipment} ${b}`, `${b} ${equipment}`);
      out.push(`${b} (${equipment})`);
    }
    out.push(b);
  }
  return out;
}

export class ExerciseMatcher {
  private byNormalized = new Map<string, CatalogExercise>();

  constructor(catalog: CatalogExercise[]) {
    for (const ex of catalog) {
      const key = normalizeExerciseName(ex.name);
      // First one wins (callers pass global exercises before custom ones)
      if (!this.byNormalized.has(key)) this.byNormalized.set(key, ex);
    }
  }

  match(sourceName: string): CatalogExercise | null {
    for (const cand of candidateNames(sourceName)) {
      const key = normalizeExerciseName(cand);
      const direct = this.byNormalized.get(key);
      if (direct) return direct;
      const alias = ALIASES.get(key);
      if (alias) {
        const aliased = this.byNormalized.get(normalizeExerciseName(alias));
        if (aliased) return aliased;
      }
    }
    return null;
  }
}

export interface PlannedSet {
  exerciseKey: string;
  setIndex: number;
  weight: number;
  reps: number;
  rpe?: number;
}

export interface PlannedSession {
  date: string;
  notes?: string;
  sets: PlannedSet[];
}

export interface ImportPlan {
  sessions: PlannedSession[];
  /** source exercise name -> catalog exercise id */
  matched: Map<string, string>;
  /** source names with no catalog match (will be created as custom exercises) */
  unmatched: string[];
  totalSets: number;
}

export interface BuildPlanOptions {
  targetUnit: WeightUnit;
  /** Unit to assume when the file doesn't say */
  fallbackUnit: WeightUnit;
  includeWarmups: boolean;
  sourceLabel: string;
}

/**
 * Turn parsed workouts into import-ready sessions. GymForge has one session per
 * date, so multiple source workouts on the same date are merged into a single
 * session (set indices continue per exercise). Exercise keys are either a
 * catalog id (`id:<id>`) or a new custom exercise (`new:<source name>`).
 */
export function buildImportPlan(
  workouts: ImportedWorkout[],
  matcher: ExerciseMatcher,
  opts: BuildPlanOptions
): ImportPlan {
  const matched = new Map<string, string>();
  const unmatched = new Set<string>();
  const byDate = new Map<
    string,
    { titles: string[]; notes: string[]; sets: PlannedSet[]; counters: Map<string, number> }
  >();

  for (const w of workouts) {
    let day = byDate.get(w.date);
    if (!day) {
      day = { titles: [], notes: [], sets: [], counters: new Map() };
      byDate.set(w.date, day);
    }
    let addedAny = false;
    for (const s of w.sets) {
      if (s.isWarmup && !opts.includeWarmups) continue;
      let exerciseKey: string;
      const hit = matched.has(s.exerciseName)
        ? matched.get(s.exerciseName)!
        : unmatched.has(s.exerciseName)
          ? null
          : (matcher.match(s.exerciseName)?.id ?? null);
      if (hit) {
        matched.set(s.exerciseName, hit);
        exerciseKey = `id:${hit}`;
      } else {
        unmatched.add(s.exerciseName);
        exerciseKey = `new:${s.exerciseName}`;
      }
      const setIndex = day.counters.get(exerciseKey) ?? 0;
      day.counters.set(exerciseKey, setIndex + 1);
      day.sets.push({
        exerciseKey,
        setIndex,
        weight: convertWeight(s.weight, s.unit ?? opts.fallbackUnit, opts.targetUnit),
        reps: s.reps,
        rpe: s.rpe !== undefined ? Math.min(10, Math.max(1, s.rpe)) : undefined,
      });
      addedAny = true;
    }
    if (addedAny) {
      day.titles.push(w.title);
      if (w.notes) day.notes.push(w.notes);
    }
  }

  const sessions: PlannedSession[] = [];
  let totalSets = 0;
  for (const [date, day] of Array.from(byDate.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    if (day.sets.length === 0) continue;
    totalSets += day.sets.length;
    const header = `Imported from ${opts.sourceLabel}: ${day.titles.join(" + ")}`;
    sessions.push({
      date,
      notes: [header, ...day.notes].join("\n").slice(0, 2000),
      sets: day.sets,
    });
  }

  return {
    sessions,
    matched,
    unmatched: Array.from(unmatched).sort((a, b) => a.localeCompare(b)),
    totalSets,
  };
}
