import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import type { Id } from "../../convex/_generated/dataModel";

// Every Convex module (incl. _generated) so convex-test can resolve
// function references like api.sessions.logSet.
export const modules = import.meta.glob("../../convex/**/*.*s");

export function setup() {
  return convexTest(schema, modules);
}

export type TestConvex = ReturnType<typeof setup>;

export const USER_A = { subject: "user_a", email: "a@example.com" };
export const USER_B = { subject: "user_b", email: "b@example.com" };

/** Insert a users row for a Clerk subject (what ensureUser would create). */
export async function createUser(
  t: TestConvex,
  clerkUserId: string,
  extra: Record<string, unknown> = {}
): Promise<Id<"users">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      clerkUserId,
      email: `${clerkUserId}@example.com`,
      units: "kg",
      aiUsageCount: 0,
      createdAt: Date.now(),
      ...extra,
    })
  );
}

export async function createGlobalExercise(
  t: TestConvex,
  name = "Bench Press"
): Promise<Id<"exercises">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("exercises", { name, isGlobal: true, createdAt: Date.now() })
  );
}

export async function createCustomExercise(
  t: TestConvex,
  userId: string,
  name = "My Custom Lift"
): Promise<Id<"exercises">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("exercises", {
      name,
      isGlobal: false,
      userId,
      createdAt: Date.now(),
    })
  );
}

/**
 * Create an (active by default) plan owned by `userId` with the given
 * weekdays each holding the given exercises (3 sets of 8).
 */
export async function createPlan(
  t: TestConvex,
  userId: string,
  days: Record<number, Id<"exercises">[]>,
  opts: { active?: boolean } = {}
): Promise<{ planId: Id<"plans">; planExerciseIds: Id<"planExercises">[] }> {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const planId = await ctx.db.insert("plans", {
      userId,
      name: "Test plan",
      active: opts.active ?? true,
      createdAt: now,
    });
    const planExerciseIds: Id<"planExercises">[] = [];
    for (const [weekday, exerciseIds] of Object.entries(days)) {
      const planDayId = await ctx.db.insert("planDays", {
        planId,
        weekday: Number(weekday),
        createdAt: now,
      });
      let order = 0;
      for (const exerciseId of exerciseIds) {
        planExerciseIds.push(
          await ctx.db.insert("planExercises", {
            planDayId,
            exerciseId,
            order: order++,
            sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }],
            createdAt: now,
          })
        );
      }
    }
    return { planId, planExerciseIds };
  });
}
