"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

// Define Zod schema for AI-generated nutrition goals
const NutritionGoalsSchema = z.object({
  calories: z.number().describe("Daily calorie target in kcal"),
  protein: z.number().describe("Daily protein target in grams"),
  carbs: z.number().describe("Daily carbohydrate target in grams"),
  fat: z.number().describe("Daily fat target in grams"),
  fiber: z.number().describe("Daily fiber target in grams"),
  sugar: z.number().describe("Daily sugar limit in grams"),
  reasoning: z
    .string()
    .describe(
      "Brief explanation of the calculation methodology and recommendations"
    ),
});

// Define Zod schema for structured food analysis output
const FoodAnalysisSchema = z.object({
  foodName: z.string().describe("Name of the food item"),
  description: z.string().describe("Brief description of the food"),
  servingSize: z.string().describe("Estimated serving size"),
  calories: z.number().describe("Estimated calories"),
  protein: z.number().describe("Protein in grams"),
  carbs: z.number().describe("Carbohydrates in grams"),
  fat: z.number().describe("Fat in grams"),
  fiber: z.number().describe("Fiber in grams"),
  sugar: z.number().describe("Sugar in grams"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence level of the nutritional estimate"),
});

// AI-powered food image analysis
export const analyzeFoodImage = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    foodName: string;
    description: string;
    servingSize: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    confidence: "high" | "medium" | "low";
  }> => {
    // Check authentication and paid status
    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) {
      throw new Error(
        "Unauthorized: You must be logged in to perform this action"
      );
    }
    if (!user.isPaidUser) {
      throw new Error(
        "AI food analysis is a paid feature. Upgrade to access this feature."
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      throw new Error(
        "OpenAI API key not configured. Add OPENAI_API_KEY to your environment variables."
      );
    }

    // Get the image URL from Convex storage
    const imageUrl = await ctx.storage.getUrl(args.storageId);

    if (!imageUrl) {
      throw new Error(
        "Could not retrieve image URL. The storage ID may be invalid or the file may have been deleted."
      );
    }

    const systemPrompt = `You are an expert nutritionist analyzing food photos. Your task is to identify the food in the image and estimate its nutritional content per serving as accurately as possible.

GUIDELINES:
- Identify the food item(s) in the image
- Estimate a reasonable serving size based on what is visible
- Provide nutritional estimates per that serving size
- Be as accurate as possible using your knowledge of food composition
- If multiple food items are present, estimate for the entire plate/meal as one entry
- Set confidence to "high" if the food is clearly identifiable and common, "medium" if partially obscured or mixed, and "low" if difficult to identify
- All numerical values should be reasonable estimates based on standard nutritional data
- Calories should be consistent with the macronutrient breakdown (protein × 4 + carbs × 4 + fat × 9 ≈ calories)`;

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Use Responses API with structured output and GPT-4o Vision
    const response = await openai.responses.parse({
      model: "gpt-4o-2024-08-06",
      input: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "input_image", image_url: imageUrl },
            {
              type: "input_text",
              text: "Analyze this food image and estimate the nutritional content per serving.",
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(FoodAnalysisSchema, "food_analysis"),
      },
      temperature: 0.3,
      max_output_tokens: 1000,
    });

    if (!response.output_parsed) {
      throw new Error("No parsed response from AI");
    }

    const result = response.output_parsed;

    return {
      foodName: result.foodName,
      description: result.description,
      servingSize: result.servingSize,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      fiber: result.fiber,
      sugar: result.sugar,
      confidence: result.confidence,
    };
  },
});

// AI-powered personalized nutrition goal generation
export const generateNutritionGoals = action({
  args: {
    weightKg: v.number(),
    heightCm: v.number(),
    age: v.number(),
    sex: v.union(v.literal("male"), v.literal("female")),
    activityLevel: v.union(
      v.literal("sedentary"),
      v.literal("lightly_active"),
      v.literal("moderately_active"),
      v.literal("very_active"),
      v.literal("extremely_active")
    ),
    goal: v.union(
      v.literal("bulk"),
      v.literal("cut"),
      v.literal("maintain")
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    reasoning: string;
  }> => {
    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) {
      throw new Error(
        "Unauthorized: You must be logged in to perform this action"
      );
    }
    if (!user.isPaidUser) {
      throw new Error(
        "AI nutrition goals is a paid feature. Upgrade to access this feature."
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      throw new Error(
        "OpenAI API key not configured. Add OPENAI_API_KEY to your environment variables."
      );
    }

    const systemPrompt = `You are an expert sports nutritionist. Calculate personalized daily nutrition goals based on the user's body metrics and fitness goal.

METHODOLOGY:
1. Calculate BMR using the Mifflin-St Jeor equation:
   - Male: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + 5
   - Female: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) - 161

2. Calculate TDEE using activity multipliers:
   - Sedentary (little/no exercise): BMR × 1.2
   - Lightly active (1-3 days/week): BMR × 1.375
   - Moderately active (3-5 days/week): BMR × 1.55
   - Very active (6-7 days/week): BMR × 1.725
   - Extremely active (2x/day or physical job): BMR × 1.9

3. Adjust calories based on goal:
   - Bulk: TDEE + 300 to 500 kcal surplus
   - Cut: TDEE - 400 to 600 kcal deficit
   - Maintain: TDEE

4. Set macronutrient targets:
   - Protein: 1.6-2.2g per kg of body weight (higher end for cutting, lower for bulking)
   - Fat: 0.8-1.2g per kg of body weight
   - Carbs: remaining calories (1g carbs = 4 kcal)

5. Micronutrient guidelines:
   - Fiber: 25-38g per day (higher for higher calorie diets)
   - Sugar: ≤10% of total calories

Round all values to the nearest whole number. Provide a brief reasoning explaining the key calculations.`;

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const response = await openai.responses.parse({
      model: "gpt-4o-2024-08-06",
      input: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Calculate nutrition goals for:
- Weight: ${args.weightKg} kg
- Height: ${args.heightCm} cm
- Age: ${args.age} years
- Sex: ${args.sex}
- Activity level: ${args.activityLevel.replace("_", " ")}
- Goal: ${args.goal}`,
        },
      ],
      text: {
        format: zodTextFormat(NutritionGoalsSchema, "nutrition_goals"),
      },
      temperature: 0.3,
      max_output_tokens: 1000,
    });

    if (!response.output_parsed) {
      throw new Error("No parsed response from AI");
    }

    const result = response.output_parsed;

    return {
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      fiber: result.fiber,
      sugar: result.sugar,
      reasoning: result.reasoning,
    };
  },
});
