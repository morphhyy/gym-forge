import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { USER_A, USER_B, createGlobalExercise, createUser, setup } from "./setup";

const WARMUP = ["5 min easy bike", "Leg swings · 10 / leg"];
const COOLDOWN = ["3 min easy walk", "Seated hamstring stretch · 45 s"];

async function planWithRoutines(t: ReturnType<typeof setup>) {
  await createUser(t, "user_a");
  const ex = await createGlobalExercise(t, "Squat");
  const a = t.withIdentity(USER_A);
  const planId = await a.mutation(api.plans.createPlan, {
    name: "Legs plan",
    days: [
      {
        weekday: 0,
        name: "Legs",
        warmup: WARMUP,
        cooldown: COOLDOWN,
        exercises: [{ exerciseId: ex, order: 0, sets: [{ repsTarget: 8 }] }],
      },
    ],
  });
  return { a, planId, ex };
}

describe("plan day warm-up / cool-down", () => {
  test("createPlan stores them and getTodayTemplate returns them", async () => {
    const t = setup();
    const { a } = await planWithRoutines(t);
    const today = await a.query(api.plans.getTodayTemplate, { date: "2026-03-01" }); // Sunday
    expect(today?.day).toMatchObject({ warmup: WARMUP, cooldown: COOLDOWN });
  });

  test("updatePlan keeps them when resubmitted", async () => {
    const t = setup();
    const { a, planId, ex } = await planWithRoutines(t);
    await a.mutation(api.plans.updatePlan, {
      planId,
      name: "Legs plan v2",
      days: [
        {
          weekday: 0,
          name: "Legs",
          warmup: [...WARMUP, "Glute bridges · 12"],
          cooldown: COOLDOWN,
          exercises: [{ exerciseId: ex, order: 0, sets: [{ repsTarget: 8 }] }],
        },
      ],
    });
    const plan = await a.query(api.plans.getPlanById, { planId });
    expect(plan?.days[0].warmup).toHaveLength(3);
  });

  test("copySharedPlan copies them", async () => {
    const t = setup();
    const { a, planId } = await planWithRoutines(t);
    const { shareToken: token } = await a.mutation(api.plans.generateShareToken, { planId });
    await createUser(t, "user_b");
    const b = t.withIdentity(USER_B);
    const { planId: copyId } = await b.mutation(api.plans.copySharedPlan, { shareToken: token! });
    const copy = await b.query(api.plans.getPlanById, { planId: copyId });
    expect(copy?.days[0]).toMatchObject({ warmup: WARMUP, cooldown: COOLDOWN });
  });

  test("rejects oversized routines", async () => {
    const t = setup();
    await createUser(t, "user_a");
    const a = t.withIdentity(USER_A);
    await expect(
      a.mutation(api.plans.createPlan, {
        name: "Too long",
        days: [{ weekday: 0, warmup: Array(31).fill("x"), exercises: [] }],
      })
    ).rejects.toThrow(/warm-up/i);
  });
});
