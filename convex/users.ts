import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, getAuthUserId } from "./auth";

const MAX_FREE_AI_USES = 1;

// Get current user's profile
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
      .unique();
    return user;
  },
});

// Create or update user profile
export const upsertProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    units: v.optional(v.union(v.literal("kg"), v.literal("lb"))),
    goals: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const identity = await ctx.auth.getUserIdentity();

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        displayName: args.displayName ?? existingUser.displayName,
        units: args.units ?? existingUser.units,
        goals: args.goals ?? existingUser.goals,
      });
      return existingUser._id;
    } else {
      return await ctx.db.insert("users", {
        clerkUserId: userId,
        email: identity?.email ?? "",
        displayName: args.displayName,
        units: args.units ?? "kg",
        goals: args.goals,
        aiUsageCount: 0,
        createdAt: Date.now(),
      });
    }
  },
});

// Ensure user exists (called on sign in)
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const identity = await ctx.auth.getUserIdentity();

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!existingUser) {
      return await ctx.db.insert("users", {
        clerkUserId: userId,
        email: identity?.email ?? "",
        units: "kg",
        aiUsageCount: 0,
        createdAt: Date.now(),
      });
    }

    return existingUser._id;
  },
});

// Increment AI usage count
export const incrementAIUsage = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const currentUsage = user.aiUsageCount ?? 0;
    await ctx.db.patch(user._id, {
      aiUsageCount: currentUsage + 1,
    });

    return { usageCount: currentUsage + 1 };
  },
});

// Get AI usage info
export const getAIUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        usageCount: 0,
        remaining: MAX_FREE_AI_USES,
        limit: MAX_FREE_AI_USES,
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!user) {
      return {
        usageCount: 0,
        remaining: MAX_FREE_AI_USES,
        limit: MAX_FREE_AI_USES,
      };
    }

    const usageCount = user.aiUsageCount ?? 0;
    const remaining = Math.max(0, MAX_FREE_AI_USES - usageCount);

    return {
      usageCount,
      remaining,
      limit: MAX_FREE_AI_USES,
      isLimitReached: usageCount >= MAX_FREE_AI_USES,
    };
  },
});
