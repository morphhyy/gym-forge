import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { getAuthUserId } from "./auth";
import { addDays, resolveToday, weekStartSunday } from "./lib/dates";
import { getUserExerciseSets } from "./lib/sessionSets";

// Client's local calendar date (YYYY-MM-DD). Optional only so older clients
// keep validating; falls back to the UTC date when omitted.
const todayArg = v.optional(v.string());

// Get exercise history for charts
export const getExerciseHistory = query({
  args: {
    exerciseId: v.id("exercises"),
    days: v.optional(v.number()), // Number of days to look back
    today: todayArg,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const daysBack = args.days ?? 90;
    const cutoffString = addDays(resolveToday(args.today), -daysBack);

    // User's sessions in range (index range query, no table scan)
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", cutoffString)
      )
      .collect();
    const sessionById = new Map(sessions.map((s) => [s._id, s]));

    // All sets for this exercise in those sessions in one indexed read
    // (plus legacy rows without userId), instead of one query per session.
    const exerciseSets = await getUserExerciseSets(
      ctx,
      userId,
      args.exerciseId,
      new Set(sessionById.keys())
    );

    const setsBySession = new Map<Id<"sessions">, typeof exerciseSets>();
    for (const set of exerciseSets) {
      if (set.setType === "warmup") continue; // exclude warm-ups
      const list = setsBySession.get(set.sessionId);
      if (list) list.push(set);
      else setsBySession.set(set.sessionId, [set]);
    }

    const history = [];
    for (const [sessionId, sets] of setsBySession) {
      const session = sessionById.get(sessionId)!;

      // Calculate metrics
      const topSet = sets.reduce((best, set) =>
        set.weight > best.weight ? set : best
        , sets[0]);

      const totalVolume = sets.reduce(
        (sum, set) => sum + set.weight * set.repsActual,
        0
      );

      // Estimated 1RM using Epley formula: weight * (1 + reps/30)
      const estimated1RM = topSet.weight * (1 + topSet.repsActual / 30);

      history.push({
        date: session.date,
        sessionId: session._id,
        topSetWeight: topSet.weight,
        topSetReps: topSet.repsActual,
        totalVolume,
        estimated1RM: Math.round(estimated1RM * 10) / 10,
        setCount: sets.length,
        sets: sets.sort((a, b) => a.setIndex - b.setIndex),
      });
    }

    // Sort by date ascending
    return history.sort((a, b) => a.date.localeCompare(b.date));
  },
});

// Get weekly summary
export const getWeeklySummary = query({
  args: {
    weeks: v.optional(v.number()),
    today: todayArg,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const weeksBack = args.weeks ?? 8;
    const cutoffString = addDays(resolveToday(args.today), -weeksBack * 7);

    // Get all sessions in range (index range query)
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", cutoffString)
      )
      .collect();

    // Group by week
    const weeklyData: Record<string, {
      weekStart: string;
      sessionCount: number;
      totalVolume: number;
      exerciseIds: Set<string>;
      completedSessions: number;
    }> = {};

    for (const session of sessions) {
      const weekStart = weekStartSunday(session.date);

      if (!weeklyData[weekStart]) {
        weeklyData[weekStart] = {
          weekStart,
          sessionCount: 0,
          totalVolume: 0,
          exerciseIds: new Set(),
          completedSessions: 0,
        };
      }

      weeklyData[weekStart].sessionCount++;
      if (session.completedAt) {
        weeklyData[weekStart].completedSessions++;
      }

      // Get all sets for this session
      const sets = await ctx.db
        .query("sessionSets")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .filter((q) => q.neq(q.field("setType"), "warmup")) // exclude warm-ups
        .collect();

      for (const set of sets) {
        weeklyData[weekStart].totalVolume += set.weight * set.repsActual;
        weeklyData[weekStart].exerciseIds.add(set.exerciseId);
      }
    }

    // Convert to array and sort
    return Object.values(weeklyData)
      .map((week) => ({
        ...week,
        uniqueExercises: week.exerciseIds.size,
        exerciseIds: undefined,
      }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  },
});

// Get all exercise stats for dashboard
export const getAllExerciseStats = query({
  args: { today: todayArg },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get ALL user sessions (not just last 30 days) for accurate stats
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Calculate date thresholds
    const sevenDaysAgoString = addDays(resolveToday(args.today), -7);

    // Aggregate by exercise
    const exerciseStats: Record<string, {
      exerciseId: string;
      lastWeight: number;
      lastDate: string;
      sessionDates: Set<string>; // Track unique session dates
      totalVolume: number;
      bestWeight: number;
      bestWeightDate: string; // When PR was set
      oldestWeight: number; // First recorded weight
      oldestDate: string; // First session date
    }> = {};

    for (const session of sessions) {
      const sets = await ctx.db
        .query("sessionSets")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .filter((q) => q.neq(q.field("setType"), "warmup")) // exclude warm-ups
        .collect();

      for (const set of sets) {
        const id = set.exerciseId;
        if (!exerciseStats[id]) {
          exerciseStats[id] = {
            exerciseId: id,
            lastWeight: 0,
            lastDate: "",
            sessionDates: new Set(),
            totalVolume: 0,
            bestWeight: 0,
            bestWeightDate: "",
            oldestWeight: set.weight,
            oldestDate: session.date,
          };
        }

        const stats = exerciseStats[id];
        stats.totalVolume += set.weight * set.repsActual;
        stats.sessionDates.add(session.date);

        // Track best weight and when it was set
        if (set.weight > stats.bestWeight) {
          stats.bestWeight = set.weight;
          stats.bestWeightDate = session.date;
        }

        // Track most recent session
        if (session.date > stats.lastDate) {
          stats.lastDate = session.date;
          stats.lastWeight = set.weight;
        }

        // Track oldest session for trend calculation
        if (session.date < stats.oldestDate) {
          stats.oldestDate = session.date;
          stats.oldestWeight = set.weight;
        }
      }
    }

    // Get exercise details
    const statsWithNames = await Promise.all(
      Object.values(exerciseStats).map(async (stats) => {
        const exerciseId = stats.exerciseId as Id<"exercises">;
        const exercise = await ctx.db.get(exerciseId);

        // Calculate if PR was recent (within 7 days)
        const recentPR = stats.bestWeightDate >= sevenDaysAgoString;

        return {
          exerciseId: stats.exerciseId,
          exerciseName: exercise?.name ?? "Unknown",
          muscleGroup: exercise?.muscleGroup,
          lastWeight: stats.lastWeight,
          lastDate: stats.lastDate,
          sessionCount: stats.sessionDates.size, // Proper count of unique sessions
          totalVolume: stats.totalVolume,
          bestWeight: stats.bestWeight,
          bestWeightDate: stats.bestWeightDate,
          oldestWeight: stats.oldestWeight,
          recentPR,
        };
      })
    );

    return statsWithNames.sort((a, b) =>
      b.lastDate.localeCompare(a.lastDate)
    );
  },
});
