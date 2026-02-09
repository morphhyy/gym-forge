import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId, requireAuth } from "./auth";

// Generate an upload URL for food images (paid users only)
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
      .unique();
    if (!user?.isPaidUser) {
      throw new Error("Image upload for AI analysis is a paid feature.");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Save a food entry
export const saveFoodEntry = mutation({
  args: {
    date: v.string(),
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack")
    ),
    foodName: v.string(),
    description: v.optional(v.string()),
    servingSize: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    fiber: v.optional(v.number()),
    sugar: v.optional(v.number()),
    aiAnalyzed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      throw new Error("Invalid date format. Expected YYYY-MM-DD.");
    }
    if (args.calories < 0 || args.protein < 0 || args.carbs < 0 || args.fat < 0) {
      throw new Error("Nutritional values cannot be negative.");
    }

    return await ctx.db.insert("foodEntries", {
      userId,
      date: args.date,
      mealType: args.mealType,
      foodName: args.foodName,
      description: args.description,
      servingSize: args.servingSize,
      imageStorageId: args.imageStorageId,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      fiber: args.fiber,
      sugar: args.sugar,
      aiAnalyzed: args.aiAnalyzed,
      createdAt: Date.now(),
    });
  },
});

// Delete a food entry
export const deleteFoodEntry = mutation({
  args: { id: v.id("foodEntries") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify the entry belongs to the user
    const entry = await ctx.db.get(args.id);
    if (!entry || entry.userId !== userId) {
      throw new Error("Food entry not found");
    }

    // Clean up associated storage file
    if (entry.imageStorageId) {
      await ctx.storage.delete(entry.imageStorageId);
    }

    await ctx.db.delete(args.id);
  },
});

// Save or update nutrition goals (upsert)
export const saveNutritionGoals = mutation({
  args: {
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    fiber: v.optional(v.number()),
    sugar: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    if (args.calories < 0 || args.protein < 0 || args.carbs < 0 || args.fat < 0) {
      throw new Error("Nutritional values cannot be negative.");
    }

    // Check for existing goals
    const existing = await ctx.db
      .query("nutritionGoals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      // Update existing goals
      await ctx.db.patch(existing._id, {
        calories: args.calories,
        protein: args.protein,
        carbs: args.carbs,
        fat: args.fat,
        fiber: args.fiber,
        sugar: args.sugar,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Insert new goals
    return await ctx.db.insert("nutritionGoals", {
      userId,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      fiber: args.fiber,
      sugar: args.sugar,
      updatedAt: Date.now(),
    });
  },
});

// Get nutrition goals for the current user
export const getNutritionGoals = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const goals = await ctx.db
      .query("nutritionGoals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return goals;
  },
});

// Get food entries for a specific date
export const getFoodEntriesByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      throw new Error("Invalid date format. Expected YYYY-MM-DD.");
    }

    const entries = await ctx.db
      .query("foodEntries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .collect();

    // Resolve image URLs for entries that have images
    const entriesWithUrls = await Promise.all(
      entries.map(async (entry) => {
        let imageUrl: string | null = null;
        if (entry.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(entry.imageStorageId);
        }
        return { ...entry, imageUrl };
      })
    );

    return entriesWithUrls;
  },
});

// Get daily nutrition summaries for a date range
export const getDailySummaries = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(args.endDate)) {
      throw new Error("Invalid date format. Expected YYYY-MM-DD.");
    }

    const entries = await ctx.db
      .query("foodEntries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", args.startDate)
      )
      .filter((q) => q.lte(q.field("date"), args.endDate))
      .collect();

    // Group by date and sum macros
    const summaryMap = new Map<
      string,
      {
        date: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
        sugar: number;
        entryCount: number;
      }
    >();

    for (const entry of entries) {
      const existing = summaryMap.get(entry.date);
      if (existing) {
        existing.calories += entry.calories;
        existing.protein += entry.protein;
        existing.carbs += entry.carbs;
        existing.fat += entry.fat;
        existing.fiber += entry.fiber ?? 0;
        existing.sugar += entry.sugar ?? 0;
        existing.entryCount += 1;
      } else {
        summaryMap.set(entry.date, {
          date: entry.date,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          fiber: entry.fiber ?? 0,
          sugar: entry.sugar ?? 0,
          entryCount: 1,
        });
      }
    }

    return Array.from(summaryMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  },
});
