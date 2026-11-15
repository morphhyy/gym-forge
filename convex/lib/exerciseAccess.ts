import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/**
 * Exercise visibility: global catalog entries are visible to everyone, custom
 * exercises only to the user who created them. Every function that accepts an
 * exerciseId from the client must go through one of these, otherwise a user
 * can reference (and then read back) someone else's custom exercise.
 */

export function canUseExercise(
  exercise: Doc<"exercises"> | null,
  userId: string | null
): exercise is Doc<"exercises"> {
  return !!exercise && (exercise.isGlobal || (!!userId && exercise.userId === userId));
}

/** The exercise if the user may see it, else null (hides others' customs). */
export function visibleExercise(
  exercise: Doc<"exercises"> | null,
  userId: string | null
): Doc<"exercises"> | null {
  return canUseExercise(exercise, userId) ? exercise : null;
}

/** Throws "Exercise not found" unless the exercise is global or the user's own. */
export async function assertUsableExercise(
  ctx: QueryCtx,
  exerciseId: Id<"exercises">,
  userId: string
): Promise<Doc<"exercises">> {
  const exercise = await ctx.db.get(exerciseId);
  if (!canUseExercise(exercise, userId)) {
    throw new Error("Exercise not found");
  }
  return exercise;
}
