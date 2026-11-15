import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import {
  USER_A,
  USER_B,
  createCustomExercise,
  createGlobalExercise,
  createPlan,
  createUser,
  setup,
} from "./setup";

const SUNDAY = "2026-03-01"; // weekday 0

describe("sessions.getOrCreateSession", () => {
  test("is idempotent per (user, date) and stores the calendar weekday", async () => {
    const t = setup();
    const a = t.withIdentity(USER_A);
    const first = await a.mutation(api.sessions.getOrCreateSession, { date: SUNDAY });
    const second = await a.mutation(api.sessions.getOrCreateSession, { date: SUNDAY });
    expect(second).toBe(first);

    const sessions = await t.run((ctx) => ctx.db.query("sessions").collect());
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ userId: "user_a", date: SUNDAY, weekday: 0 });
    expect(sessions[0].startedAt).toBeTypeOf("number");
  });

  test("different users get different sessions for the same date", async () => {
    const t = setup();
    const sa = await t.withIdentity(USER_A).mutation(api.sessions.getOrCreateSession, { date: SUNDAY });
    const sb = await t.withIdentity(USER_B).mutation(api.sessions.getOrCreateSession, { date: SUNDAY });
    expect(sa).not.toBe(sb);
  });

  test("ignores a planId owned by another user", async () => {
    const t = setup();
    const ex = await createGlobalExercise(t);
    const { planId: planA } = await createPlan(t, "user_a", { 0: [ex] });
    const sid = await t
      .withIdentity(USER_B)
      .mutation(api.sessions.getOrCreateSession, { date: SUNDAY, planId: planA });
    const session = await t.run((ctx) => ctx.db.get(sid));
    expect(session?.planId).toBeUndefined();
  });

  test("keeps a planId owned by the caller", async () => {
    const t = setup();
    const ex = await createGlobalExercise(t);
    const { planId } = await createPlan(t, "user_a", { 0: [ex] });
    const sid = await t
      .withIdentity(USER_A)
      .mutation(api.sessions.getOrCreateSession, { date: SUNDAY, planId });
    expect((await t.run((ctx) => ctx.db.get(sid)))?.planId).toBe(planId);
  });

  test("rejects malformed dates and unauthenticated callers", async () => {
    const t = setup();
    await expect(
      t.withIdentity(USER_A).mutation(api.sessions.getOrCreateSession, { date: "2026-02-30" })
    ).rejects.toThrow(/Invalid calendar date/);
    await expect(
      t.mutation(api.sessions.getOrCreateSession, { date: SUNDAY })
    ).rejects.toThrow(/Unauthorized/);
  });
});

describe("sessions.logSet", () => {
  test("upserts by (session, exercise, setIndex)", async () => {
    const t = setup();
    const a = t.withIdentity(USER_A);
    const ex = await createGlobalExercise(t);
    const sessionId = await a.mutation(api.sessions.getOrCreateSession, { date: SUNDAY });

    const id1 = await a.mutation(api.sessions.logSet, {
      sessionId, exerciseId: ex, setIndex: 0, repsActual: 8, weight: 100,
    });
    const id2 = await a.mutation(api.sessions.logSet, {
      sessionId, exerciseId: ex, setIndex: 0, repsActual: 6, weight: 110, rpe: 9,
    });
    expect(id2).toBe(id1);

    const sets = await t.run((ctx) => ctx.db.query("sessionSets").collect());
    expect(sets).toHaveLength(1);
    expect(sets[0]).toMatchObject({ repsActual: 6, weight: 110, rpe: 9, userId: "user_a" });
  });

  test("stores warm-up set type and omits the 'normal' default", async () => {
    const t = setup();
    const a = t.withIdentity(USER_A);
    const ex = await createGlobalExercise(t);
    const sessionId = await a.mutation(api.sessions.getOrCreateSession, { date: SUNDAY });
    const warm = await a.mutation(api.sessions.logSet, {
      sessionId, exerciseId: ex, setIndex: 0, repsActual: 10, weight: 40, setType: "warmup",
    });
    const normal = await a.mutation(api.sessions.logSet, {
      sessionId, exerciseId: ex, setIndex: 1, repsActual: 8, weight: 100, setType: "normal",
    });
    expect((await t.run((ctx) => ctx.db.get(warm)))?.setType).toBe("warmup");
    expect((await t.run((ctx) => ctx.db.get(normal)))?.setType).toBeUndefined();
  });

  test("rejects another user's custom exercise but accepts own and global", async () => {
    const t = setup();
    const a = t.withIdentity(USER_A);
    const bCustom = await createCustomExercise(t, "user_b");
    const aCustom = await createCustomExercise(t, "user_a");
    const sessionId = await a.mutation(api.sessions.getOrCreateSession, { date: SUNDAY });

    await expect(
      a.mutation(api.sessions.logSet, {
        sessionId, exerciseId: bCustom, setIndex: 0, repsActual: 5, weight: 50,
      })
    ).rejects.toThrow(/Exercise not found/);
    await a.mutation(api.sessions.logSet, {
      sessionId, exerciseId: aCustom, setIndex: 0, repsActual: 5, weight: 50,
    });
  });

  test("rejects out-of-range RPE", async () => {
    const t = setup();
    const a = t.withIdentity(USER_A);
    const ex = await createGlobalExercise(t);
    const sessionId = await a.mutation(api.sessions.getOrCreateSession, { date: SUNDAY });
    await expect(
      a.mutation(api.sessions.logSet, {
        sessionId, exerciseId: ex, setIndex: 0, repsActual: 5, weight: 50, rpe: 11,
      })
    ).rejects.toThrow(/RPE/);
  });
});

