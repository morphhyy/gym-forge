"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const MAX_FREE_AI_USES = 2;

// Define Zod schemas for structured output
const ExerciseSchema = z.object({
  name: z
    .string()
    .describe("Exact exercise name from the available exercises list"),
  sets: z.number().describe("Number of sets (2-5)"),
  reps: z.number().describe("Number of reps per set"),
  notes: z.string().describe("Optional notes for this exercise"),
});

const DaySchema = z.object({
  weekday: z.number().describe("Weekday: 0=Sunday, 1=Monday, ..., 6=Saturday"),
  dayName: z.string().describe("Day name (e.g., Sunday, Monday)"),
  label: z
    .string()
    .optional()
    .nullable()
    .describe("Workout type label (e.g., Push Day, Pull Day, Rest Day)"),
  exercises: z
    .array(ExerciseSchema)
    .describe("Exercises for this day (empty array for rest days)"),
});

const WorkoutPlanSchema = z.object({
  planName: z.string().describe("Name of the workout plan"),
  description: z.string().describe("Brief description of the plan"),
  days: z
    .array(DaySchema)
    .length(7)
    .describe("All 7 days of the week (0-6, Sunday to Saturday)"),
});

// AI-powered workout plan generator
export const generateWorkoutPlan = action({
  args: {
    prompt: v.string(),
    userId: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    planName: string;
    description: string;
    days: Array<{
      weekday: number;
      name?: string;
      exercises: Array<{
        exerciseId: string;
        exerciseName: string;
        sets: Array<{ repsTarget: number; notes?: string }>;
      }>;
    }>;
  }> => {
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      throw new Error(
        "OpenAI API key not configured. Add OPENAI_API_KEY to your environment variables."
      );
    }

    // Check AI usage limit (increment happens when plan is saved, not generated)
    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) {
      throw new Error("User not found");
    }

    const currentUsage = user.aiUsageCount ?? 0;
    if (currentUsage >= MAX_FREE_AI_USES) {
      throw new Error(
        `You've reached the free limit of ${MAX_FREE_AI_USES} AI-generated plans. Please create plans manually or upgrade to premium for unlimited AI plans.`
      );
    }

    // Get available exercises from the database
    const exercises = await ctx.runQuery(api.exercises.getAllExercises);
    const exerciseNames = exercises
      .map(
        (e: { name: string; muscleGroup?: string }) =>
          `${e.name}${e.muscleGroup ? ` (${e.muscleGroup})` : ""}`
      )
      .join(", ");

    const systemPrompt = `You are an elite strength and conditioning coach with 20+ years of experience training athletes and bodybuilders. Create scientifically-backed, personalized weekly workout plans.

AVAILABLE EXERCISES (YOU MUST ONLY USE THESE EXACT NAMES):
${exerciseNames}

CRITICAL RULES:
1. ONLY use exercise names EXACTLY as listed above - no variations or alternatives
2. weekday: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
3. Include ALL 7 days (0-6) in your response
4. Rest days = empty exercises array with label "Rest Day"

PROGRAM DESIGN PRINCIPLES:
- Compound movements first (squats, deadlifts, bench, rows, overhead press)
- Isolation exercises after compounds
- 48-72 hours between training same muscle group
- Balance push/pull ratios to prevent imbalances
- Include both horizontal and vertical push/pull movements

VOLUME GUIDELINES BY GOAL:
• Strength: 3-5 sets × 3-6 reps, compound-focused, longer rest
• Hypertrophy: 3-4 sets × 8-12 reps, mix of compound and isolation
• Endurance: 2-3 sets × 15-20 reps, shorter rest periods
• Beginner: 2-3 sets × 10-12 reps, full body 3x/week
• Intermediate: 3-4 sets × 8-12 reps, upper/lower or PPL split
• Advanced: 4-5 sets × 6-12 reps, specialized splits

SPLIT RECOMMENDATIONS:
- 2-3 days: Full Body each session
- 4 days: Upper/Lower split (2 upper, 2 lower)
- 5-6 days: Push/Pull/Legs (PPL) or Arnold split
- Include at least 1-2 rest days per week

EXERCISE ORDER (per session):
1. Power/Olympic lifts (if applicable)
2. Main compound lifts (squat, bench, deadlift variations)
3. Secondary compounds (rows, presses, lunges)
4. Isolation exercises (curls, extensions, raises)
5. Core/abs work (optional, at end)

Create a balanced, effective program that matches the user's goals, experience, and available training days.`;

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Use Responses API with structured output
    const response = await openai.responses.parse({
      model: "gpt-4o-2024-08-06",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: args.prompt },
      ],
      text: {
        format: zodTextFormat(WorkoutPlanSchema, "workout_plan"),
      },
      temperature: 0.7,
      max_output_tokens: 2000,
    });

    if (!response.output_parsed) {
      throw new Error("No parsed response from AI");
    }

    const plan = response.output_parsed;

    // Validate and map exercise names to IDs
    const exerciseMap = new Map(
      exercises.map((e: { _id: string; name: string }) => [
        e.name.toLowerCase(),
        e._id,
      ])
    );

    const mappedDays = plan.days.map((day) => ({
      weekday: day.weekday,
      name: day.label || day.dayName || undefined,
      exercises: day.exercises
        .map((ex) => {
          const exerciseId = exerciseMap.get(ex.name.toLowerCase());
          if (!exerciseId) {
            console.warn(`Exercise not found: ${ex.name}`);
            return null;
          }
          return {
            exerciseId,
            exerciseName: ex.name,
            sets: Array.from({ length: ex.sets }, () => ({
              repsTarget: ex.reps,
              notes: ex.notes ?? undefined,
            })),
          };
        })
        .filter((ex): ex is NonNullable<typeof ex> => ex !== null),
    }));

    return {
      planName: plan.planName || "AI Generated Plan",
      description: plan.description,
      days: mappedDays,
    };
  },
});
