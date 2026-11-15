import type { MutationCtx } from "../_generated/server";

/**
 * Account deletion removes the users row (and its aiUsageCount). If the same
 * Clerk login signs in again, the profile is recreated; without this, the free
 * AI plan quota would reset to 0. We keep a tombstone with only the Clerk id
 * and the highest count seen.
 */
export async function recordAiUsageTombstone(
  ctx: MutationCtx,
  clerkUserId: string,
  aiUsageCount: number
): Promise<void> {
  const existing = await ctx.db
    .query("aiUsageTombstones")
    .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", clerkUserId))
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, {
      aiUsageCount: Math.max(existing.aiUsageCount, aiUsageCount),
      deletedAt: Date.now(),
    });
  } else {
    await ctx.db.insert("aiUsageTombstones", {
      clerkUserId,
      aiUsageCount,
      deletedAt: Date.now(),
    });
  }
}

/** Starting aiUsageCount for a new users row: restored from a tombstone. */
export async function initialAiUsage(
  ctx: MutationCtx,
  clerkUserId: string
): Promise<number> {
  const tombstone = await ctx.db
    .query("aiUsageTombstones")
    .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", clerkUserId))
    .unique();
  return tombstone?.aiUsageCount ?? 0;
}
