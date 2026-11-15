import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import {
  USER_A,
  USER_B,
  createGlobalExercise,
  createPlan,
  createUser,
  setup,
  type TestConvex,
} from "./setup";
import type { Id } from "../../convex/_generated/dataModel";

async function logSession(
  t: TestConvex,
  identity: typeof USER_A,
  date: string,
  exerciseId: Id<"exercises">,
  sets: [number, number][] // [weight, reps]
) {
  const as = t.withIdentity(identity);
  const sessionId = await as.mutation(api.sessions.getOrCreateSession, { date });
  for (const [i, [weight, reps]] of sets.entries()) {
    await as.mutation(api.sessions.logSet, {
      sessionId, exerciseId, setIndex: i, repsActual: reps, weight,
    });
  }
  return sessionId;
}

describe("progression.getNextTargets", () => {
  test("increases load once every working set hits the top of the plan's range", async () => {
    const t = setup();
    await createUser(t, "user_a");
    const bench = await t.run((ctx) =>
      ctx.db.insert("exercises", {
        name: "Bench Press", equipment: "Barbell", isGlobal: true, createdAt: 0,
      })
    );
    await createPlan(t, "user_a", { 0: [bench] }); // 3 x 8 -> 8-10 window
    await logSession(t, USER_A, "2026-03-01", bench, [[100, 10], [100, 10], [100, 10]]);

    const targets = await t
      .withIdentity(USER_A)
      .query(api.progression.getNextTargets, { exerciseIds: [bench] });
    expect(targets[bench]).toMatchObject({ action: "increase_load", weight: 102.5 });
  });

  test("excludeSessionId bases targets only on previous workouts", async () => {
    const t = setup();
    const ex = await createGlobalExercise(t);
    await logSession(t, USER_A, "2026-03-01", ex, [[50, 12]]);
    const today = await logSession(t, USER_A, "2026-03-03", ex, [[60, 5]]);
    const a = t.withIdentity(USER_A);
    const withToday = await a.query(api.progression.getNextTargets, { exerciseIds: [ex] });
    const without = await a.query(api.progression.getNextTargets, {
      exerciseIds: [ex], excludeSessionId: today,
    });
    expect(without[ex]).not.toEqual(withToday[ex]);
    expect(without[ex].weight).toBeGreaterThanOrEqual(50);
    expect(without[ex].weight).toBeLessThan(60);
  });

  test("uses only the caller's history", async () => {
    const t = setup();
    const ex = await createGlobalExercise(t);
    await logSession(t, USER_B, "2026-03-01", ex, [[200, 10]]);
    const targets = await t
      .withIdentity(USER_A)
      .query(api.progression.getNextTargets, { exerciseIds: [ex] });
    expect(targets[ex]).toMatchObject({ action: "start", weight: null });
  });

  test("returns {} when signed out", async () => {
    const t = setup();
    const ex = await createGlobalExercise(t);
    expect(await t.query(api.progression.getNextTargets, { exerciseIds: [ex] })).toEqual({});
  });
});
