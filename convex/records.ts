import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, getAuthUserId } from "./auth";
import { Id } from "./_generated/dataModel";

// Calculate estimated 1RM using Epley formula (same as frontend)
function calculateE1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

// Check and update PR after logging a set
// Returns info about any new PR set
export const checkAndUpdatePR = mutation({
  args: {
    sessionId: v.id("sessions"),
    exerciseId: v.id("exercises"),
    weight: v.number(),
    reps: v.number(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Calculate metrics for this set
    const e1rm = calculateE1RM(args.weight, args.reps);
    const volume = args.weight * args.reps;

    const newPRs: Array<{
      type: "weight" | "volume" | "e1rm";
      value: number;
      previousValue?: number;
    }> = [];

    // Check each PR type
    const prTypes: Array<{
      type: "weight" | "volume" | "e1rm";
      value: number;
      reps?: number;
    }> = [
      { type: "weight", value: args.weight, reps: args.reps },
      { type: "e1rm", value: e1rm },
      { type: "volume", value: volume },
    ];

    for (const prType of prTypes) {
      // Get current PR for this exercise and type
      const currentPR = await ctx.db
        .query("personalRecords")
        .withIndex("by_user_exercise_type", (q) =>
          q
            .eq("userId", userId)
            .eq("exerciseId", args.exerciseId)
            .eq("recordType", prType.type)
        )
        .first();

      // Check if this is a new PR
      if (!currentPR || prType.value > currentPR.value) {
        const previousValue = currentPR?.value;

        // Delete old PR if exists
        if (currentPR) {
          await ctx.db.delete(currentPR._id);
        }

        // Insert new PR
        await ctx.db.insert("personalRecords", {
          userId,
          exerciseId: args.exerciseId,
          recordType: prType.type,
          value: prType.value,
          reps: prType.reps,
          setDate: args.date,
          sessionId: args.sessionId,
          previousValue,
          createdAt: Date.now(),
        });

        newPRs.push({
          type: prType.type,
          value: prType.value,
          previousValue,
        });
      }
    }

    // Award first PR achievement if this is user's first PR
    if (newPRs.length > 0) {
      const existingFirstPR = await ctx.db
        .query("achievements")
        .withIndex("by_user_type", (q) =>
          q.eq("userId", userId).eq("type", "first_pr")
        )
        .first();

      if (!existingFirstPR) {
        await ctx.db.insert("achievements", {
          userId,
          type: "first_pr",
          unlockedAt: Date.now(),
          metadata: { exerciseId: args.exerciseId },
        });
        return { newPRs, newAchievement: "first_pr" };
      }
    }

    return { newPRs, newAchievement: null };
  },
});

// Get all PRs for a specific exercise
export const getExercisePRs = query({
  args: {
    exerciseId: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const prs = await ctx.db
      .query("personalRecords")
      .withIndex("by_user_exercise", (q) =>
        q.eq("userId", userId).eq("exerciseId", args.exerciseId)
      )
      .collect();

    // Get exercise details
    const exercise = await ctx.db.get(args.exerciseId);

    return {
      exercise,
      prs: prs.reduce(
        (acc, pr) => {
          acc[pr.recordType] = {
            value: pr.value,
            reps: pr.reps,
            date: pr.setDate,
            previousValue: pr.previousValue,
          };
          return acc;
        },
        {} as Record<
          string,
          { value: number; reps?: number; date: string; previousValue?: number }
        >
      ),
    };
  },
});

// Get recent PRs across all exercises
export const getRecentPRs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit ?? 10;

    const prs = await ctx.db
      .query("personalRecords")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    // Get exercise details for each PR
    const prsWithExercise = await Promise.all(
      prs.map(async (pr) => {
        const exercise = await ctx.db.get(pr.exerciseId);
        return {
          ...pr,
          exercise,
        };
      })
    );

    return prsWithExercise;
  },
});

// Get all-time PRs (best for each exercise, grouped by type)
export const getAllTimePRs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const prs = await ctx.db
      .query("personalRecords")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Group by exercise and get best for each type
    const exerciseMap = new Map<
      string,
      {
        exerciseId: Id<"exercises">;
        weight?: { value: number; reps?: number; date: string };
        e1rm?: { value: number; date: string };
        volume?: { value: number; date: string };
      }
    >();

    for (const pr of prs) {
      const key = pr.exerciseId;
      if (!exerciseMap.has(key)) {
        exerciseMap.set(key, { exerciseId: pr.exerciseId });
      }

      const entry = exerciseMap.get(key)!;
      entry[pr.recordType] = {
        value: pr.value,
        reps: pr.reps,
        date: pr.setDate,
      };
    }

    // Get exercise details for each
    const result = await Promise.all(
      Array.from(exerciseMap.values()).map(async (entry) => {
        const exercise = await ctx.db.get(entry.exerciseId);
        return {
          exercise,
          prs: entry,
        };
      })
    );

    return result;
  },
});

// Check if a given set would be a PR (without saving)
export const wouldBePR = query({
  args: {
    exerciseId: v.id("exercises"),
    weight: v.number(),
    reps: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const e1rm = calculateE1RM(args.weight, args.reps);
    const volume = args.weight * args.reps;

    const results: {
      weight: boolean;
      e1rm: boolean;
      volume: boolean;
    } = {
      weight: false,
      e1rm: false,
      volume: false,
    };

    // Check weight PR
    const weightPR = await ctx.db
      .query("personalRecords")
      .withIndex("by_user_exercise_type", (q) =>
        q
          .eq("userId", userId)
          .eq("exerciseId", args.exerciseId)
          .eq("recordType", "weight")
      )
      .first();
    results.weight = !weightPR || args.weight > weightPR.value;

    // Check e1rm PR
    const e1rmPR = await ctx.db
      .query("personalRecords")
      .withIndex("by_user_exercise_type", (q) =>
        q
          .eq("userId", userId)
          .eq("exerciseId", args.exerciseId)
          .eq("recordType", "e1rm")
      )
      .first();
    results.e1rm = !e1rmPR || e1rm > e1rmPR.value;

    // Check volume PR (single set)
    const volumePR = await ctx.db
      .query("personalRecords")
      .withIndex("by_user_exercise_type", (q) =>
        q
          .eq("userId", userId)
          .eq("exerciseId", args.exerciseId)
          .eq("recordType", "volume")
      )
      .first();
    results.volume = !volumePR || volume > volumePR.value;

    return results;
  },
});
