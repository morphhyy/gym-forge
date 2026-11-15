import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import {
  USER_A,
  createGlobalExercise,
  createPlan,
  createUser,
  setup,
  type TestConvex,
} from "./setup";

// 2026-03-01 is a Sunday.
async function complete(t: TestConvex, date: string) {
  const a = t.withIdentity(USER_A);
  const sessionId = await a.mutation(api.sessions.getOrCreateSession, { date });
  const result = await a.mutation(api.sessions.completeSession, { sessionId });
  return { sessionId, ...result };
}

const getUser = (t: TestConvex) => t.run((ctx) => ctx.db.query("users").first());
const achievementTypes = async (t: TestConvex) =>
  (await t.run((ctx) => ctx.db.query("achievements").collect())).map((a) => a.type).sort();

describe("completeSession streaks without a plan (calendar days)", () => {
  test("consecutive days extend the streak, a gap resets it", async () => {
    const t = setup();
    await createUser(t, "user_a");
    expect((await complete(t, "2026-02-28")).streakResult?.streak).toBe(1);
    expect((await complete(t, "2026-03-01")).streakResult?.streak).toBe(2);
    expect((await complete(t, "2026-03-03")).streakResult?.streak).toBe(1);
    expect(await getUser(t)).toMatchObject({
      currentStreak: 1,
      longestStreak: 2,
      lastWorkoutDate: "2026-03-03",
    });
  });

  test("streaks cross month boundaries by calendar date", async () => {
    const t = setup();
    await createUser(t, "user_a");
    await complete(t, "2026-02-27");
    await complete(t, "2026-02-28");
    const r = await complete(t, "2026-03-01");
    expect(r.streakResult).toMatchObject({ streak: 3, newAchievements: ["streak_3"] });
  });

  test("re-completing a session doesn't bump the streak again", async () => {
    const t = setup();
    await createUser(t, "user_a");
    const { sessionId } = await complete(t, "2026-03-01");
    const again = await t
      .withIdentity(USER_A)
      .mutation(api.sessions.completeSession, { sessionId, notes: "edited" });
    expect(again.streakResult).toBeNull();
    expect((await getUser(t))?.currentStreak).toBe(1);
  });

  test("achievements are not double-awarded when a streak is re-reached", async () => {
    const t = setup();
    await createUser(t, "user_a");
    await complete(t, "2026-03-01");
    await complete(t, "2026-03-02");
    const third = await complete(t, "2026-03-03");
    expect(third.streakResult?.newAchievements).toEqual(["streak_3"]);

    // Delete day 3 (streak drops to 2) and log it again (streak back to 3)
    await t.withIdentity(USER_A).mutation(api.sessions.deleteSession, { sessionId: third.sessionId });
    expect((await getUser(t))?.currentStreak).toBe(2);
    const redo = await complete(t, "2026-03-03");
    expect(redo.streakResult).toMatchObject({ streak: 3, newAchievements: [] });
    expect(await achievementTypes(t)).toEqual(["streak_3"]);
  });

  test("backfilling an earlier day doesn't move lastWorkoutDate backwards", async () => {
    const t = setup();
    await createUser(t, "user_a");
    await complete(t, "2026-03-01");
    await complete(t, "2026-03-03");
    // Forgot to log Monday; log it afterwards
    const backfill = await complete(t, "2026-03-02");
    expect(backfill.streakResult?.streak).toBe(3);
    expect(await getUser(t)).toMatchObject({ currentStreak: 3, lastWorkoutDate: "2026-03-03" });
    // The next day continues the streak
    expect((await complete(t, "2026-03-04")).streakResult?.streak).toBe(4);
  });
});

describe("completeSession streaks with an active plan (planned weekdays)", () => {
  // Sun / Tue / Thu plan
  async function withPlan() {
    const t = setup();
    await createUser(t, "user_a");
    const ex = await createGlobalExercise(t);
    await createPlan(t, "user_a", { 0: [ex], 2: [ex], 4: [ex] });
    return t;
  }

  test("rest days between planned days don't break the streak", async () => {
    const t = await withPlan();
    expect((await complete(t, "2026-02-26")).streakResult?.streak).toBe(1); // Thu
    expect((await complete(t, "2026-03-01")).streakResult?.streak).toBe(2); // Sun
    const tue = await complete(t, "2026-03-03"); // Tue
    expect(tue.streakResult).toMatchObject({ streak: 3, newAchievements: ["streak_3"] });
  });

  test("a missed planned day breaks the streak", async () => {
    const t = await withPlan();
    await complete(t, "2026-02-26"); // Thu
    // Skip Sun 03-01
    expect((await complete(t, "2026-03-03")).streakResult?.streak).toBe(1);
  });

  test("a rest-day workout keeps the streak and records lastWorkoutDate", async () => {
    const t = await withPlan();
    await complete(t, "2026-03-01"); // Sun
    const mon = await complete(t, "2026-03-02"); // Mon (rest day)
    expect(mon.streakResult).toMatchObject({ streak: 1, newAchievements: [] });
    expect(await getUser(t)).toMatchObject({ currentStreak: 1, lastWorkoutDate: "2026-03-02" });
  });

  test("backfilling a planned day recomputes the streak as of the latest workout", async () => {
    const t = await withPlan();
    await complete(t, "2026-02-26"); // Thu
    await complete(t, "2026-03-03"); // Tue (Sun missing -> streak 1)
    const sun = await complete(t, "2026-03-01"); // backfill Sun
    expect(sun.streakResult?.streak).toBe(3);
    expect(await getUser(t)).toMatchObject({ currentStreak: 3, lastWorkoutDate: "2026-03-03" });
  });
});

describe("streaks.getStreakData uses the client's local date", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("today = 2026-03-01 even when the server clock is already 03-02 UTC", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 03:00 UTC on Monday = Sunday evening in the Americas
    vi.setSystemTime(new Date("2026-03-02T03:00:00Z"));
    const t = setup();
    await createUser(t, "user_a");
    const ex = await createGlobalExercise(t);
    await createPlan(t, "user_a", { 0: [ex] }); // Sundays only
    await complete(t, "2026-02-22");
    await complete(t, "2026-03-01");

    const a = t.withIdentity(USER_A);
    const local = await a.query(api.streaks.getStreakData, { today: "2026-03-01" });
    expect(local).toMatchObject({ currentStreak: 2, weeklyCompleted: 1 });
    const status = await a.query(api.streaks.getStreakStatus, { today: "2026-03-01" });
    expect(status).toEqual({ status: "completed", streak: 2 });

    // Without `today` the server falls back to the UTC date (Mon 03-02, a
    // rest day in the same Sunday-started week), so the result is unchanged.
    const utc = await a.query(api.streaks.getStreakData, {});
    expect(utc).toMatchObject({ currentStreak: 2, weeklyCompleted: 1 });
  });

  test("rejects malformed today strings", async () => {
    const t = setup();
    await createUser(t, "user_a");
    await expect(
      t.withIdentity(USER_A).query(api.streaks.getStreakData, { today: "03/01/2026" })
    ).rejects.toThrow(/Invalid date/);
  });
});
