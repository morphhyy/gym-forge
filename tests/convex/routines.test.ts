import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { USER_A, USER_B, setup } from "./setup";

const DATE = "2026-03-01";

describe("sessions.setSessionRoutine (warm-up / cool-down ticks)", () => {
  test("ticks and unticks warm-up and cool-down independently", async () => {
    const t = setup();
    const a = t.withIdentity(USER_A);
    const sessionId = await a.mutation(api.sessions.getOrCreateSession, { date: DATE });

    await a.mutation(api.sessions.setSessionRoutine, { sessionId, routine: "warmup", done: true });
    let s = await a.query(api.sessions.getSessionByDate, { date: DATE });
    expect(s?.warmupCompletedAt).toBeTypeOf("number");
    expect(s?.cooldownCompletedAt).toBeUndefined();

    await a.mutation(api.sessions.setSessionRoutine, { sessionId, routine: "cooldown", done: true });
    await a.mutation(api.sessions.setSessionRoutine, { sessionId, routine: "warmup", done: false });
    s = await a.query(api.sessions.getSessionByDate, { date: DATE });
    expect(s?.warmupCompletedAt).toBeUndefined();
    expect(s?.cooldownCompletedAt).toBeTypeOf("number");
  });

  test("is reported in the month calendar summary", async () => {
    const t = setup();
    const a = t.withIdentity(USER_A);
    const sessionId = await a.mutation(api.sessions.getOrCreateSession, { date: DATE });
    await a.mutation(api.sessions.setSessionRoutine, { sessionId, routine: "warmup", done: true });

    const month = await a.query(api.sessions.getSessionsForMonth, { year: 2026, month: 3 });
    expect(month[0]).toMatchObject({ warmupDone: true, cooldownDone: false });
  });

  test("another user cannot tick someone else's session", async () => {
    const t = setup();
    const sessionId = await t
      .withIdentity(USER_A)
      .mutation(api.sessions.getOrCreateSession, { date: DATE });
    await expect(
      t.withIdentity(USER_B).mutation(api.sessions.setSessionRoutine, {
        sessionId,
        routine: "warmup",
        done: true,
      })
    ).rejects.toThrow("Session not found");
  });
});
