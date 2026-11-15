import { describe, it, expect } from "vitest";
import {
  compareSessions,
  countStalls,
  getLoadIncrement,
  getNextTarget,
  getWorkingSets,
  repRangeFromTargets,
  roundToStep,
  summarizeSession,
  type ProgressionSession,
  type ProgressionSet,
} from "@/convex/lib/progression";
import {
  addDays,
  classifyWeeklySets,
  computeWeeklyMuscleSets,
  getWeekStart,
  isIsoDate,
} from "@/convex/lib/weeklyVolume";

// Helper: session with N straight sets at one weight.
function session(date: string, weight: number, reps: number[], extra: ProgressionSet[] = []): ProgressionSession {
  return {
    date,
    sets: [
      ...extra,
      ...reps.map((r, i) => ({ weight, reps: r, setIndex: extra.length + i })),
    ],
  };
}

const range = { min: 8, max: 12 };

describe("getLoadIncrement", () => {
  it("uses 2.5 kg / 5 lb for barbell", () => {
    expect(getLoadIncrement("kg", "Barbell")).toBe(2.5);
    expect(getLoadIncrement("lb", "Barbell")).toBe(5);
  });
  it("uses 2 kg / 2.5 lb for dumbbells", () => {
    expect(getLoadIncrement("kg", "Dumbbell")).toBe(2);
    expect(getLoadIncrement("lb", "Dumbbell")).toBe(2.5);
  });
  it("uses larger steps for machines (stack plates)", () => {
    expect(getLoadIncrement("kg", "Machine")).toBe(5);
    expect(getLoadIncrement("lb", "Machine")).toBe(10);
  });
  it("is case-insensitive and falls back for unknown equipment", () => {
    expect(getLoadIncrement("kg", "dumbbell")).toBe(2);
    expect(getLoadIncrement("kg", undefined)).toBe(2.5);
    expect(getLoadIncrement("lb", "Ab Wheel")).toBe(5);
  });
});

describe("roundToStep", () => {
  it("rounds to the nearest step without float noise", () => {
    expect(roundToStep(91.3, 2.5)).toBe(92.5);
    expect(roundToStep(0.1 + 0.2, 0.1)).toBe(0.3);
  });
});

describe("repRangeFromTargets", () => {
  it("uses min..max of varying targets", () => {
    expect(repRangeFromTargets([12, 10, 8])).toEqual({ min: 8, max: 12 });
  });
  it("turns a fixed target into a 2-rep window", () => {
    expect(repRangeFromTargets([8, 8, 8])).toEqual({ min: 6, max: 8 });
  });
  it("never goes below 1 rep", () => {
    expect(repRangeFromTargets([1, 1])).toEqual({ min: 1, max: 1 });
    expect(repRangeFromTargets([2])).toEqual({ min: 1, max: 2 });
  });
  it("falls back to 8-12 for empty/invalid targets", () => {
    expect(repRangeFromTargets([])).toEqual({ min: 8, max: 12 });
    expect(repRangeFromTargets([0, NaN])).toEqual({ min: 8, max: 12 });
  });
});

describe("getWorkingSets", () => {
  it("drops tagged warm-up and drop sets", () => {
    const sets: ProgressionSet[] = [
      { weight: 100, reps: 5, setType: "warmup", setIndex: 0 },
      { weight: 100, reps: 8, setType: "normal", setIndex: 1 },
      { weight: 100, reps: 7, setType: "failure", setIndex: 2 },
      { weight: 80, reps: 10, setType: "drop", setIndex: 3 },
    ];
    expect(getWorkingSets(sets).map((s) => s.reps)).toEqual([8, 7]);
  });
  it("treats untagged light ramp-up sets as warm-ups", () => {
    const sets: ProgressionSet[] = [
      { weight: 40, reps: 10, setIndex: 0 },
      { weight: 70, reps: 5, setIndex: 1 },
      { weight: 100, reps: 8, setIndex: 2 },
      { weight: 90, reps: 9, setIndex: 3 }, // back-off >= 85% still counts
    ];
    expect(getWorkingSets(sets).map((s) => s.weight)).toEqual([100, 90]);
  });
  it("ignores sets with zero reps and keeps bodyweight sets", () => {
    expect(getWorkingSets([{ weight: 50, reps: 0 }])).toEqual([]);
    expect(getWorkingSets([{ weight: 0, reps: 10 }, { weight: 0, reps: 8 }])).toHaveLength(2);
  });
  it("orders sets by setIndex", () => {
    const sets = [
      { weight: 50, reps: 8, setIndex: 2 },
      { weight: 50, reps: 10, setIndex: 0 },
      { weight: 50, reps: 9, setIndex: 1 },
    ];
    expect(getWorkingSets(sets).map((s) => s.reps)).toEqual([10, 9, 8]);
  });
});

