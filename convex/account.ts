import { v } from "convex/values";
import { action, internalMutation, mutation, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth } from "./auth";

/*
 * Account deletion.
 *
 * `requestAccountDeletion` (public, authenticated) validates the typed
 * confirmation and schedules `deleteUserDataStep`, an internal mutation that
 * deletes a bounded number of rows per run and reschedules itself until every
 * user-scoped table is empty. This keeps each transaction well below Convex's
 * per-mutation read/write limits regardless of history size.
 *
 * Deleting the Clerk user happens separately:
 *   - preferred: the client calls Clerk's `user.delete()` (requires "Allow users
 *     to delete their accounts" to be enabled in the Clerk dashboard, which is
 *     the default), or
 *   - fallback: `deleteClerkUser` action below, which calls the Clerk Backend
 *     API and requires CLERK_SECRET_KEY to be set in the Convex deployment's
 *     environment (`npx convex env set CLERK_SECRET_KEY sk_...`).
 */

export const DELETE_CONFIRMATION_PHRASE = "DELETE";

// Max rows deleted per scheduled mutation run.
const BATCH_BUDGET = 400;

// Deletion order. `users` last, so a partially-failed run can be resumed by
// re-requesting deletion while the profile row still exists.
const STEPS = [
  "personalRecords",
  "achievements",
  "sessions", // + sessionSets
  "plans", // + planDays + planExercises
  "foodEntries", // + _storage images
  "bodyWeights",
  "nutritionGoals",
  "exercises", // custom exercises only (by_user index)
  "users",
] as const;
type Step = (typeof STEPS)[number];

interface StepResult {
  deleted: number;
  done: boolean;
}

async function deleteStep(
  ctx: MutationCtx,
  step: Step,
  userId: string,
  budget: number
): Promise<StepResult> {
  switch (step) {
    case "personalRecords": {
      const rows = await ctx.db
        .query("personalRecords")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(budget);
      for (const r of rows) await ctx.db.delete(r._id);
      return { deleted: rows.length, done: rows.length < budget };
    }
    case "achievements": {
      const rows = await ctx.db
        .query("achievements")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(budget);
      for (const r of rows) await ctx.db.delete(r._id);
      return { deleted: rows.length, done: rows.length < budget };
    }
    case "bodyWeights": {
      const rows = await ctx.db
        .query("bodyWeights")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(budget);
      for (const r of rows) await ctx.db.delete(r._id);
      return { deleted: rows.length, done: rows.length < budget };
    }
    case "nutritionGoals": {
      const rows = await ctx.db
        .query("nutritionGoals")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(budget);
      for (const r of rows) await ctx.db.delete(r._id);
      return { deleted: rows.length, done: rows.length < budget };
    }
    case "exercises": {
      const rows = await ctx.db
        .query("exercises")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(budget);
      for (const r of rows) {
        // Defensive: never delete global catalog entries
        if (!r.isGlobal) await ctx.db.delete(r._id);
      }
      return { deleted: rows.length, done: rows.length < budget };
    }
    case "users": {
      const rows = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
        .take(budget);
      for (const r of rows) await ctx.db.delete(r._id);
      return { deleted: rows.length, done: rows.length < budget };
    }
    case "foodEntries": {
      const rows = await ctx.db
        .query("foodEntries")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(budget);
      for (const r of rows) {
        if (r.imageStorageId) {
          const file = await ctx.db.system.get(r.imageStorageId);
          if (file) await ctx.storage.delete(r.imageStorageId);
        }
        await ctx.db.delete(r._id);
      }
      return { deleted: rows.length, done: rows.length < budget };
    }
    case "sessions": {
      let deleted = 0;
      while (deleted < budget) {
        const session = await ctx.db
          .query("sessions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first();
        if (!session) return { deleted, done: true };
        const remaining = budget - deleted;
        const sets = await ctx.db
          .query("sessionSets")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .take(remaining);
        for (const s of sets) await ctx.db.delete(s._id);
        deleted += sets.length;
        if (sets.length === remaining) {
          // Possibly more sets left for this session; continue next run.
          return { deleted, done: false };
        }
        await ctx.db.delete(session._id);
        deleted++;
      }
      return { deleted, done: false };
    }
    case "plans": {
      let deleted = 0;
      while (deleted < budget) {
        const plan = await ctx.db
          .query("plans")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first();
        if (!plan) return { deleted, done: true };
        const days = await ctx.db
          .query("planDays")
          .withIndex("by_plan", (q) => q.eq("planId", plan._id))
          .collect(); // at most 7 per plan
        for (const day of days) {
          const remaining = budget - deleted;
          if (remaining <= 0) return { deleted, done: false };
          const pes = await ctx.db
            .query("planExercises")
            .withIndex("by_plan_day", (q) => q.eq("planDayId", day._id))
            .take(remaining);
          for (const pe of pes) await ctx.db.delete(pe._id);
          deleted += pes.length;
          if (pes.length === remaining) return { deleted, done: false };
          await ctx.db.delete(day._id);
          deleted++;
        }
        await ctx.db.delete(plan._id);
        deleted++;
      }
      return { deleted, done: false };
    }
  }
}

export const deleteUserDataStep = internalMutation({
  args: { userId: v.string(), step: v.number() },
  handler: async (ctx, args) => {
    let step = args.step;
    let budget = BATCH_BUDGET;
    while (step < STEPS.length && budget > 0) {
      const result = await deleteStep(ctx, STEPS[step], args.userId, budget);
      budget -= result.deleted;
      if (result.done) step++;
    }
    if (step < STEPS.length) {
      await ctx.scheduler.runAfter(0, internal.account.deleteUserDataStep, {
        userId: args.userId,
        step,
      });
    }
    return { finished: step >= STEPS.length };
  },
});

// Public entry point: validates confirmation and starts the batched deletion.
export const requestAccountDeletion = mutation({
  args: { confirmation: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (args.confirmation.trim() !== DELETE_CONFIRMATION_PHRASE) {
      throw new Error(`Type ${DELETE_CONFIRMATION_PHRASE} to confirm account deletion.`);
    }
    await ctx.scheduler.runAfter(0, internal.account.deleteUserDataStep, {
      userId,
      step: 0,
    });
    return { scheduled: true };
  },
});

/**
 * Fallback for deleting the Clerk user server-side (used when Clerk's
 * frontend `user.delete()` is disabled for the instance). Requires the
 * CLERK_SECRET_KEY environment variable on the Convex deployment.
 */
export const deleteClerkUser = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const secret = process.env.CLERK_SECRET_KEY;
    if (!secret) {
      throw new Error(
        "CLERK_SECRET_KEY is not configured on the Convex deployment, so the Clerk account could not be deleted server-side."
      );
    }
    const res = await fetch(
      `https://api.clerk.com/v1/users/${encodeURIComponent(identity.subject)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${secret}` } }
    );
    if (!res.ok && res.status !== 404) {
      throw new Error(`Clerk user deletion failed (HTTP ${res.status}).`);
    }
    return { deleted: true };
  },
});
