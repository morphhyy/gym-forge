import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAuth, getAuthUserId } from "./auth";
import { MAX_FREE_AI_USES } from "./lib/aiLimits";

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

// Admin-only: set a user's paid status (call from Convex dashboard or internal functions)
export const setUserPaidStatus = internalMutation({
  args: {
    clerkUserId: v.string(),
    isPaidUser: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, { isPaidUser: args.isPaidUser });
    return user._id;
  },
});

// Atomically reserve one AI plan generation for the authenticated user.
// Called from the generateWorkoutPlan action BEFORE the OpenAI request.
// Convex mutations are serializable, so concurrent calls cannot both pass the
// check and push the count over the limit.
export const consumeAIGeneration = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ consumed: boolean }> => {
    const userId = await requireAuth(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Paid users are unlimited; their usage isn't counted against the free quota.
    if (user.isPaidUser) {
      return { consumed: false };
    }

    const currentUsage = user.aiUsageCount ?? 0;
    if (currentUsage >= MAX_FREE_AI_USES) {
      throw new Error(
        `You've reached the free limit of ${MAX_FREE_AI_USES} AI-generated plan${MAX_FREE_AI_USES === 1 ? "" : "s"}. Please create plans manually or upgrade to premium for unlimited AI plans.`
      );
    }

    await ctx.db.patch(user._id, { aiUsageCount: currentUsage + 1 });
    return { consumed: true };
  },
});

const MAX_AI_REFUNDS_PER_DAY = 3;
const AI_REFUND_WINDOW_MS = 24 * 60 * 60 * 1000;

// Give back a reserved generation. Only called by ai.generateWorkoutPlan for
// clearly-unbilled infrastructure failures (network error, 429, 5xx) — never
// for parse/validation failures or refusals. Capped at MAX_AI_REFUNDS_PER_DAY
// per user (tracked in rateLimits) so refunds can't be farmed for unlimited
// OpenAI calls. Returns whether a refund was granted.
export const refundAIGeneration = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ refunded: boolean }> => {
    const userId = await requireAuth(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!user || user.isPaidUser) return { refunded: false };

    const currentUsage = user.aiUsageCount ?? 0;
    if (currentUsage <= 0) return { refunded: false };

    const now = Date.now();
    const limit = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier_action", (q) =>
        q.eq("identifier", userId).eq("action", "ai_plan_refund")
      )
      .first();

    if (!limit) {
      await ctx.db.insert("rateLimits", {
        identifier: userId,
        action: "ai_plan_refund",
        count: 1,
        windowStart: now,
      });
    } else if (now - limit.windowStart >= AI_REFUND_WINDOW_MS) {
      await ctx.db.patch(limit._id, { count: 1, windowStart: now });
    } else if (limit.count >= MAX_AI_REFUNDS_PER_DAY) {
      return { refunded: false };
    } else {
      await ctx.db.patch(limit._id, { count: limit.count + 1 });
    }

    await ctx.db.patch(user._id, { aiUsageCount: currentUsage - 1 });
    return { refunded: true };
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
        isLimitReached: false,
        isUnlimited: false,
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
        isLimitReached: false,
        isUnlimited: false,
      };
    }

    const usageCount = user.aiUsageCount ?? 0;

    if (user.isPaidUser) {
      return {
        usageCount,
        remaining: MAX_FREE_AI_USES,
        limit: MAX_FREE_AI_USES,
        isLimitReached: false,
        isUnlimited: true,
      };
    }

    const remaining = Math.max(0, MAX_FREE_AI_USES - usageCount);

    return {
      usageCount,
      remaining,
      limit: MAX_FREE_AI_USES,
      isLimitReached: usageCount >= MAX_FREE_AI_USES,
      isUnlimited: false,
    };
  },
});