describe("compareSessions", () => {
  const s = (w: number, reps: number[]) => summarizeSession(session("2026-01-01", w, reps))!;
  it("heavier is progress", () => {
    expect(compareSessions(s(102.5, [6, 6]), s(100, [8, 8]))).toBe("progress");
  });
  it("same weight, more reps is progress; fewer is regression; equal is stall", () => {
    expect(compareSessions(s(100, [9, 8]), s(100, [8, 8]))).toBe("progress");
    expect(compareSessions(s(100, [8, 7]), s(100, [8, 8]))).toBe("regression");
    expect(compareSessions(s(100, [8, 8]), s(100, [8, 8]))).toBe("stall");
  });
  it("an extra set at the same reps is progress", () => {
    expect(compareSessions(s(100, [8, 8, 8]), s(100, [8, 8]))).toBe("progress");
  });
  it("a big weight drop is a reset (intentional deload)", () => {
    expect(compareSessions(s(90, [8, 8]), s(100, [8, 8]))).toBe("reset");
  });
  it("a small weight drop is judged by e1RM", () => {
    expect(compareSessions(s(97.5, [10]), s(100, [8]))).toBe("progress");
    expect(compareSessions(s(97.5, [7]), s(100, [8]))).toBe("regression");
  });
});

describe("countStalls", () => {
  it("counts consecutive stalls from the newest session and stops at progress", () => {
    const summaries = [
      session("2026-01-10", 100, [8, 8]),
      session("2026-01-07", 100, [8, 8]),
      session("2026-01-04", 100, [8, 9]), // newer one regressed vs this
      session("2026-01-01", 100, [8, 8]),
    ].map((x) => summarizeSession(x)!);
    // 10 vs 7: stall, 7 vs 4: regression, 4 vs 1: progress -> 2
    expect(countStalls(summaries)).toBe(2);
  });
  it("is 0 with a single session", () => {
    expect(countStalls([summarizeSession(session("2026-01-01", 100, [8]))!])).toBe(0);
  });
});

