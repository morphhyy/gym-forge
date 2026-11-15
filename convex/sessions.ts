import { v } from "convex/values";
import { internalMutation, mutation, MutationCtx, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId, requireAuth } from "./auth";
import {
  computePlannedStreak,
  getWorkoutWeekdaysFromActivePlan,
  isWorkoutDayForDate,
} from "./lib/plannedStreak";
import { assertDateStr, monthRange, weekdayOf } from "./lib/dates";
import {
  areConsecutiveDays,
  awardStreakAchievements,
  nextCalendarStreak,
} from "./lib/streakAchievements";
import { getUserExerciseSets } from "./lib/sessionSets";
import { calculateE1RM } from "./records";

// Get or create today's session
export const getOrCreateSession = mutation({
  args: {
    date: v.string(),
    planId: v.optional(v.id("plans")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Check for existing session
    const existingSession = await ctx.db
      .query("sessions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .first();

    if (existingSession) {
      return existingSession._id;
    }

    // Weekday of the calendar date (0=Sunday, 6=Saturday), tz-independent
    assertDateStr(args.date);
    const weekday = weekdayOf(args.date);

    // Create new session
    return await ctx.db.insert("sessions", {
      userId,
      date: args.date,
      planId: args.planId,
      weekday,
      createdAt: Date.now(),
    });
  },
});

// Get session by date
export const getSessionByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .first();

    if (!session) return null;

    // Get all sets for this session
    const sets = await ctx.db
      .query("sessionSets")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();

    // Get exercise details for each set
    const setsWithExercise = await Promise.all(
      sets.map(async (set) => {
        const exercise = await ctx.db.get(set.exerciseId);
        return { ...set, exercise };
      })
    );

    return {
      ...session,
      sets: setsWithExercise,
    };
  },
});

// Log a set
export const logSet = mutation({
  args: {
    sessionId: v.id("sessions"),
    exerciseId: v.id("exercises"),
    setIndex: v.number(),
    repsActual: v.number(),
    weight: v.number(),
    rpe: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify session belongs to user
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    // Check for existing set at this index
    const existingSet = await ctx.db
      .query("sessionSets")
      .withIndex("by_session_exercise", (q) =>
        q.eq("sessionId", args.sessionId).eq("exerciseId", args.exerciseId)
      )
      .filter((q) => q.eq(q.field("setIndex"), args.setIndex))
      .first();

    if (existingSet) {
      // Update existing set
      await ctx.db.patch(existingSet._id, {
        repsActual: args.repsActual,
        weight: args.weight,
        rpe: args.rpe,
        // Backfill denormalised owner on legacy rows
        ...(existingSet.userId === undefined ? { userId } : {}),
      });
      return existingSet._id;
    } else {
      // Create new set
      return await ctx.db.insert("sessionSets", {
        sessionId: args.sessionId,
        userId,
        exerciseId: args.exerciseId,
        setIndex: args.setIndex,
        repsActual: args.repsActual,
        weight: args.weight,
        rpe: args.rpe,
        createdAt: Date.now(),
      });
    }
  },
});

type StreakResult = {
  streak: number;
  longestStreak: number;
  newAchievements: string[];
};

/**
 * Persist a new streak value for the user, awarding any streak achievements
 * crossed since `user.currentStreak`.
 */
async function applyStreakUpdate(
  ctx: MutationCtx,
  user: Doc<"users">,
  newStreak: number,
  sessionDate: string
): Promise<StreakResult> {
  const previousStreak = user.currentStreak ?? 0;
  const newLongestStreak = Math.max(user.longestStreak ?? 0, newStreak);
  const newAchievements = await awardStreakAchievements(
    ctx,
    user.clerkUserId,
    previousStreak,
    newStreak
  );

  await ctx.db.patch(user._id, {
    currentStreak: newStreak,
    longestStreak: newLongestStreak,
    lastWorkoutDate: sessionDate,
  });

  return { streak: newStreak, longestStreak: newLongestStreak, newAchievements };
}

