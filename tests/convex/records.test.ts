import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { USER_A, createGlobalExercise, setup, type TestConvex } from "./setup";
import type { Id } from "../../convex/_generated/dataModel";

const DATE = "2026-03-01";

async function seed() {
  const t = setup();
  const a = t.withIdentity(USER_A);
  const ex = await createGlobalExercise(t);
  const sessionId = await a.mutation(api.sessions.getOrCreateSession, { date: DATE });
  const pr = (weight: number, reps: number, setType?: string) =>
    a.mutation(api.records.checkAndUpdatePR, {
      sessionId, exerciseId: ex, weight, reps, date: DATE, setType,
    });
  return { t, a, ex, sessionId, pr };
}

async function prRows(t: TestConvex, ex: Id<"exercises">) {
  const rows = await t.run((ctx) =>
    ctx.db
      .query("personalRecords")
      .withIndex("by_user_exercise", (q) => q.eq("userId", "user_a").eq("exerciseId", ex))
      .collect()
  );
  return Object.fromEntries(rows.map((r) => [r.recordType, r]));
}

describe("records.checkAndUpdatePR", () => {
  test("first working set creates all three PRs and the first_pr achievement", async () => {
    const { t, ex, pr } = await seed();
    const result = await pr(100, 5);
    expect(result.newAchievement).toBe("first_pr");
    expect(result.newPRs.map((p) => p.type).sort()).toEqual(["e1rm", "volume", "weight"]);
    const rows = await prRows(t, ex);
    expect(rows.weight).toMatchObject({ value: 100, reps: 5 });
    expect(rows.volume.value).toBe(500);
    expect(rows.e1rm.value).toBeCloseTo(116.7, 1);
  });

  test("only strictly greater values replace a PR", async () => {
    const { t, ex, pr } = await seed();
    await pr(100, 5);
    // Equal on every metric: no new PRs, no duplicate rows
    expect((await pr(100, 5)).newPRs).toEqual([]);
    // Lower weight but more reps: volume + e1rm PRs, weight PR untouched
    const r = await pr(95, 8);
    expect(r.newPRs.map((p) => p.type).sort()).toEqual(["e1rm", "volume"]);
    expect(r.newAchievement).toBeNull();
    const rows = await prRows(t, ex);
    expect(rows.weight.value).toBe(100);
    expect(rows.volume).toMatchObject({ value: 760, previousValue: 500 });
    expect(await t.run((ctx) => ctx.db.query("personalRecords").collect())).toHaveLength(3);
    expect(await t.run((ctx) => ctx.db.query("achievements").collect())).toHaveLength(1);
  });

  test("warm-up sets are ignored", async () => {
    const { t, ex, pr } = await seed();
    const r = await pr(200, 1, "warmup");
    expect(r).toEqual({ newPRs: [], newAchievement: null });
    expect(await prRows(t, ex)).toEqual({});
  });

  test("wouldBePR mirrors the strictly-greater rule", async () => {
    const { a, ex, pr } = await seed();
    await pr(100, 5);
    expect(await a.query(api.records.wouldBePR, { exerciseId: ex, weight: 100, reps: 5 })).toEqual({
      weight: false, e1rm: false, volume: false,
    });
    expect(await a.query(api.records.wouldBePR, { exerciseId: ex, weight: 101, reps: 5 })).toEqual({
      weight: true, e1rm: true, volume: true,
    });
  });
});