describe("getNextTarget", () => {
  it("asks for a starting weight when there is no history", () => {
    const t = getNextTarget({ sessions: [], repRange: range, units: "kg" });
    expect(t.action).toBe("start");
    expect(t.weight).toBeNull();
    expect(t.reps).toBe(8);
    expect(t.last).toBeNull();
    expect(t.reason).toMatch(/8–12/);
  });

  it("treats a history of only warm-ups as no history", () => {
    const t = getNextTarget({
      sessions: [{ date: "2026-01-01", sets: [{ weight: 60, reps: 10, setType: "warmup" }] }],
      repRange: range,
      units: "kg",
    });
    expect(t.action).toBe("start");
  });

  it("increases load (barbell kg) when all working sets hit the top of the range", () => {
    const t = getNextTarget({
      sessions: [session("2026-01-10", 60, [12, 12, 12])],
      repRange: range,
      units: "kg",
      equipment: "Barbell",
    });
    expect(t.action).toBe("increase_load");
    expect(t.weight).toBe(62.5);
    expect(t.reps).toBe(8);
    expect(t.reason).toMatch(/Add 2.5 kg/);
    expect(t.last).toEqual({ date: "2026-01-10", weight: 60, reps: [12, 12, 12] });
  });

  it("uses dumbbell and lb increments", () => {
    expect(
      getNextTarget({ sessions: [session("2026-01-10", 20, [12, 12])], repRange: range, units: "kg", equipment: "Dumbbell" }).weight
    ).toBe(22);
    expect(
      getNextTarget({ sessions: [session("2026-01-10", 135, [12, 12])], repRange: range, units: "lb", equipment: "Barbell" }).weight
    ).toBe(140);
    expect(
      getNextTarget({ sessions: [session("2026-01-10", 40, [12, 12])], repRange: range, units: "lb", equipment: "Dumbbell" }).weight
    ).toBe(42.5);
  });

  it("ignores warm-ups when checking the top of the range", () => {
    const t = getNextTarget({
      sessions: [
        session("2026-01-10", 60, [12, 12], [
          { weight: 60, reps: 5, setType: "warmup" },
          { weight: 30, reps: 10 },
        ]),
      ],
      repRange: range,
      units: "kg",
      equipment: "Barbell",
    });
    expect(t.action).toBe("increase_load");
  });

  it("ignores drop sets when checking the top of the range", () => {
    const t = getNextTarget({
      sessions: [
        session("2026-01-10", 60, [12, 12], [{ weight: 45, reps: 6, setType: "drop", setIndex: 9 }]),
      ],
      repRange: range,
      units: "kg",
    });
    expect(t.action).toBe("increase_load");
  });

  it("adds a rep to the weakest set when not every set hit the top", () => {
    const t = getNextTarget({
      sessions: [session("2026-01-10", 60, [12, 10, 9])],
      repRange: range,
      units: "kg",
      equipment: "Barbell",
    });
    expect(t.action).toBe("add_reps");
    expect(t.weight).toBe(60);
    expect(t.reps).toBe(10);
    expect(t.reason).toMatch(/Stay at 60 kg/);
    expect(t.reason).toMatch(/12, 10, 9/);
  });

  it("targets at least the bottom of the range after missing it", () => {
    const t = getNextTarget({ sessions: [session("2026-01-10", 60, [6, 5])], repRange: range, units: "kg" });
    expect(t.action).toBe("add_reps");
    expect(t.reps).toBe(8);
  });

  it("never targets more than the top of the range when adding reps", () => {
    const t = getNextTarget({ sessions: [session("2026-01-10", 60, [12, 12, 11])], repRange: range, units: "kg" });
    expect(t.action).toBe("add_reps");
    expect(t.reps).toBe(12);
  });

  it("does not deload after a single stall", () => {
    const t = getNextTarget({
      sessions: [session("2026-01-10", 60, [9, 9]), session("2026-01-07", 60, [9, 9])],
      repRange: range,
      units: "kg",
    });
    expect(t.action).toBe("add_reps");
    expect(t.stallCount).toBe(1);
  });

  it("deloads ~10% after two consecutive stalls/regressions", () => {
    const t = getNextTarget({
      sessions: [
        session("2026-01-10", 100, [8, 7]),
        session("2026-01-07", 100, [8, 8]),
        session("2026-01-04", 100, [8, 8]),
      ],
      repRange: range,
      units: "kg",
      equipment: "Barbell",
    });
    expect(t.action).toBe("deload");
    expect(t.weight).toBe(90);
    expect(t.reps).toBe(12);
    expect(t.stallCount).toBe(2);
    expect(t.reason).toMatch(/3 sessions/);
  });

  it("rounds deload weight down to a loadable increment", () => {
    const t = getNextTarget({
      sessions: [
        session("2026-01-10", 67.5, [8, 8]),
        session("2026-01-07", 67.5, [8, 8]),
        session("2026-01-04", 67.5, [8, 8]),
      ],
      repRange: range,
      units: "kg",
      equipment: "Barbell",
    });
    // 67.5 * 0.9 = 60.75 -> 60
    expect(t.weight).toBe(60);
  });

  it("always deloads by at least one increment for light weights", () => {
    const t = getNextTarget({
      sessions: [
        session("2026-01-10", 4, [8]),
        session("2026-01-07", 4, [8]),
        session("2026-01-04", 4, [8]),
      ],
      repRange: range,
      units: "kg",
      equipment: "Dumbbell",
    });
    expect(t.action).toBe("deload");
    expect(t.weight).toBeLessThan(4);
  });

  it("respects a custom stall threshold", () => {
    const sessions = [
      session("2026-01-10", 100, [8, 8]),
      session("2026-01-07", 100, [8, 8]),
      session("2026-01-04", 100, [8, 8]),
    ];
    expect(getNextTarget({ sessions, repRange: range, units: "kg", stallsBeforeDeload: 3 }).action).toBe("add_reps");
  });

  it("prefers increasing load over deloading when the top of the range is reached", () => {
    const t = getNextTarget({
      sessions: [
        session("2026-01-10", 100, [12, 12]),
        session("2026-01-07", 100, [12, 12]),
        session("2026-01-04", 100, [12, 12]),
      ],
      repRange: range,
      units: "kg",
    });
    expect(t.action).toBe("increase_load");
  });

  it("does not count progress after an intentional deload as a stall", () => {
    const t = getNextTarget({
      sessions: [
        session("2026-01-13", 90, [10, 10]),
        session("2026-01-10", 100, [7, 7]),
        session("2026-01-07", 100, [8, 7]),
        session("2026-01-04", 100, [8, 8]),
      ],
      repRange: range,
      units: "kg",
    });
    expect(t.action).toBe("add_reps");
    expect(t.stallCount).toBe(0);
  });

  it("sorts sessions by date regardless of input order", () => {
    const t = getNextTarget({
      sessions: [session("2026-01-01", 50, [12, 12]), session("2026-01-10", 55, [9, 8])],
      repRange: range,
      units: "kg",
    });
    expect(t.last?.date).toBe("2026-01-10");
    expect(t.action).toBe("add_reps");
    expect(t.weight).toBe(55);
  });

  it("suggests adding external load for bodyweight exercises at the top", () => {
    const t = getNextTarget({
      sessions: [session("2026-01-10", 0, [12, 12, 12])],
      repRange: range,
      units: "kg",
      equipment: "Bodyweight",
    });
    expect(t.action).toBe("increase_load");
    expect(t.weight).toBe(2.5);
    expect(t.reason).toMatch(/belt or vest/);
  });

  it("never deloads bodyweight exercises below zero", () => {
    const t = getNextTarget({
      sessions: [
        session("2026-01-10", 0, [8]),
        session("2026-01-07", 0, [8]),
        session("2026-01-04", 0, [8]),
      ],
      repRange: range,
      units: "kg",
    });
    expect(t.action).toBe("add_reps");
    expect(t.reason).toMatch(/Keep the load/);
  });

  it("normalizes an inverted rep range", () => {
    const t = getNextTarget({ sessions: [], repRange: { min: 12, max: 8 }, units: "kg" });
    expect(t.repRange).toEqual({ min: 8, max: 12 });
  });

  it("works with a fixed-target plan converted to a window", () => {
    const fixed = repRangeFromTargets([5, 5, 5]); // 3..5
    expect(getNextTarget({ sessions: [session("2026-01-10", 100, [5, 5, 5])], repRange: fixed, units: "kg" }).action).toBe(
      "increase_load"
    );
    const t = getNextTarget({ sessions: [session("2026-01-10", 100, [5, 4, 3])], repRange: fixed, units: "kg" });
    expect(t.action).toBe("add_reps");
    expect(t.reps).toBe(4);
  });
});