describe("session exercise list mutations", () => {
  async function planSession() {
    const t = setup();
    const a = t.withIdentity(USER_A);
    const bench = await createGlobalExercise(t, "Bench Press");
    const row = await createGlobalExercise(t, "Barbell Row");
    const curl = await createGlobalExercise(t, "Curl");
    const { planId } = await createPlan(t, "user_a", { 0: [bench, row] });
    const sessionId = await a.mutation(api.sessions.getOrCreateSession, { date: SUNDAY, planId });
    const exercisesOf = async () =>
      (await t.run((ctx) => ctx.db.get(sessionId)))?.exercises;
    return { t, a, bench, row, curl, sessionId, exercisesOf };
  }

  test("deleteSet removes the logged set and re-indexes later ones", async () => {
    const { t, a, bench, sessionId, exercisesOf } = await planSession();
    for (let i = 0; i < 3; i++) {
      await a.mutation(api.sessions.logSet, {
        sessionId, exerciseId: bench, setIndex: i, repsActual: 8, weight: 100 + i,
      });
    }
    expect(await exercisesOf()).toBeUndefined(); // still template-derived

    await a.mutation(api.sessions.deleteSet, { sessionId, exerciseId: bench, setIndex: 1 });

    const sets = (await t.run((ctx) => ctx.db.query("sessionSets").collect())).sort(
      (x, y) => x.setIndex - y.setIndex
    );
    expect(sets.map((s) => [s.setIndex, s.weight])).toEqual([
      [0, 100],
      [1, 102],
    ]);
    const entries = await exercisesOf();
    expect(entries?.find((e) => e.exerciseId === bench)?.sets).toHaveLength(2);
  });

  test("deleteSet rejects an out-of-range index", async () => {
    const { a, bench, sessionId } = await planSession();
    await expect(
      a.mutation(api.sessions.deleteSet, { sessionId, exerciseId: bench, setIndex: 3 })
    ).rejects.toThrow(/Set not found/);
  });

  test("addSessionSet appends a row copying the previous repsTarget", async () => {
    const { a, bench, sessionId, exercisesOf } = await planSession();
    const idx = await a.mutation(api.sessions.addSessionSet, { sessionId, exerciseId: bench });
    expect(idx).toBe(3);
    const entry = (await exercisesOf())?.find((e) => e.exerciseId === bench);
    expect(entry?.sets).toEqual([
      { repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 },
    ]);
  });

  test("addSessionExercise materialises the plan template plus the ad-hoc exercise", async () => {
    const { a, bench, row, curl, sessionId, exercisesOf } = await planSession();
    await a.mutation(api.sessions.addSessionExercise, { sessionId, exerciseId: curl, setCount: 2 });
    const entries = await exercisesOf();
    expect(entries?.map((e) => e.exerciseId)).toEqual([bench, row, curl]);
    expect(entries?.[2]).toMatchObject({ key: `x-${curl}`, sets: [{}, {}] });
    await expect(
      a.mutation(api.sessions.addSessionExercise, { sessionId, exerciseId: curl })
    ).rejects.toThrow(/already in this session/);
  });

  test("addSessionExercise rejects another user's custom exercise", async () => {
    const { t, a, sessionId } = await planSession();
    const bCustom = await createCustomExercise(t, "user_b");
    await expect(
      a.mutation(api.sessions.addSessionExercise, { sessionId, exerciseId: bCustom })
    ).rejects.toThrow(/Exercise not found/);
  });

  test("swapSessionExercise replaces in place and remembers the original", async () => {
    const { a, bench, row, curl, sessionId, exercisesOf } = await planSession();
    await a.mutation(api.sessions.swapSessionExercise, {
      sessionId, exerciseId: bench, newExerciseId: curl,
    });
    let entries = await exercisesOf();
    expect(entries?.map((e) => e.exerciseId)).toEqual([curl, row]);
    expect(entries?.[0].swappedFromExerciseId).toBe(bench);

    // Swapping back clears the marker
    await a.mutation(api.sessions.swapSessionExercise, {
      sessionId, exerciseId: curl, newExerciseId: bench,
    });
    entries = await exercisesOf();
    expect(entries?.[0].exerciseId).toBe(bench);
    expect(entries?.[0].swappedFromExerciseId).toBeUndefined();
  });

  test("swapSessionExercise refuses when sets are already logged", async () => {
    const { a, bench, curl, sessionId } = await planSession();
    await a.mutation(api.sessions.logSet, {
      sessionId, exerciseId: bench, setIndex: 0, repsActual: 8, weight: 100,
    });
    await expect(
      a.mutation(api.sessions.swapSessionExercise, {
        sessionId, exerciseId: bench, newExerciseId: curl,
      })
    ).rejects.toThrow(/Remove the logged sets/);
  });

  test("removeSessionExercise drops the entry and its logged sets", async () => {
    const { t, a, bench, row, sessionId, exercisesOf } = await planSession();
    await a.mutation(api.sessions.logSet, {
      sessionId, exerciseId: bench, setIndex: 0, repsActual: 8, weight: 100,
    });
    await a.mutation(api.sessions.removeSessionExercise, { sessionId, exerciseId: bench });
    expect((await exercisesOf())?.map((e) => e.exerciseId)).toEqual([row]);
    expect(await t.run((ctx) => ctx.db.query("sessionSets").collect())).toHaveLength(0);
  });

  test("a freestyle (no plan) session starts empty and can gain exercises", async () => {
    const t = setup();
    const a = t.withIdentity(USER_A);
    const ex = await createGlobalExercise(t);
    const sessionId = await a.mutation(api.sessions.getOrCreateSession, { date: SUNDAY });
    await a.mutation(api.sessions.addSessionExercise, { sessionId, exerciseId: ex });
    const session = await t.run((ctx) => ctx.db.get(sessionId));
    expect(session?.exercises?.map((e) => e.exerciseId)).toEqual([ex]);
    expect(session?.exercises?.[0].sets).toHaveLength(3);
  });
});

