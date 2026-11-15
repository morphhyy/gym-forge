import type { Id } from "@/convex/_generated/dataModel";
import type { SessionExerciseEntry } from "@/convex/lib/sessionExercises";
import { parseReps, parseWeight, type SetType } from "@/app/lib/workout-logger";

export type ExerciseInfo = {
  _id: Id<"exercises">;
  name: string;
  muscleGroup?: string;
  equipment?: string;
};

/** One exercise in the logger: session entry + resolved exercise details. */
export type LoggerExercise = SessionExerciseEntry & {
  exercise: ExerciseInfo | null;
  swappedFromName?: string;
};

export type LoggedSet = {
  _id: Id<"sessionSets">;
  exerciseId: Id<"exercises">;
  setIndex: number;
  weight: number;
  repsActual: number;
  rpe?: number;
  setType?: SetType;
  createdAt: number;
};

/** Unsaved local edits for a set row (strings so "62." / "62,5" survive typing). */
export type SetDraft = {
  weight?: string;
  reps?: string;
  /** null = explicitly cleared */
  rpe?: number | null;
  setType?: SetType;
};

export type LastTimeSet = {
  setIndex: number;
  weight: number;
  reps: number;
  rpe?: number;
  setType?: SetType;
};

export type LastTime = { date: string; sets: LastTimeSet[] };

export const setKey = (exerciseId: string, setIndex: number) => `${exerciseId}-${setIndex}`;

/**
 * What a set row would save right now: typed value, else the already logged
 * value, else the suggestion (last time's weight / target reps), which is
 * shown as the input placeholder.
 */
export function resolveSetValues(args: {
  draft: SetDraft | undefined;
  logged: LoggedSet | undefined;
  suggestedWeight: number | undefined;
  suggestedReps: number | undefined;
}): {
  weightText: string;
  repsText: string;
  weight: number | null;
  reps: number | null;
  rpe: number | undefined;
  setType: SetType;
} {
  const { draft, logged } = args;
  const weightText = draft?.weight ?? (logged ? String(logged.weight) : "");
  const repsText = draft?.reps ?? (logged ? String(logged.repsActual) : "");
  const weight =
    weightText.trim() === "" ? (args.suggestedWeight ?? null) : parseWeight(weightText);
  const reps =
    repsText.trim() === "" ? (args.suggestedReps ?? null) : parseReps(repsText);
  const rpe =
    draft?.rpe === null ? undefined : (draft?.rpe ?? logged?.rpe);
  const setType = draft?.setType ?? logged?.setType ?? "normal";
  return { weightText, repsText, weight, reps, rpe, setType };
}
