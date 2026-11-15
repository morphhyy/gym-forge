import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "./auth";
import {
  DEFAULT_REP_RANGE,
  getNextTarget,
  repRangeFromTargets,
  type NextTarget,
  type ProgressionSession,
  type RepRange,
} from "./lib/progression";
import {
  addDays,
  computeWeeklyMuscleSets,
  getWeekStart,
  isIsoDate,
  type VolumeSetInput,
} from "./lib/weeklyVolume";

/** How many recent sessions to scan for exercise history. */
const SESSION_SCAN_LIMIT = 40;
/** How many sessions per exercise feed the progression engine. */
const SESSIONS_PER_EXERCISE = 6;

// `setType` is being added to sessionSets separately; read it defensively.
function readSetType(set: Doc<"sessionSets">): string | undefined {
  const value = (set as { setType?: unknown }).setType;
  return typeof value === "string" ? value : undefined;
}

/**
 * Next double-progression target (weight x reps + reason) per exercise.
 *
 * Rep ranges come from the user's active plan (preferring `weekday` when the
 * exercise appears on several days), falling back to 8-12.
 * Pass `excludeSessionId` (e.g. the in-progress session) to base targets only
 * on previous workouts.
 */
export const getNextTargets = query({
  args: {
    exerciseIds: v.array(v.id("exercises")),
    weekday: v.optional(v.number()),
    excludeSessionId: v.optional(v.id("sessions")),
  },
  handler: async (ctx, args): Promise<Record<string, NextTarget>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId || args.exerciseIds.length === 0) return {};

    const wanted = new Set<string>(args.exerciseIds);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
      .first();
    const units = user?.units ?? "kg";

    const repRanges = await getPlanRepRanges(ctx, userId, wanted, args.weekday);

    // Most recent sessions first (by date), then group their sets by exercise.
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(SESSION_SCAN_LIMIT);

    const history = new Map<string, ProgressionSession[]>();
    for (const session of sessions) {
      if (session._id === args.excludeSessionId) continue;
      const sets = await ctx.db
        .query("sessionSets")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();

      const byExercise = new Map<string, ProgressionSession>();
      for (const set of sets) {
        if (!wanted.has(set.exerciseId)) continue;
        const list = history.get(set.exerciseId) ?? [];
        if (list.length >= SESSIONS_PER_EXERCISE) continue;
        let entry = byExercise.get(set.exerciseId);
        if (!entry) {
          entry = { date: session.date, sets: [] };
          byExercise.set(set.exerciseId, entry);
        }
        entry.sets.push({
          weight: set.weight,
          reps: set.repsActual,
          setIndex: set.setIndex,
          setType: readSetType(set),
        });
      }
      for (const [exerciseId, entry] of byExercise) {
        const list = history.get(exerciseId) ?? [];
        list.push(entry);
        history.set(exerciseId, list);
      }

      if (
        history.size === wanted.size &&
        [...history.values()].every((l) => l.length >= SESSIONS_PER_EXERCISE)
      ) {
        break;
      }
    }

    const result: Record<string, NextTarget> = {};
    for (const exerciseId of args.exerciseIds) {
      const exercise = await ctx.db.get(exerciseId);
      result[exerciseId] = getNextTarget({
        sessions: history.get(exerciseId) ?? [],
        repRange: repRanges.get(exerciseId) ?? DEFAULT_REP_RANGE,
        units,
        equipment: exercise?.equipment,
      });
    }
    return result;
  },
});

async function getPlanRepRanges(
  ctx: QueryCtx,
  userId: string,
  wanted: Set<string>,
  weekday: number | undefined
): Promise<Map<string, RepRange>> {
  const ranges = new Map<string, RepRange>();
  const plan = await ctx.db
    .query("plans")
    .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("active", true))
    .first();
  if (!plan) return ranges;

  const days = await ctx.db
    .query("planDays")
    .withIndex("by_plan", (q) => q.eq("planId", plan._id))
    .collect();
  // Preferred weekday first so its targets win.
  days.sort((a, b) => Number(b.weekday === weekday) - Number(a.weekday === weekday));

  for (const day of days) {
    const planExercises = await ctx.db
      .query("planExercises")
      .withIndex("by_plan_day", (q) => q.eq("planDayId", day._id))
      .collect();
    for (const pe of planExercises) {
      if (!wanted.has(pe.exerciseId) || ranges.has(pe.exerciseId)) continue;
      if (pe.sets.length === 0) continue;
      ranges.set(pe.exerciseId, repRangeFromTargets(pe.sets.map((s) => s.repsTarget)));
    }
  }
  return ranges;
}

/**
 * Working sets per muscle group for the current and previous week.
 * `today` must be the client's local date (YYYY-MM-DD).
 */
export const getWeeklyMuscleSets = query({
  args: {
    today: v.string(),
    weekStartsOn: v.optional(v.union(v.literal(0), v.literal(1))),
  },
  handler: async (ctx, args) => {
    if (!isIsoDate(args.today)) {
      throw new Error("today must be a YYYY-MM-DD date string");
    }
    const weekStartsOn = args.weekStartsOn ?? 0;
    const userId = await getAuthUserId(ctx);
    if (!userId) return computeWeeklyMuscleSets([], args.today, weekStartsOn);

    const from = addDays(getWeekStart(args.today, weekStartsOn), -7);
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", from).lte("date", args.today)
      )
      .collect();

    const exerciseCache = new Map<Id<"exercises">, Doc<"exercises"> | null>();
    const inputs: VolumeSetInput[] = [];
    for (const session of sessions) {
      const sets = await ctx.db
        .query("sessionSets")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const set of sets) {
        if (!exerciseCache.has(set.exerciseId)) {
          exerciseCache.set(set.exerciseId, await ctx.db.get(set.exerciseId));
        }
        inputs.push({
          date: session.date,
          muscleGroup: exerciseCache.get(set.exerciseId)?.muscleGroup,
          reps: set.repsActual,
          setType: readSetType(set),
        });
      }
    }

    return computeWeeklyMuscleSets(inputs, args.today, weekStartsOn);
  },
});