describe("sessions.deleteSession", () => {
  test("deletes sets and recomputes PRs from remaining non-warm-up sets", async () => {
    const t = setup();
    const a = t.withIdentity(USER_A);
    await createUser(t, "user_a");
    const ex = await createGlobalExercise(t);

    const logAndPR = async (
      date: string, weight: number, reps: number, setIndex = 0,
      setType?: "warmup"
    ) => {
      const sessionId = await a.mutation(api.sessions.getOrCreateSession, { date });
      await a.mutation(api.sessions.logSet, {
        sessionId, exerciseId: ex, setIndex, repsActual: reps, weight, setType,
      });
      await a.mutation(api.records.checkAndUpdatePR, {
        sessionId, exerciseId: ex, weight, reps, date, setType,
      });
      return sessionId;
    };

    // Day 1: 100x5 working set
    const s1 = await logAndPR("2026-03-01", 100, 5);
    // Day 2: a heavy warm-up (must never become a PR) + 120x3 working set
    const s2 = await logAndPR("2026-03-02", 150, 1, 0, "warmup");
    await a.mutation(api.sessions.logSet, {
      sessionId: s2, exerciseId: ex, setIndex: 1, repsActual: 3, weight: 120,
    });
    await a.mutation(api.records.checkAndUpdatePR, {
      sessionId: s2, exerciseId: ex, weight: 120, reps: 3, date: "2026-03-02",
    });
    await a.mutation(api.sessions.completeSession, { sessionId: s1 });
    await a.mutation(api.sessions.completeSession, { sessionId: s2 });

    const weightPR = async () =>
      (await t.run((ctx) => ctx.db.query("personalRecords").collect())).find(
        (p) => p.recordType === "weight"
      );
    expect((await weightPR())?.value).toBe(120);

    const result = await a.mutation(api.sessions.deleteSession, { sessionId: s2 });
    expect(result.deletedSets).toBe(2);

    // Weight PR falls back to day 1's working set, not day 2's 150kg warm-up
    const pr = await weightPR();
    expect(pr).toMatchObject({ value: 100, reps: 5, sessionId: s1, setDate: "2026-03-01" });
    const all = await t.run((ctx) => ctx.db.query("sessionSets").collect());
    expect(all.every((s) => s.sessionId === s1)).toBe(true);

    // Streak bookkeeping rolled back to day 1
    const user = await t.run((ctx) => ctx.db.query("users").first());
    expect(user).toMatchObject({ lastWorkoutDate: "2026-03-01", currentStreak: 1 });
  });

  test("drops the PR entirely when no sets remain", async () => {
    const t = setup();
    const a = t.withIdentity(USER_A);
    const ex = await createGlobalExercise(t);
    const sessionId = await a.mutation(api.sessions.getOrCreateSession, { date: SUNDAY });
    await a.mutation(api.sessions.logSet, {
      sessionId, exerciseId: ex, setIndex: 0, repsActual: 5, weight: 100,
    });
    await a.mutation(api.records.checkAndUpdatePR, {
      sessionId, exerciseId: ex, weight: 100, reps: 5, date: SUNDAY,
    });
    await a.mutation(api.sessions.deleteSession, { sessionId });
    expect(await t.run((ctx) => ctx.db.query("personalRecords").collect())).toHaveLength(0);
  });
});
