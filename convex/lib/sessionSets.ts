import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

/**
 * All of a user's logged sets for one exercise, via the denormalised
 * `by_user_exercise` index (one query instead of one per session).
 *
 * Rows written before `sessionSets.userId` existed have no userId. Those are
 * fetched from the `userId === undefined` slice of the same index and kept
 * only if they belong to one of `ownedSessionIds` (the caller already has the
 * user's sessions). Once `sessions.backfillSessionSetUserIds` has run, that
 * slice is empty and the fallback costs a single empty index read.
 *
 * Indexed rows are also restricted to `ownedSessionIds`, so callers can pass
 * a date-ranged set of sessions to get a date-ranged result.
 */
export async function getUserExerciseSets(
  ctx: QueryCtx,
  userId: string,
  exerciseId: Id<"exercises">,
  ownedSessionIds: ReadonlySet<Id<"sessions">>
): Promise<Doc<"sessionSets">[]> {
  const indexed = await ctx.db
    .query("sessionSets")
    .withIndex("by_user_exercise", (q) =>
      q.eq("userId", userId).eq("exerciseId", exerciseId)
    )
    .collect();

  const legacy = await ctx.db
    .query("sessionSets")
    .withIndex("by_user_exercise", (q) =>
      q.eq("userId", undefined).eq("exerciseId", exerciseId)
    )
    .collect();

  return [...indexed, ...legacy].filter((set) =>
    ownedSessionIds.has(set.sessionId)
  );
}
