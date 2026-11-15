import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAuth, getAuthUserId } from "./auth";
import { SEED_EXERCISES } from "./lib/exerciseCatalog";
import { getExerciseDetails } from "./lib/exerciseDetails";

// Get all exercises (global + user's custom)
export const getAllExercises = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    
    // Get global exercises
    const globalExercises = await ctx.db
      .query("exercises")
      .withIndex("by_global", (q) => q.eq("isGlobal", true))
      .collect();

    // Get user's custom exercises if authenticated
    let userExercises: typeof globalExercises = [];
    if (userId) {
      userExercises = await ctx.db
        .query("exercises")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    return [...globalExercises, ...userExercises].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  },
});

// Create a custom exercise
export const createExercise = mutation({
  args: {
    name: v.string(),
    muscleGroup: v.optional(v.string()),
    equipment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    return await ctx.db.insert("exercises", {
      name: args.name,
      muscleGroup: args.muscleGroup,
      equipment: args.equipment,
      isGlobal: false,
      userId: userId,
      createdAt: Date.now(),
    });
  },
});

// Seed global exercises (run once during setup)
export const seedExercises = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db
      .query("exercises")
      .withIndex("by_global", (q) => q.eq("isGlobal", true))
      .first();
    
    if (existing) {
      return { message: "Exercises already seeded" };
    }

    const exercises = SEED_EXERCISES;

    for (const exercise of exercises) {
      await ctx.db.insert("exercises", {
        ...exercise,
        ...(getExerciseDetails(exercise.name) ?? {}),
        isGlobal: true,
        createdAt: Date.now(),
      });
    }

    return { message: `Seeded ${exercises.length} exercises` };
  },
});

// Patch library details (instructions, muscles, alternatives, GIF) onto
// existing global exercises by name. Idempotent: unchanged docs are skipped.
// Run with: npx convex run exercises:backfillExerciseDetails
export const backfillExerciseDetails = internalMutation({
  args: {},
  handler: async (ctx) => {
    const globals = await ctx.db
      .query("exercises")
      .withIndex("by_global", (q) => q.eq("isGlobal", true))
      .collect();

    let patched = 0;
    let unchanged = 0;
    const missing: string[] = [];
    for (const exercise of globals) {
      const details = getExerciseDetails(exercise.name);
      if (!details) {
        missing.push(exercise.name);
        continue;
      }
      const current = {
        instructions: exercise.instructions,
        primaryMuscles: exercise.primaryMuscles,
        secondaryMuscles: exercise.secondaryMuscles,
        alternatives: exercise.alternatives,
        gifUrl: exercise.gifUrl,
      };
      const next = {
        instructions: details.instructions,
        primaryMuscles: details.primaryMuscles,
        secondaryMuscles: details.secondaryMuscles,
        alternatives: details.alternatives,
        gifUrl: details.gifUrl,
      };
      if (JSON.stringify(current) === JSON.stringify(next)) {
        unchanged++;
        continue;
      }
      await ctx.db.patch(exercise._id, next);
      patched++;
    }

    return { patched, unchanged, missing };
  },
});

// Exercise detail for the library page. Alternatives are resolved to ids
// among exercises visible to the user (global + own custom).
export const getExerciseDetail = query({
  args: { exerciseId: v.id("exercises") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) return null;
    if (!exercise.isGlobal && exercise.userId !== userId) return null;

    const names = exercise.alternatives ?? [];
    const visible = names.length
      ? [
          ...(await ctx.db
            .query("exercises")
            .withIndex("by_global", (q) => q.eq("isGlobal", true))
            .collect()),
          ...(userId
            ? await ctx.db
                .query("exercises")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .collect()
            : []),
        ]
      : [];
    const alternatives = names.map((name) => ({
      name,
      exerciseId: visible.find((e) => e.name === name)?._id ?? null,
    }));

    return { ...exercise, alternatives };
  },
});
