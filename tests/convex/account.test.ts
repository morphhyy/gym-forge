import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import type { TableNames } from "../../convex/_generated/dataModel";
import {
  USER_A,
  USER_B,
  createCustomExercise,
  createGlobalExercise,
  createPlan,
  createUser,
  setup,
  type TestConvex,
} from "./setup";

/** Give a user one row in every user-scoped table. */
async function seedUser(t: TestConvex, subject: string, global: Awaited<ReturnType<typeof createGlobalExercise>>) {
  const id = subject === "user_a" ? USER_A : USER_B;
  const as = t.withIdentity(id);
  await createUser(t, subject);
  const custom = await createCustomExercise(t, subject, `${subject} custom`);
  await createPlan(t, subject, { 0: [global, custom], 2: [global] });
  for (const date of ["2026-03-01", "2026-03-02"]) {
    const sessionId = await as.mutation(api.sessions.getOrCreateSession, { date });
    for (let i = 0; i < 3; i++) {
      await as.mutation(api.sessions.logSet, {
        sessionId, exerciseId: custom, setIndex: i, repsActual: 5, weight: 100 + i,
      });
    }
    await as.mutation(api.records.checkAndUpdatePR, {
      sessionId, exerciseId: custom, weight: 102, reps: 5, date,
    });
    await as.mutation(api.sessions.completeSession, { sessionId });
  }
  await t.run(async (ctx) => {
    const now = Date.now();
    const imageStorageId = await ctx.storage.store(new Blob(["img"]));
    await ctx.db.insert("foodEntries", {
      userId: subject, date: "2026-03-01", mealType: "lunch", foodName: "Rice",
      calories: 200, protein: 4, carbs: 45, fat: 1, aiAnalyzed: true,
      imageStorageId, createdAt: now,
    });
    await ctx.db.insert("bodyWeights", { userId: subject, date: "2026-03-01", weight: 80, createdAt: now });
    await ctx.db.insert("nutritionGoals", {
      userId: subject, calories: 2500, protein: 180, carbs: 250, fat: 80, updatedAt: now,
    });
    await ctx.db.insert("achievements", { userId: subject, type: "streak_3", unlockedAt: now });
    await ctx.db.insert("rateLimits", {
      identifier: subject, action: "ai_plan_refund", count: 1, windowStart: now,
    });
  });
}

const USER_TABLES: TableNames[] = [
  "users", "exercises", "plans", "planDays", "planExercises", "sessions",
  "sessionSets", "achievements", "personalRecords", "bodyWeights",
  "foodEntries", "nutritionGoals", "rateLimits",
];

/** Count rows per table that belong to `subject` (directly or via a parent). */
async function ownedRows(t: TestConvex, subject: string) {
  return await t.run(async (ctx) => {
    const counts: Record<string, number> = {};
    const plans = (await ctx.db.query("plans").collect()).filter((p) => p.userId === subject);
    const planIds = new Set(plans.map((p) => p._id));
    const days = (await ctx.db.query("planDays").collect()).filter((d) => planIds.has(d.planId));
    const dayIds = new Set(days.map((d) => d._id));
    const sessions = (await ctx.db.query("sessions").collect()).filter((s) => s.userId === subject);
    const sessionIds = new Set(sessions.map((s) => s._id));
    counts.users = (await ctx.db.query("users").collect()).filter((u) => u.clerkUserId === subject).length;
    counts.exercises = (await ctx.db.query("exercises").collect()).filter((e) => e.userId === subject).length;
    counts.plans = plans.length;
    counts.planDays = days.length;
    counts.planExercises = (await ctx.db.query("planExercises").collect()).filter((pe) => dayIds.has(pe.planDayId)).length;
    counts.sessions = sessions.length;
    counts.sessionSets = (await ctx.db.query("sessionSets").collect()).filter((s) => sessionIds.has(s.sessionId) || s.userId === subject).length;
    for (const table of ["achievements", "personalRecords", "bodyWeights", "foodEntries", "nutritionGoals"] as const) {
      counts[table] = (await ctx.db.query(table).collect()).filter((r) => r.userId === subject).length;
    }
    counts.rateLimits = (await ctx.db.query("rateLimits").collect()).filter((r) => r.identifier === subject).length;
    counts._storage = (await ctx.db.system.query("_storage").collect()).length;
    return counts;
  });
}

describe("account deletion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("requires the typed confirmation", async () => {
    const t = setup();
    await expect(
      t.withIdentity(USER_A).mutation(api.account.requestAccountDeletion, { confirmation: "delete me" })
    ).rejects.toThrow(/Type DELETE/);
    await expect(
      t.mutation(api.account.requestAccountDeletion, { confirmation: "DELETE" })
    ).rejects.toThrow(/Unauthorized/);
  });

  test("removes every user-scoped row for A and leaves B intact", async () => {
    const t = setup();
    const global = await createGlobalExercise(t);
    await seedUser(t, "user_a", global);
    await seedUser(t, "user_b", global);

    const before = await ownedRows(t, "user_b");
    for (const table of USER_TABLES) expect(before[table], table).toBeGreaterThan(0);
    expect(before._storage).toBe(2);

    await t.withIdentity(USER_A).mutation(api.account.requestAccountDeletion, { confirmation: " DELETE " });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const afterA = await ownedRows(t, "user_a");
    for (const table of USER_TABLES) expect(afterA[table], table).toBe(0);

    const afterB = await ownedRows(t, "user_b");
    expect({ ...afterB, _storage: undefined }).toEqual({ ...before, _storage: undefined });
    expect(afterB._storage).toBe(1); // only A's food photo deleted

    // Global catalog untouched
    expect(await t.run((ctx) => ctx.db.get(global))).not.toBeNull();
  });

  test("large histories are deleted across several batched runs", async () => {
    const t = setup();
    const global = await createGlobalExercise(t);
    await createUser(t, "user_a");
    // ~900 sets over 30 sessions -> more than one 400-row batch
    await t.run(async (ctx) => {
      for (let d = 1; d <= 30; d++) {
        const date = `2026-01-${String(d).padStart(2, "0")}`;
        const sessionId = await ctx.db.insert("sessions", { userId: "user_a", date, createdAt: 0 });
        for (let i = 0; i < 30; i++) {
          await ctx.db.insert("sessionSets", {
            sessionId, userId: "user_a", exerciseId: global, setIndex: i,
            repsActual: 5, weight: 100, createdAt: 0,
          });
        }
      }
    });
    await t.withIdentity(USER_A).mutation(api.account.requestAccountDeletion, { confirmation: "DELETE" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const runs = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(runs.length).toBeGreaterThan(2);
    expect(runs.every((r) => r.state.kind === "success")).toBe(true);
    const counts = await ownedRows(t, "user_a");
    for (const table of USER_TABLES) expect(counts[table], table).toBe(0);
  });

  test("a single deleteUserDataStep run finishes a small account", async () => {
    const t = setup();
    const global = await createGlobalExercise(t);
    await seedUser(t, "user_a", global);
    const result = await t.mutation(internal.account.deleteUserDataStep, { userId: "user_a", step: 0 });
    expect(result.finished).toBe(true);
    const counts = await ownedRows(t, "user_a");
    for (const table of USER_TABLES) expect(counts[table], table).toBe(0);
  });
});