/**
 * Update the user's streak for a newly completed session on `sessionDate`.
 * - Active plan + planned workout day: plan-aware streak.
 * - No active plan: calendar streak (consecutive days).
 * - Active plan + rest day: streak unchanged, lastWorkoutDate recorded.
 * Returns null when nothing changed (no-plan user, same date as last workout).
 */
async function updateStreakForCompletion(
  ctx: MutationCtx,
  user: Doc<"users">,
  sessionDate: string
): Promise<StreakResult | null> {
  const userId = user.clerkUserId;
  const currentStoredStreak = user.currentStreak ?? 0;
  const longestStreak = user.longestStreak ?? 0;

  // Get workout weekdays from active plan (null if no plan / no workout days)
  const workoutWeekdays = await getWorkoutWeekdaysFromActivePlan(ctx, userId);

  if (!workoutWeekdays || workoutWeekdays.size === 0) {
    // Fallback: no active plan, use calendar-based streak logic
    if (user.lastWorkoutDate === sessionDate) return null;
    const newStreak = nextCalendarStreak(
      user.lastWorkoutDate,
      currentStoredStreak,
      sessionDate
    );
    return await applyStreakUpdate(ctx, user, newStreak, sessionDate);
  }

  if (isWorkoutDayForDate(sessionDate, workoutWeekdays)) {
    // Planned workout day: plan-aware streak computation
    const { streak } = await computePlannedStreak(ctx, userId, sessionDate, workoutWeekdays);
    return await applyStreakUpdate(ctx, user, streak, sessionDate);
  }

  // Rest day workout: don't update streak, but still record lastWorkoutDate
  await ctx.db.patch(user._id, { lastWorkoutDate: sessionDate });
  return {
    streak: currentStoredStreak,
    longestStreak,
    newAchievements: [],
  };
}

// Complete a session
export const completeSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    // Only update streak if session wasn't already completed
    const wasAlreadyCompleted = session.completedAt !== undefined;

    await ctx.db.patch(args.sessionId, {
      completedAt: Date.now(),
      notes: args.notes,
    });

    // Update streak if this is a new completion
    let streakResult: StreakResult | null = null;
    if (!wasAlreadyCompleted) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
        .first();

      if (user) {
        streakResult = await updateStreakForCompletion(ctx, user, session.date);
      }
    }

    return { success: true, streakResult };
  },
});

// Get recent sessions
export const getRecentSessions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit ?? 10;

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return sessions;
  },
});

// Get session sets for an exercise (for pre-filling)
export const getLastWeightForExercise = query({
  args: { exerciseId: v.id("exercises") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get recent sessions
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);

    for (const session of sessions) {
      const sets = await ctx.db
        .query("sessionSets")
        .withIndex("by_session_exercise", (q) =>
          q.eq("sessionId", session._id).eq("exerciseId", args.exerciseId)
        )
        .first();

      if (sets) {
        return sets.weight;
      }
    }

    return null;
  },
});

// Get sessions for a specific month (for calendar view)
export const getSessionsForMonth = query({
  args: {
    year: v.number(),
    month: v.number(), // 1-12
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Calendar date range for the month
    const { start: startDate, end: endDate } = monthRange(args.year, args.month);

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", startDate).lte("date", endDate)
      )
      .collect();

    // Cache exercise names across sessions
    const exerciseNames = new Map<Id<"exercises">, Promise<string>>();
    const getExerciseName = (id: Id<"exercises">) => {
      let name = exerciseNames.get(id);
      if (!name) {
        name = ctx.db.get(id).then((e) => e?.name ?? "Unknown");
        exerciseNames.set(id, name);
      }
      return name;
    };

    // Enrich each session with summary data
    const enriched = await Promise.all(
      sessions.map(async (session) => {
        const sets = await ctx.db
          .query("sessionSets")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();

        const exerciseMap = new Map<string, { name: string; setCount: number }>();
        let totalVolume = 0;

        for (const set of sets) {
          totalVolume += set.weight * set.repsActual;
          if (!exerciseMap.has(set.exerciseId)) {
            exerciseMap.set(set.exerciseId, {
              name: await getExerciseName(set.exerciseId),
              setCount: 0,
            });
          }
          const entry = exerciseMap.get(set.exerciseId)!;
          entry.setCount += 1;
        }

        return {
          _id: session._id,
          date: session.date,
          completedAt: session.completedAt,
          totalSets: sets.length,
          totalVolume,
          exerciseCount: exerciseMap.size,
          exercises: Array.from(exerciseMap.values()),
        };
      })
    );

    return enriched;
  },
});

