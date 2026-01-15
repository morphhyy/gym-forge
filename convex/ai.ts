"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const MAX_FREE_AI_USES = 3;

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

    // Check AI usage limit (but don't increment yet - only increment on approval)
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

    const systemPrompt = `You are a professional fitness coach and workout plan designer. Create personalized weekly workout plans based on user requirements.

Available exercises in our database: ${exerciseNames}

IMPORTANT: You MUST only use exercises from the list above. Do not suggest exercises that are not in the list.

When creating a plan, consider:
- User's fitness goals (strength, muscle building, fat loss, etc.)
- Experience level (beginner, intermediate, advanced)
- Available days for training
- Muscle group balance and recovery time
- Progressive overload principles

Rules:
- weekday 0 = Sunday, 1 = Monday, ..., 6 = Saturday
- Include all 7 days (0-6)
- Rest days should have empty exercises array
- Use exact exercise names from the provided list
- Sets should be between 2-5
- Reps should be between 5-15 for strength, 8-12 for hypertrophy, 12-20 for endurance`;

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

    // Note: Usage count is incremented when user approves the plan, not on generation
    // This allows users to regenerate without consuming their limit

    return {
      planName: plan.planName || "AI Generated Plan",
      description: plan.description,
      days: mappedDays,
    };
  },
});
