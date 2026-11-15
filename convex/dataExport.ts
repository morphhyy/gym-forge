import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireAuth } from "./auth";

/*
 * Data export queries. Large tables are exposed as paginated queries so the
 * client can walk the full history without hitting per-transaction read
 * limits; the client assembles CSV/JSON locally.
 */

// Sessions with their sets (and resolved exercise names), one page at a time.
export const exportSessionsPage = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const page = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .paginate(args.paginationOpts);

    const exerciseNames = new Map<Id<"exercises">, string>();
    const getName = async (id: Id<"exercises">) => {
      if (!exerciseNames.has(id)) {
        const ex = await ctx.db.get(id);
        exerciseNames.set(id, ex?.name ?? "Unknown exercise");
      }
      return exerciseNames.get(id)!;
    };

    const sessions = await Promise.all(
      page.page.map(async (s) => {
        const sets = await ctx.db
          .query("sessionSets")
          .withIndex("by_session", (q) => q.eq("sessionId", s._id))
          .collect();
        const withNames = [];
        for (const set of sets) {
          withNames.push({
            exerciseId: set.exerciseId,
            exerciseName: await getName(set.exerciseId),
            setIndex: set.setIndex,
            repsActual: set.repsActual,
            weight: set.weight,
            rpe: set.rpe,
            createdAt: set.createdAt,
          });
        }
        withNames.sort(
          (a, b) =>
            a.exerciseName.localeCompare(b.exerciseName) || a.setIndex - b.setIndex
        );
        return {
          _id: s._id,
          date: s.date,
          planId: s.planId,
          weekday: s.weekday,
          completedAt: s.completedAt,
          notes: s.notes,
          createdAt: s.createdAt,
          sets: withNames,
        };
      })
    );

    return { ...page, page: sessions };
  },
});

export const exportBodyWeightsPage = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query("bodyWeights")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .paginate(args.paginationOpts);
  },
});

export const exportFoodEntriesPage = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const page = await ctx.db
      .query("foodEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .paginate(args.paginationOpts);
    // Storage ids are internal; export a flag instead of the id.
    return {
      ...page,
      page: page.page.map(({ imageStorageId, ...rest }) => ({
        ...rest,
        hasImage: imageStorageId !== undefined,
      })),
    };
  },
});

export const exportPersonalRecordsPage = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query("personalRecords")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .paginate(args.paginationOpts);
  },
});

// Small, bounded per-user data: profile, custom exercises, plans, goals, achievements.
export const exportProfileData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    const customExercises = await ctx.db
      .query("exercises")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const plans = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const exerciseNameCache = new Map<Id<"exercises">, string>();
    const plansWithDays = await Promise.all(
      plans.map(async (plan) => {
        const days = await ctx.db
          .query("planDays")
          .withIndex("by_plan", (q) => q.eq("planId", plan._id))
          .collect();
        const daysWithExercises = await Promise.all(
          days.map(async (day) => {
            const pes = await ctx.db
              .query("planExercises")
              .withIndex("by_plan_day", (q) => q.eq("planDayId", day._id))
              .collect();
            const exercises = [];
            for (const pe of pes.sort((a, b) => a.order - b.order)) {
              if (!exerciseNameCache.has(pe.exerciseId)) {
                const ex = await ctx.db.get(pe.exerciseId);
                exerciseNameCache.set(pe.exerciseId, ex?.name ?? "Unknown exercise");
              }
              exercises.push({
                exerciseId: pe.exerciseId,
                exerciseName: exerciseNameCache.get(pe.exerciseId)!,
                order: pe.order,
                sets: pe.sets,
                restSeconds: pe.restSeconds,
                supersetGroup: pe.supersetGroup,
              });
            }
            return { weekday: day.weekday, name: day.name, exercises };
          })
        );
        return {
          _id: plan._id,
          name: plan.name,
          active: plan.active,
          createdAt: plan.createdAt,
          planVersion: plan.planVersion,
          days: daysWithExercises.sort((a, b) => a.weekday - b.weekday),
        };
      })
    );

    const nutritionGoals = await ctx.db
      .query("nutritionGoals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return {
      user: user ? sanitizeUser(user) : null,
      customExercises: customExercises.map((e) => ({
        _id: e._id,
        name: e.name,
        muscleGroup: e.muscleGroup,
        equipment: e.equipment,
        createdAt: e.createdAt,
      })),
      plans: plansWithDays,
      nutritionGoals,
      achievements,
    };
  },
});

function sanitizeUser(user: Doc<"users">) {
  return {
    email: user.email,
    displayName: user.displayName,
    units: user.units,
    goals: user.goals,
    weeklyGoal: user.weeklyGoal,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    lastWorkoutDate: user.lastWorkoutDate,
    defaultRestSeconds: user.defaultRestSeconds,
    restTimerSound: user.restTimerSound,
    restTimerVibrate: user.restTimerVibrate,
    createdAt: user.createdAt,
  };
}