// Get last weights for multiple exercises (for pre-filling workout log)
export const getLastWeightsForExercises = query({
  args: { exerciseIds: v.array(v.id("exercises")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {};

    // Get recent completed sessions
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .filter((q) => q.neq(q.field("completedAt"), undefined))
      .take(20);

    const lastWeights: Record<string, Record<number, number>> = {};
    const remaining = new Set<string>(args.exerciseIds);

    // Walk sessions newest-first, loading each session's sets once (at most 20
    // queries total, independent of how many exercises are requested). The
    // first session containing an exercise provides its weights.
    for (const session of sessions) {
      if (remaining.size === 0) break;

      const sets = await ctx.db
        .query("sessionSets")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();

      const foundHere = new Set<string>();
      for (const set of sets) {
        if (!remaining.has(set.exerciseId)) continue;
        if (!foundHere.has(set.exerciseId)) {
          foundHere.add(set.exerciseId);
          lastWeights[set.exerciseId] = {};
        }
        lastWeights[set.exerciseId][set.setIndex] = set.weight;
      }
      for (const id of foundHere) remaining.delete(id);
    }

    return lastWeights;
  },
});

type PRType = "weight" | "volume" | "e1rm";

function prValue(type: PRType, set: Doc<"sessionSets">): number {
  switch (type) {
    case "weight":
      return set.weight;
    case "volume":
      return set.weight * set.repsActual;
    case "e1rm":
      return calculateE1RM(set.weight, set.repsActual);
  }
}

/**
 * Best remaining set for a PR type. Ties go to the earliest session (then
 * earliest set), matching checkAndUpdatePR which only replaces a PR on a
 * strictly greater value.
 */
function bestSetFor(
  type: PRType,
  sets: Doc<"sessionSets">[],
  sessionDates: Map<Id<"sessions">, string>
): { set: Doc<"sessionSets">; value: number; date: string } | null {
  let best: { set: Doc<"sessionSets">; value: number; date: string } | null = null;
  for (const set of sets) {
    const date = sessionDates.get(set.sessionId);
    if (date === undefined) continue;
    const value = prValue(type, set);
    if (
      !best ||
      value > best.value ||
      (value === best.value &&
        (date < best.date ||
          (date === best.date && set.createdAt < best.set.createdAt)))
    ) {
      best = { set, value, date };
    }
  }
  return best;
}

/**
 * Recompute stored streak bookkeeping after a completed session is removed:
 * lastWorkoutDate becomes the latest remaining completed session, and
 * currentStreak is recomputed as of that date (plan-aware if the user has an
 * active plan, otherwise consecutive calendar days). longestStreak and
 * already-awarded achievements are historical and left untouched.
 */
async function recomputeStreakAfterDelete(
  ctx: MutationCtx,
  user: Doc<"users">,
  remainingSessions: Doc<"sessions">[]
): Promise<void> {
  const completedDates = Array.from(
    new Set(
      remainingSessions
        .filter((s) => s.completedAt !== undefined)
        .map((s) => s.date)
    )
  ).sort((a, b) => b.localeCompare(a)); // newest first

  const newLast = completedDates[0];
  let newStreak = 0;

  if (newLast) {
    const workoutWeekdays = await getWorkoutWeekdaysFromActivePlan(ctx, user.clerkUserId);
    if (workoutWeekdays && workoutWeekdays.size > 0) {
      newStreak = (
        await computePlannedStreak(ctx, user.clerkUserId, newLast, workoutWeekdays)
      ).streak;
    } else {
      newStreak = 1;
      for (let i = 1; i < completedDates.length; i++) {
        if (!areConsecutiveDays(completedDates[i], completedDates[i - 1])) break;
        newStreak++;
      }
    }
  }

  await ctx.db.patch(user._id, {
    currentStreak: newStreak,
    lastWorkoutDate: newLast,
  });
}

// Delete a whole logged session (owner only): its sets, and any personal
// records it held (recomputed from the user's remaining sets).
export const deleteSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    // 1. Delete the session's sets
    const sets = await ctx.db
      .query("sessionSets")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();
    for (const set of sets) {
      await ctx.db.delete(set._id);
    }

    // 2. Delete the session itself
    await ctx.db.delete(session._id);

    // The user's remaining sessions (deleted one is already gone)
    const remainingSessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // 3. Personal records held by this session. There is one PR row per
    // (user, exercise, type); if this session held it, replace it with the
    // best remaining set (or drop it if none remain).
    const affectedPRs = (
      await ctx.db
        .query("personalRecords")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).filter((pr) => pr.sessionId === session._id);

    let recomputedPRs = 0;
    if (affectedPRs.length > 0) {
      const sessionDates = new Map(remainingSessions.map((s) => [s._id, s.date]));
      const ownedSessionIds = new Set(sessionDates.keys());

      const byExercise = new Map<Id<"exercises">, typeof affectedPRs>();
      for (const pr of affectedPRs) {
        const list = byExercise.get(pr.exerciseId);
        if (list) list.push(pr);
        else byExercise.set(pr.exerciseId, [pr]);
      }

      for (const [exerciseId, prs] of byExercise) {
        const remainingSets = await getUserExerciseSets(
          ctx,
          userId,
          exerciseId,
          ownedSessionIds
        );

        for (const pr of prs) {
          await ctx.db.delete(pr._id);

          const best = bestSetFor(pr.recordType, remainingSets, sessionDates);
          if (best) {
            await ctx.db.insert("personalRecords", {
              userId,
              exerciseId,
              recordType: pr.recordType,
              value: best.value,
              reps: pr.recordType === "weight" ? best.set.repsActual : undefined,
              setDate: best.date,
              sessionId: best.set.sessionId,
              createdAt: Date.now(),
            });
            recomputedPRs++;
          }
        }
      }
    }

    // 4. Streak bookkeeping, only if the deleted session counted as a workout
    if (session.completedAt !== undefined) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
        .first();
      if (user) {
        await recomputeStreakAfterDelete(ctx, user, remainingSessions);
      }
    }

    return {
      success: true,
      deletedSets: sets.length,
      removedPRs: affectedPRs.length,
      recomputedPRs,
    };
  },
});

// One-off backfill of sessionSets.userId for rows written before the field
// existed. Run from the Convex dashboard / CLI:
//   npx convex run sessions:backfillSessionSetUserIds '{}'
// It pages through the table and reschedules itself until done. Safe to re-run.
export const backfillSessionSetUserIds = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args): Promise<{ patched: number; isDone: boolean }> => {
    const page = await ctx.db
      .query("sessionSets")
      .paginate({ cursor: args.cursor ?? null, numItems: 200 });

    const owners = new Map<Id<"sessions">, string | null>();
    let patched = 0;

    for (const set of page.page) {
      if (set.userId !== undefined) continue;
      let owner = owners.get(set.sessionId);
      if (owner === undefined) {
        owner = (await ctx.db.get(set.sessionId))?.userId ?? null;
        owners.set(set.sessionId, owner);
      }
      if (owner) {
        await ctx.db.patch(set._id, { userId: owner });
        patched++;
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.sessions.backfillSessionSetUserIds, {
        cursor: page.continueCursor,
      });
    }

    return { patched, isDone: page.isDone };
  },
});
