import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import {
  USER_A,
  USER_B,
  createCustomExercise,
  createGlobalExercise,
  setup,
} from "./setup";

describe("importer.importSessionsBatch", () => {
  test("imports sessions with userId, tags warm-ups and marks them completed", async () => {
    const t = setup();
    const ex = await createGlobalExercise(t);
    const result = await t.withIdentity(USER_A).mutation(api.importer.importSessionsBatch, {
      sessions: [
        {
          date: "2026-03-01",
          notes: "Imported",
          sets: [
            { exerciseId: ex, setIndex: 0, weight: 40, reps: 10, isWarmup: true },
            { exerciseId: ex, setIndex: 1, weight: 100.456, reps: 5, rpe: 12 },
          ],
        },
      ],
    });
    expect(result).toEqual({ imported: 1, skippedExisting: 0, setsInserted: 2 });

    const session = await t.run((ctx) => ctx.db.query("sessions").first());
    expect(session).toMatchObject({
      userId: "user_a",
      date: "2026-03-01",
      weekday: 0,
      completedAt: Date.parse("2026-03-01T12:00:00Z"),
      notes: "Imported",
    });
    const sets = (await t.run((ctx) => ctx.db.query("sessionSets").collect())).sort(
      (a, b) => a.setIndex - b.setIndex
    );
    expect(sets.map((s) => s.userId)).toEqual(["user_a", "user_a"]);
    expect(sets[0].setType).toBe("warmup");
    expect(sets[1]).toMatchObject({ weight: 100.46, rpe: 10 });
    expect(sets[1].setType).toBeUndefined();
  });

  test("skips dates that already have a session (and duplicates within a batch)", async () => {
    const t = setup();
    const a = t.withIdentity(USER_A);
    const ex = await createGlobalExercise(t);
    const existing = await a.mutation(api.sessions.getOrCreateSession, { date: "2026-03-01" });
    const set = { exerciseId: ex, setIndex: 0, weight: 100, reps: 5 };

    const result = await a.mutation(api.importer.importSessionsBatch, {
      sessions: [
        { date: "2026-03-01", sets: [set] }, // exists
        { date: "2026-03-02", sets: [set] },
        { date: "2026-03-02", sets: [set] }, // duplicate in batch
        { date: "not-a-date", sets: [set] },
      ],
    });
    expect(result).toEqual({ imported: 1, skippedExisting: 3, setsInserted: 1 });
    // Existing hand-logged session untouched
    const sets = await t.run((ctx) =>
      ctx.db.query("sessionSets").withIndex("by_session", (q) => q.eq("sessionId", existing)).collect()
    );
    expect(sets).toEqual([]);

    // Re-importing the same file is a no-op
    const again = await a.mutation(api.importer.importSessionsBatch, {
      sessions: [{ date: "2026-03-02", sets: [set] }],
    });
    expect(again).toEqual({ imported: 0, skippedExisting: 1, setsInserted: 0 });
  });

  test("another user's existing session on that date doesn't block the import", async () => {
    const t = setup();
    const ex = await createGlobalExercise(t);
    await t.withIdentity(USER_B).mutation(api.sessions.getOrCreateSession, { date: "2026-03-01" });
    const result = await t.withIdentity(USER_A).mutation(api.importer.importSessionsBatch, {
      sessions: [{ date: "2026-03-01", sets: [{ exerciseId: ex, setIndex: 0, weight: 100, reps: 5 }] }],
    });
    expect(result.imported).toBe(1);
  });

  test("drops sets for another user's custom exercise and invalid numbers", async () => {
    const t = setup();
    const ex = await createGlobalExercise(t);
    const bCustom = await createCustomExercise(t, "user_b");
    const result = await t.withIdentity(USER_A).mutation(api.importer.importSessionsBatch, {
      sessions: [
        {
          date: "2026-03-01",
          sets: [
            { exerciseId: bCustom, setIndex: 0, weight: 100, reps: 5 },
            { exerciseId: ex, setIndex: 1, weight: -5, reps: 5 },
            { exerciseId: ex, setIndex: 2, weight: 100, reps: 0 },
          ],
        },
      ],
    });
    // No valid sets -> no session created
    expect(result).toEqual({ imported: 0, skippedExisting: 0, setsInserted: 0 });
    expect(await t.run((ctx) => ctx.db.query("sessions").collect())).toEqual([]);
  });

  test("ensureCustomExercises reuses same-named customs per user", async () => {
    const t = setup();
    const a = t.withIdentity(USER_A);
    const existing = await createCustomExercise(t, "user_a", "Zercher Squat");
    await createCustomExercise(t, "user_b", "Sled Push");
    const ids = await a.mutation(api.importer.ensureCustomExercises, {
      names: ["zercher squat ", "Sled Push"],
    });
    expect(ids["zercher squat "]).toBe(existing);
    const created = await t.run((ctx) => ctx.db.get(ids["Sled Push"]));
    expect(created).toMatchObject({ userId: "user_a", isGlobal: false, name: "Sled Push" });
  });

  test("getExistingSessionDates only reports the caller's dates", async () => {
    const t = setup();
    await t.withIdentity(USER_B).mutation(api.sessions.getOrCreateSession, { date: "2026-03-01" });
    await t.withIdentity(USER_A).mutation(api.sessions.getOrCreateSession, { date: "2026-03-02" });
    const dates = await t.withIdentity(USER_A).query(api.importer.getExistingSessionDates, {
      dates: ["2026-03-01", "2026-03-02", "2026-03-03"],
    });
    expect(dates).toEqual(["2026-03-02"]);
  });
});