describe("weekly volume date helpers", () => {
  it("validates ISO dates strictly", () => {
    expect(isIsoDate("2026-11-15")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-1-5")).toBe(false);
  });
  it("adds days across month/year and DST boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("finds the Sunday week start by default and Monday optionally", () => {
    // 2026-11-15 is a Sunday
    expect(getWeekStart("2026-11-15")).toBe("2026-11-15");
    expect(getWeekStart("2026-11-21")).toBe("2026-11-15");
    expect(getWeekStart("2026-11-15", 1)).toBe("2026-11-09");
    expect(getWeekStart("2026-11-16", 1)).toBe("2026-11-16");
  });
});

describe("classifyWeeklySets", () => {
  it("classifies against the 10-20 band inclusively", () => {
    expect(classifyWeeklySets(9)).toBe("under");
    expect(classifyWeeklySets(10)).toBe("in_range");
    expect(classifyWeeklySets(20)).toBe("in_range");
    expect(classifyWeeklySets(21)).toBe("over");
  });
});

describe("computeWeeklyMuscleSets", () => {
  const today = "2026-11-18"; // Wednesday; week starts Sun 2026-11-15
  const set = (date: string, muscleGroup: string | undefined, reps = 8, setType?: string) => ({
    date,
    muscleGroup,
    reps,
    setType,
  });

  it("splits sets into current and previous week", () => {
    const r = computeWeeklyMuscleSets(
      [
        set("2026-11-15", "Chest"),
        set("2026-11-18", "Chest"),
        set("2026-11-14", "Chest"), // previous week (Sat)
        set("2026-11-08", "Chest"), // previous week (Sun)
        set("2026-11-07", "Chest"), // too old
      ],
      today
    );
    expect(r.currentWeekStart).toBe("2026-11-15");
    expect(r.previousWeekStart).toBe("2026-11-08");
    expect(r.daysElapsed).toBe(4);
    expect(r.muscles).toEqual([
      { muscleGroup: "Chest", currentWeek: 2, previousWeek: 2, status: "under" },
    ]);
  });

  it("excludes warm-ups, zero-rep sets and future dates", () => {
    const r = computeWeeklyMuscleSets(
      [
        set("2026-11-16", "Back", 8, "warmup"),
        set("2026-11-16", "Back", 0),
        set("2026-11-19", "Back"),
        set("2026-11-16", "Back", 8, "drop"),
        set("2026-11-16", "Back", 8, "failure"),
      ],
      today
    );
    expect(r.muscles[0]).toMatchObject({ muscleGroup: "Back", currentWeek: 2 });
  });

  it("buckets missing muscle groups under Other and sorts by current volume", () => {
    const sets = [
      ...Array.from({ length: 12 }, () => set("2026-11-16", "Legs")),
      ...Array.from({ length: 22 }, () => set("2026-11-16", "Back")),
      set("2026-11-16", undefined),
    ];
    const r = computeWeeklyMuscleSets(sets, today);
    expect(r.muscles.map((m) => [m.muscleGroup, m.status])).toEqual([
      ["Back", "over"],
      ["Legs", "in_range"],
      ["Other", "under"],
    ]);
  });

  it("returns an empty list with no data", () => {
    const r = computeWeeklyMuscleSets([], "2026-11-15");
    expect(r.muscles).toEqual([]);
    expect(r.daysElapsed).toBe(1);
    expect(r.guideline).toEqual({ min: 10, max: 20 });
  });
});
