import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId, requireAuth } from "./auth";

// Log or update a body weight entry for a given date
export const logWeight = mutation({
  args: {
    date: v.string(),
    weight: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Check for existing entry on this date
    const existing = await ctx.db
      .query("bodyWeights")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .first();

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        weight: args.weight,
        notes: args.notes,
      });
      return existing._id;
    }

    // Insert new entry
    return await ctx.db.insert("bodyWeights", {
      userId,
      date: args.date,
      weight: args.weight,
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

// Get weight history for the last N days
export const getWeightHistory = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const days = args.days ?? 90;
    const cutoffDate = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split("T")[0];

    const entries = await ctx.db
      .query("bodyWeights")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return entries.filter((entry) => entry.date >= cutoffDate);
  },
});

// Get the most recent weight entry
export const getLatestWeight = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const latest = await ctx.db
      .query("bodyWeights")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    return latest;
  },
});

// Delete a body weight entry
export const deleteWeight = mutation({
  args: { id: v.id("bodyWeights") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify the entry belongs to the user
    const entry = await ctx.db.get(args.id);
    if (!entry || entry.userId !== userId) {
      throw new Error("Weight entry not found");
    }

    await ctx.db.delete(args.id);
  },
});
