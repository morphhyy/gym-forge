/**
 * Session exercise list — how the logger decides which exercises (and how many
 * set rows) a workout session has.
 *
 * Design
 * ------
 * A session starts out *template-derived*: its exercise list is the plan day's
 * exercises (in plan order), plus any exercise that has logged sets but is not
 * in the template (back-compat for sessions logged before this existed). Each
 * template exercise gets max(template set count, highest logged setIndex + 1)
 * rows. This derivation is a pure function of (template, logged sets) and runs
 * identically on the client (before a session exists / for old sessions) and
 * on the server.
 *
 * The first *structural* edit (add/remove a set row, add/swap/remove an
 * exercise) *materializes* the derived list into `sessions.exercises`. From
 * then on that snapshot is the single source of truth for that session and the
 * template is ignored, so later edits to the plan never rewrite history, and a
 * freestyle session (no plan / rest day) is simply a session whose snapshot
 * starts empty.
 *
 * Invariants
 * - An exerciseId appears at most once per session, because logged sets are
 *   keyed by (sessionId, exerciseId, setIndex).
 * - Logged setIndexes for an exercise are contiguous 0..n-1 (deleteSet
 *   re-indexes the sets after the removed one), and `sets.length` >= n.
 */

import type { Id } from "../_generated/dataModel";

export type SessionExerciseEntry = {
  /** Stable key for UI lists (planExercise id, or "x-<exerciseId>" for ad-hoc). */
  key: string;
  exerciseId: Id<"exercises">;
  planExerciseId?: Id<"planExercises">;
  /** Planned set rows. `repsTarget` is absent for ad-hoc rows. */
  sets: { repsTarget?: number }[];
  supersetGroup?: string;
  restSeconds?: number;
  /** Set when the exercise was swapped for this session only. */
  swappedFromExerciseId?: Id<"exercises">;
};

export type TemplateExerciseInput = {
  _id: Id<"planExercises">;
  exerciseId: Id<"exercises">;
  sets: { repsTarget: number }[];
  supersetGroup?: string;
  restSeconds?: number;
};

export type LoggedSetInput = {
  exerciseId: Id<"exercises">;
  setIndex: number;
};

export function adHocKey(exerciseId: Id<"exercises">): string {
  return `x-${exerciseId}`;
}

export function deriveSessionExercises(
  template: readonly TemplateExerciseInput[],
  loggedSets: readonly LoggedSetInput[]
): SessionExerciseEntry[] {
  const loggedCount = new Map<string, number>();
  const loggedOrder: Id<"exercises">[] = [];
  for (const s of loggedSets) {
    const prev = loggedCount.get(s.exerciseId);
    if (prev === undefined) loggedOrder.push(s.exerciseId);
    loggedCount.set(s.exerciseId, Math.max(prev ?? 0, s.setIndex + 1));
  }

  const result: SessionExerciseEntry[] = [];
  const seen = new Set<string>();
  for (const pe of template) {
    if (seen.has(pe.exerciseId)) continue; // duplicate in template: keep first
    seen.add(pe.exerciseId);
    const rows: { repsTarget?: number }[] = pe.sets.map((s) => ({
      repsTarget: s.repsTarget,
    }));
    const logged = loggedCount.get(pe.exerciseId) ?? 0;
    while (rows.length < logged) rows.push({});
    result.push({
      key: pe._id,
      exerciseId: pe.exerciseId,
      planExerciseId: pe._id,
      sets: rows,
      supersetGroup: pe.supersetGroup,
      restSeconds: pe.restSeconds,
    });
  }

  for (const exerciseId of loggedOrder) {
    if (seen.has(exerciseId)) continue;
    seen.add(exerciseId);
    result.push({
      key: adHocKey(exerciseId),
      exerciseId,
      sets: Array.from({ length: loggedCount.get(exerciseId) ?? 1 }, () => ({})),
    });
  }

  return result;
}
