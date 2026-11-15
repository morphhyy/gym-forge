import { describe, expect, test, vi, afterEach } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { MAX_FREE_AI_USES } from "../../convex/lib/aiLimits";
import { USER_A, USER_B, createUser, setup, type TestConvex } from "./setup";

const usage = async (t: TestConvex, clerkUserId = "user_a") =>
  (await t.run((ctx) =>
    ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", clerkUserId))
      .unique()
  ))?.aiUsageCount;

describe("users.consumeAIGeneration", () => {
  test("free users are capped at MAX_FREE_AI_USES", async () => {
    const t = setup();
    await createUser(t, "user_a");
    const a = t.withIdentity(USER_A);
    for (let i = 0; i < MAX_FREE_AI_USES; i++) {
      expect(await a.mutation(internal.users.consumeAIGeneration, {})).toEqual({ consumed: true });
    }
    await expect(a.mutation(internal.users.consumeAIGeneration, {})).rejects.toThrow(/free limit/);
    expect(await usage(t)).toBe(MAX_FREE_AI_USES);
    expect(await a.query(api.users.getAIUsage, {})).toMatchObject({
      remaining: 0, isLimitReached: true, isUnlimited: false,
    });
  });

  test("concurrent requests can't both pass the limit check", async () => {
    const t = setup();
    await createUser(t, "user_a");
    const a = t.withIdentity(USER_A);
    const results = await Promise.allSettled(
      Array.from({ length: MAX_FREE_AI_USES + 3 }, () =>
        a.mutation(internal.users.consumeAIGeneration, {})
      )
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(MAX_FREE_AI_USES);
    expect(await usage(t)).toBe(MAX_FREE_AI_USES);
  });

  test("paid users are unlimited and not counted", async () => {
    const t = setup();
    await createUser(t, "user_a", { isPaidUser: true });
    const a = t.withIdentity(USER_A);
    for (let i = 0; i < MAX_FREE_AI_USES + 5; i++) {
      expect(await a.mutation(internal.users.consumeAIGeneration, {})).toEqual({ consumed: false });
    }
    expect(await usage(t)).toBe(0);
    expect((await a.query(api.users.getAIUsage, {})).isUnlimited).toBe(true);
  });

  test("quota is per user and requires auth", async () => {
    const t = setup();
    await createUser(t, "user_a");
    await createUser(t, "user_b");
    for (let i = 0; i < MAX_FREE_AI_USES; i++) {
      await t.withIdentity(USER_A).mutation(internal.users.consumeAIGeneration, {});
    }
    expect(await t.withIdentity(USER_B).mutation(internal.users.consumeAIGeneration, {})).toEqual({
      consumed: true,
    });
    await expect(t.mutation(internal.users.consumeAIGeneration, {})).rejects.toThrow(/Unauthorized/);
  });
});

describe("users.refundAIGeneration", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("refunds are capped at 3 per 24h window, tracked in rateLimits", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-01T10:00:00Z"));
    const t = setup();
    await createUser(t, "user_a");
    const a = t.withIdentity(USER_A);
    const consumeAndRefund = async () => {
      await a.mutation(internal.users.consumeAIGeneration, {});
      return (await a.mutation(internal.users.refundAIGeneration, {})).refunded;
    };

    expect([await consumeAndRefund(), await consumeAndRefund(), await consumeAndRefund()]).toEqual([
      true, true, true,
    ]);
    expect(await consumeAndRefund()).toBe(false); // 4th refund denied
    expect(await usage(t)).toBe(1);

    const limit = await t.run((ctx) => ctx.db.query("rateLimits").collect());
    expect(limit).toMatchObject([{ identifier: "user_a", action: "ai_plan_refund", count: 3 }]);

    // A new window opens after 24h
    vi.setSystemTime(new Date("2026-03-02T10:00:01Z"));
    expect((await a.mutation(internal.users.refundAIGeneration, {})).refunded).toBe(true);
    expect(await usage(t)).toBe(0);
  });

  test("never refunds below zero or for paid users", async () => {
    const t = setup();
    await createUser(t, "user_a");
    await createUser(t, "user_b", { isPaidUser: true, aiUsageCount: 2 });
    expect(
      await t.withIdentity(USER_A).mutation(internal.users.refundAIGeneration, {})
    ).toEqual({ refunded: false });
    expect(
      await t.withIdentity(USER_B).mutation(internal.users.refundAIGeneration, {})
    ).toEqual({ refunded: false });
    expect(await usage(t, "user_b")).toBe(2);
    expect(await t.run((ctx) => ctx.db.query("rateLimits").collect())).toEqual([]);
  });
});
