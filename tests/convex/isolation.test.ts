import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import {
  USER_A,
  USER_B,
  createCustomExercise,
  createGlobalExercise,
  createPlan,
  setup,
} from "./setup";

const DATE = "2026-03-01";

/** User A with a session, a logged set, a plan and a custom exercise. */
async function seedUserA() {
  const t = setup();
  const a = t.withIdentity(USER_A);
  const b = t.withIdentity(USER_B);
  const global = await createGlobalExercise(t);
  const aCustom = await createCustomExercise(t, "user_a", "A's Secret Lift");
  const { planId } = await createPlan(t, "user_a", { 0: [global, aCustom] });
  const sessionId = await a.mutation(api.sessions.getOrCreateSession, { date: DATE, planId });
  await a.mutation(api.sessions.logSet, {
    sessionId, exerciseId: aCustom, setIndex: 0, repsActual: 5, weight: 100,
  });
  await a.mutation(api.records.checkAndUpdatePR, {
    sessionId, exerciseId: aCustom, weight: 100, reps: 5, date: DATE,
  });
  return { t, a, b, global, aCustom, planId, sessionId };
}

describe("cross-user isolation (IDOR)", () => {
  test("B cannot read A's session or sets", async () => {
    const { b } = await seedUserA();
    expect(await b.query(api.sessions.getSessionByDate, { date: DATE })).toBeNull();
    expect(await b.query(api.sessions.getRecentSessions, {})).toEqual([]);
    expect(await b.query(api.sessions.getSessionsForMonth, { year: 2026, month: 3 })).toEqual([]);
  });

  test("B cannot read A's session PRs", async () => {
    const { b, sessionId } = await seedUserA();
    expect(await b.query(api.sessions.getSessionPRs, { sessionId })).toEqual([]);
  });

  test("B cannot modify A's session", async () => {
    const { t, b, global, aCustom, sessionId } = await seedUserA();
    const denied = /Session not found/;
    await expect(
      b.mutation(api.sessions.logSet, {
        sessionId, exerciseId: global, setIndex: 1, repsActual: 1, weight: 1,
      })
    ).rejects.toThrow(denied);
    await expect(
      b.mutation(api.sessions.deleteSet, { sessionId, exerciseId: aCustom, setIndex: 0 })
    ).rejects.toThrow(denied);
    await expect(
      b.mutation(api.sessions.addSessionSet, { sessionId, exerciseId: aCustom })
    ).rejects.toThrow(denied);
    await expect(
      b.mutation(api.sessions.addSessionExercise, { sessionId, exerciseId: global })
    ).rejects.toThrow(denied);
    await expect(
      b.mutation(api.sessions.removeSessionExercise, { sessionId, exerciseId: aCustom })
    ).rejects.toThrow(denied);
    await expect(
      b.mutation(api.sessions.completeSession, { sessionId })
    ).rejects.toThrow(denied);
    await expect(
      b.mutation(api.sessions.deleteSession, { sessionId })
    ).rejects.toThrow(denied);

    // Nothing changed
    const session = await t.run((ctx) => ctx.db.get(sessionId));
    expect(session?.completedAt).toBeUndefined();
    expect(session?.exercises).toBeUndefined();
    expect(await t.run((ctx) => ctx.db.query("sessionSets").collect())).toHaveLength(1);
  });

  test("B cannot read or modify A's plan", async () => {
    const { t, b, global, planId } = await seedUserA();
    expect(await b.query(api.plans.getPlanById, { planId })).toBeNull();
    expect(await b.query(api.plans.getAllPlans, {})).toEqual([]);
    expect(await b.query(api.plans.getActivePlan, {})).toBeNull();

    const denied = /Plan not found/;
    await expect(
      b.mutation(api.plans.updatePlan, {
        planId,
        name: "pwned",
        days: [{ weekday: 0, exercises: [{ exerciseId: global, order: 0, sets: [] }] }],
      })
    ).rejects.toThrow(denied);
    await expect(b.mutation(api.plans.setActivePlan, { planId })).rejects.toThrow(denied);
    await expect(b.mutation(api.plans.deletePlan, { planId })).rejects.toThrow(denied);
    await expect(b.mutation(api.plans.generateShareToken, { planId })).rejects.toThrow(denied);

    expect((await t.run((ctx) => ctx.db.get(planId)))?.name).toBe("Test plan");
  });

  test("B's session on A's plan does not expose A's custom exercise via getSessionByDate", async () => {
    const { t, b, aCustom, planId } = await seedUserA();
    // B forges a session row pointing at A's plan and A's custom exercise
    // (as if written by an older, unchecked code path).
    await t.run(async (ctx) => {
      const sid = await ctx.db.insert("sessions", {
        userId: "user_b", date: DATE, planId, weekday: 0, createdAt: Date.now(),
        exercises: [{ key: "x", exerciseId: aCustom, sets: [{}] }],
      });
      await ctx.db.insert("sessionSets", {
        sessionId: sid, userId: "user_b", exerciseId: aCustom,
        setIndex: 0, repsActual: 1, weight: 1, createdAt: Date.now(),
      });
    });
    const view = await b.query(api.sessions.getSessionByDate, { date: DATE });
    expect(view?.sets[0].exercise).toBeNull();
    expect(view?.exercises?.[0].exercise).toBeNull();
  });

  test("B's getOrCreateSession with A's plan does not copy A's template", async () => {
    const { t, b, global, planId } = await seedUserA();
    const sid = await b.mutation(api.sessions.getOrCreateSession, { date: DATE, planId });
    // A structural edit materialises the list; it must not include A's exercises
    await b.mutation(api.sessions.addSessionExercise, { sessionId: sid, exerciseId: global });
    const session = await t.run((ctx) => ctx.db.get(sid));
    expect(session?.exercises?.map((e) => e.exerciseId)).toEqual([global]);
  });

  test("B cannot attach A's custom exercise to B's own plan", async () => {
    const { b, aCustom } = await seedUserA();
    const days = [{ weekday: 1, exercises: [{ exerciseId: aCustom, order: 0, sets: [{ repsTarget: 5 }] }] }];
    await expect(
      b.mutation(api.plans.createPlan, { name: "B plan", days })
    ).rejects.toThrow(/Exercise not found/);

    const own = await b.mutation(api.plans.createPlan, { name: "B plan", days: [] });
    await expect(
      b.mutation(api.plans.updatePlan, { planId: own, name: "B plan", days })
    ).rejects.toThrow(/Exercise not found/);
  });

  test("B cannot read A's custom exercise by id", async () => {
    const { b, aCustom } = await seedUserA();
    expect(await b.query(api.exercises.getExerciseDetail, { exerciseId: aCustom })).toBeNull();
    const prs = await b.query(api.records.getExercisePRs, { exerciseId: aCustom });
    expect(prs?.exercise ?? null).toBeNull();
    expect(prs?.prs ?? {}).toEqual({});
  });

  test("B cannot record PRs against A's session or A's custom exercise", async () => {
    const { t, b, global, aCustom, sessionId } = await seedUserA();
    await expect(
      b.mutation(api.records.checkAndUpdatePR, {
        sessionId, exerciseId: global, weight: 500, reps: 1, date: DATE,
      })
    ).rejects.toThrow(/Session not found/);

    const bSession = await b.mutation(api.sessions.getOrCreateSession, { date: DATE });
    await expect(
      b.mutation(api.records.checkAndUpdatePR, {
        sessionId: bSession, exerciseId: aCustom, weight: 500, reps: 1, date: DATE,
      })
    ).rejects.toThrow(/Exercise not found/);

    const bPRs = await t.run((ctx) =>
      ctx.db.query("personalRecords").withIndex("by_user", (q) => q.eq("userId", "user_b")).collect()
    );
    expect(bPRs).toEqual([]);
  });
});
