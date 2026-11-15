import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "./auth";
import { getWorkoutWeekdaysFromActivePlan } from "./lib/plannedStreak";
import { getPreviousWeekRange, isValidDateString, weekdayOf } from "./lib/recapDates";

/**
 * In-app weekly recap for the previous Sunday-Saturday week.
 * `today` must be the client's local date (YYYY-MM-DD); the server never
 * derives "today" itself.
 */
export const getWeeklyRecap = query({
  args: { today: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    if (!isValidDateString(args.today)) throw new Error("Invalid date. Expected YYYY-MM-DD.");

    const { start, end } = getPreviousWeekRange(args.today);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
      .unique();
    const weeklyGoal = user?.weeklyGoal ?? 3;

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", start).lte("date", end)
      )
      .collect();

    const workouts: {
      date: string;
      setCount: number;
      exerciseCount: number;
      volume: number;
      completed: boolean;
    }[] = [];
    let totalVolume = 0;
    let totalSets = 0;

    for (const s of sessions) {
      const sets = await ctx.db
        .query("sessionSets")
        .withIndex("by_session", (q) => q.eq("sessionId", s._id))
        .collect();
      // Empty, never-completed sessions (opened the logger but did nothing) don't count
      if (sets.length === 0 && !s.completedAt) continue;
      const volume = sets.reduce((sum, set) => sum + set.weight * set.repsActual, 0);
      totalVolume += volume;
      totalSets += sets.length;
      workouts.push({
        date: s.date,
        setCount: sets.length,
        exerciseCount: new Set(sets.map((x) => x.exerciseId)).size,
        volume,
        completed: !!s.completedAt,
      });
    }
    workouts.sort((a, b) => a.date.localeCompare(b.date));

    // PRs set during the week, one entry per exercise (best type shown first)
    const prs = await ctx.db
      .query("personalRecords")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(q.gte(q.field("setDate"), start), q.lte(q.field("setDate"), end))
      )
      .collect();
    const typeRank = { weight: 0, e1rm: 1, volume: 2 } as const;
    const prByExercise = new Map<Id<"exercises">, (typeof prs)[number]>();
    for (const pr of prs) {
      const cur = prByExercise.get(pr.exerciseId);
      if (!cur || typeRank[pr.recordType] < typeRank[cur.recordType]) {
        prByExercise.set(pr.exerciseId, pr);
      }
    }
    const prList = await Promise.all(
      Array.from(prByExercise.values()).map(async (pr) => {
        const ex = await ctx.db.get(pr.exerciseId);
        return {
          exerciseName: ex?.name ?? "Unknown exercise",
          recordType: pr.recordType,
          value: pr.value,
          reps: pr.reps,
          date: pr.setDate,
        };
      })
    );

    // Adherence vs the active plan's scheduled weekdays
    const plannedWeekdays = await getWorkoutWeekdaysFromActivePlan(ctx, userId);
    let plannedCount = 0;
    let plannedCompleted = 0;
    if (plannedWeekdays) {
      plannedCount = plannedWeekdays.size;
      const doneWeekdays = new Set(workouts.map((w) => weekdayOf(w.date)));
      for (const wd of plannedWeekdays) if (doneWeekdays.has(wd)) plannedCompleted++;
    }

    return {
      weekStart: start,
      weekEnd: end,
      units: user?.units ?? "kg",
      workoutCount: workouts.length,
      workouts,
      totalVolume: Math.round(totalVolume),
      totalSets,
      prCount: prList.length,
      prs: prList.sort((a, b) => a.date.localeCompare(b.date)),
      plan: plannedWeekdays
        ? {
            planned: plannedCount,
            completed: plannedCompleted,
            adherencePct: Math.round((plannedCompleted / plannedCount) * 100),
          }
        : null,
      goal: {
        weeklyGoal,
        completed: workouts.length,
        adherencePct: Math.min(100, Math.round((workouts.length / Math.max(1, weeklyGoal)) * 100)),
      },
    };
  },
});
