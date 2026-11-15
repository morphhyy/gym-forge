import { parseCsvObjects, parseNumber } from "./csv";
import {
  ImportedSet,
  ImportedWorkout,
  ImportSource,
  ParseResult,
  parseDateOnly,
  parseUnit,
  WeightUnit,
} from "./types";

/*
 * Strong export (Settings -> Export Strong Data -> CSV). One row per set.
 * Known header variants (read by name, so column order doesn't matter):
 *   Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
 *   Date;Workout Name;Exercise Name;Set Order;Weight;Weight Unit;Reps;RPE;Distance;Distance Unit;Seconds;Notes;Workout Notes;Workout Duration
 * Date looks like "2024-08-01 18:23:30". "Set Order" is numeric, or "W"/"D"/"F"
 * for warm-up/drop/failure sets in some versions; newer versions also emit
 * "Rest Timer" / "Note" rows, which we skip. Weight is in the user's Strong
 * unit; only some versions include a "Weight Unit" column.
 *
 * Hevy export (Profile -> Settings -> Export & Import -> Export Workouts):
 *   title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,
 *   set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe
 * start_time looks like "01 Aug 2024, 18:23". set_type is normal/warmup/failure/dropset.
 * Imperial accounts may export weight_lbs / distance_miles instead.
 */

export function detectSource(headers: string[]): ImportSource | null {
  const has = (h: string) => headers.includes(h);
  if (has("exercise_title") && has("start_time")) return "hevy";
  if (has("exercise name") && has("date") && (has("set order") || has("reps")))
    return "strong";
  return null;
}

interface WorkoutAccumulator {
  key: string;
  workout: ImportedWorkout;
}

function pushSet(
  map: Map<string, WorkoutAccumulator>,
  key: string,
  date: string,
  title: string,
  notes: string | undefined,
  set: ImportedSet
) {
  let acc = map.get(key);
  if (!acc) {
    acc = {
      key,
      workout: { date, title, notes: notes || undefined, sets: [] },
    };
    map.set(key, acc);
  } else if (!acc.workout.notes && notes) {
    acc.workout.notes = notes;
  }
  acc.workout.sets.push(set);
}

function finish(
  source: ImportSource,
  map: Map<string, WorkoutAccumulator>,
  skippedRows: number
): ParseResult {
  const workouts = Array.from(map.values())
    .map((a) => a.workout)
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    source,
    workouts,
    skippedRows,
    hasUnknownUnits: workouts.some((w) => w.sets.some((s) => s.unit === null)),
  };
}

export function parseStrongRecords(records: Record<string, string>[]): ParseResult {
  const map = new Map<string, WorkoutAccumulator>();
  let skipped = 0;

  for (const r of records) {
    const rawDate = r["date"] ?? "";
    const date = parseDateOnly(rawDate);
    const exerciseName = (r["exercise name"] ?? "").trim();
    const setOrder = (r["set order"] ?? "").trim().toUpperCase();
    const reps = parseNumber(r["reps"]);

    if (!date || !exerciseName) {
      skipped++;
      continue;
    }
    const isNumericOrder = /^\d+$/.test(setOrder) || setOrder === "";
    const isSpecialSet = setOrder === "W" || setOrder === "D" || setOrder === "F";
    if (!isNumericOrder && !isSpecialSet) {
      // "Rest Timer", "Note", etc.
      skipped++;
      continue;
    }
    if (reps === null || reps <= 0) {
      // Cardio / timed-only sets: GymForge tracks weight x reps only
      skipped++;
      continue;
    }

    const weight = parseNumber(r["weight"]) ?? 0;
    const rpe = parseNumber(r["rpe"]);
    const title = (r["workout name"] ?? "").trim() || "Workout";
    // Group by the full timestamp so two workouts on one day stay distinct
    const key = `${rawDate}|${title}`;

    pushSet(map, key, date, title, (r["workout notes"] ?? "").trim(), {
      exerciseName,
      weight: Math.max(0, weight),
      unit: parseUnit(r["weight unit"]),
      reps: Math.round(reps),
      rpe: rpe !== null && rpe > 0 ? rpe : undefined,
      isWarmup: setOrder === "W",
    });
  }

  return finish("strong", map, skipped);
}

export function parseHevyRecords(
  headers: string[],
  records: Record<string, string>[]
): ParseResult {
  const map = new Map<string, WorkoutAccumulator>();
  let skipped = 0;
  const weightCol: { key: string; unit: WeightUnit } | null = headers.includes(
    "weight_kg"
  )
    ? { key: "weight_kg", unit: "kg" }
    : headers.includes("weight_lbs")
      ? { key: "weight_lbs", unit: "lb" }
      : headers.includes("weight_lb")
        ? { key: "weight_lb", unit: "lb" }
        : headers.includes("weight")
          ? { key: "weight", unit: "kg" }
          : null;

  for (const r of records) {
    const rawStart = r["start_time"] ?? "";
    const date = parseDateOnly(rawStart);
    const exerciseName = (r["exercise_title"] ?? "").trim();
    const reps = parseNumber(r["reps"]);
    if (!date || !exerciseName) {
      skipped++;
      continue;
    }
    if (reps === null || reps <= 0) {
      skipped++;
      continue;
    }
    const weight = weightCol ? (parseNumber(r[weightCol.key]) ?? 0) : 0;
    const rpe = parseNumber(r["rpe"]);
    const title = (r["title"] ?? "").trim() || "Workout";
    const setType = (r["set_type"] ?? "").trim().toLowerCase();
    const key = `${rawStart}|${title}`;

    pushSet(map, key, date, title, (r["description"] ?? "").trim(), {
      exerciseName,
      weight: Math.max(0, weight),
      unit: weightCol?.unit ?? "kg",
      reps: Math.round(reps),
      rpe: rpe !== null && rpe > 0 ? rpe : undefined,
      isWarmup: setType === "warmup",
    });
  }

  return finish("hevy", map, skipped);
}

export class UnsupportedCsvError extends Error {}

/** Parse a Strong or Hevy CSV export (auto-detected from its header). */
export function parseWorkoutCsv(text: string): ParseResult {
  const { headers, records } = parseCsvObjects(text);
  const source = detectSource(headers);
  if (source === "hevy") return parseHevyRecords(headers, records);
  if (source === "strong") return parseStrongRecords(records);
  throw new UnsupportedCsvError(
    "Unrecognized CSV format. Please upload a workout export from Strong or Hevy."
  );
}
