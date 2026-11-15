import { describe, it, expect } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import { deriveSessionExercises } from "@/convex/lib/sessionExercises";
import {
  calculatePlates,
  computeSessionStats,
  formatDuration,
  groupBySuperset,
  isBarbellExercise,
  nextAfterSet,
  parseReps,
  parseWeight,
  PLATES,
  resolveRestSeconds,
} from "@/app/lib/workout-logger";
import { resolveSetValues, type LoggedSet } from "@/app/components/log/types";

const ex = (s: string) => s as Id<"exercises">;
const pe = (s: string) => s as Id<"planExercises">;

describe("parseWeight / parseReps", () => {
  it("accepts comma and dot decimals", () => {
    expect(parseWeight("62,5")).toBe(62.5);
    expect(parseWeight(" 62.5 ")).toBe(62.5);
    expect(parseWeight("0")).toBe(0);
  });
  it("rejects empty, negative and garbage", () => {
    expect(parseWeight("")).toBeNull();
    expect(parseWeight(undefined)).toBeNull();
    expect(parseWeight("-5")).toBeNull();
    expect(parseWeight("abc")).toBeNull();
  });
  it("reps must be whole numbers", () => {
    expect(parseReps("8")).toBe(8);
    expect(parseReps("8.5")).toBeNull();
    expect(parseReps("")).toBeNull();
  });
});

describe("deriveSessionExercises", () => {
  const template = [
    { _id: pe("pe1"), exerciseId: ex("bench"), sets: [{ repsTarget: 8 }, { repsTarget: 8 }], restSeconds: 120 },
    { _id: pe("pe2"), exerciseId: ex("row"), sets: [{ repsTarget: 10 }], supersetGroup: "A" },
  ];

  it("uses the template when nothing is logged", () => {
    const result = deriveSessionExercises(template, []);
    expect(result.map((e) => e.exerciseId)).toEqual(["bench", "row"]);
    expect(result[0]).toMatchObject({ key: "pe1", planExerciseId: "pe1", restSeconds: 120 });
    expect(result[0].sets).toEqual([{ repsTarget: 8 }, { repsTarget: 8 }]);
  });

  it("extends rows for extra logged sets and appends off-plan exercises", () => {
    const result = deriveSessionExercises(template, [
      { exerciseId: ex("bench"), setIndex: 3 },
      { exerciseId: ex("curl"), setIndex: 0 },
      { exerciseId: ex("curl"), setIndex: 1 },
    ]);
    expect(result[0].sets).toHaveLength(4);
    expect(result[0].sets[3]).toEqual({});
    expect(result[2]).toMatchObject({ key: "x-curl", exerciseId: "curl" });
    expect(result[2].sets).toHaveLength(2);
  });

  it("freestyle: no template, list comes from logged sets only", () => {
    expect(deriveSessionExercises([], [])).toEqual([]);
    expect(deriveSessionExercises([], [{ exerciseId: ex("squat"), setIndex: 0 }])).toHaveLength(1);
  });
});

describe("groupBySuperset", () => {
  it("groups consecutive entries with the same group only", () => {
    const groups = groupBySuperset([
      { id: 1, supersetGroup: "A" },
      { id: 2, supersetGroup: "A" },
      { id: 3 },
      { id: 4, supersetGroup: "A" },
      { id: 5, supersetGroup: "" },
    ]);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([[1, 2], [3], [4], [5]]);
  });
});

describe("nextAfterSet (superset flow)", () => {
  const group = [
    { exerciseId: "a", setCount: 3 },
    { exerciseId: "b", setCount: 3 },
    { exerciseId: "c", setCount: 2 },
  ];
  const none = () => false;

  it("moves to the next exercise in the round without resting", () => {
    expect(nextAfterSet(group, "a", 0, none)).toEqual({
      focus: { exerciseId: "b", setIndex: 0 },
      startRest: false,
    });
  });

  it("rests after the last exercise of the round", () => {
    expect(nextAfterSet(group, "c", 0, none)).toEqual({ focus: null, startRest: true });
  });

  it("skips exercises that have no set at this index or are already logged", () => {
    expect(nextAfterSet(group, "b", 2, none)).toEqual({ focus: null, startRest: true });
    const logged = (e: string, i: number) => e === "b" && i === 1;
    expect(nextAfterSet(group, "a", 1, logged).focus).toEqual({ exerciseId: "c", setIndex: 1 });
  });

  it("single exercise always rests", () => {
    expect(nextAfterSet([{ exerciseId: "a", setCount: 3 }], "a", 0, none)).toEqual({
      focus: null,
      startRest: true,
    });
  });
});

describe("resolveRestSeconds", () => {
  it("prefers per-exercise rest (max across the superset)", () => {
    expect(resolveRestSeconds([{ restSeconds: 60 }, { restSeconds: 120 }], 90)).toBe(120);
  });
  it("falls back to user default, then 90s", () => {
    expect(resolveRestSeconds([{}], 150)).toBe(150);
    expect(resolveRestSeconds([{}], undefined)).toBe(90);
    expect(resolveRestSeconds([{ restSeconds: 0 }], 0)).toBe(90);
  });
});

describe("computeSessionStats", () => {
  it("excludes warm-ups from volume and working sets", () => {
    expect(
      computeSessionStats([
        { weight: 40, repsActual: 10, setType: "warmup" },
        { weight: 100, repsActual: 5 },
        { weight: 80, repsActual: 8, setType: "drop" },
      ])
    ).toEqual({ totalSets: 3, workingSets: 2, volume: 1140 });
  });
});

describe("formatDuration", () => {
  it("formats m:ss and h:mm:ss", () => {
    expect(formatDuration(65_000)).toBe("1:05");
    expect(formatDuration(3_723_000)).toBe("1:02:03");
    expect(formatDuration(-5)).toBe("0:00");
  });
});

describe("plate calculator", () => {
  it("loads kg plates per side", () => {
    expect(calculatePlates(100, 20, PLATES.kg)).toEqual({
      perSide: [25, 15],
      loaded: 100,
      remainder: 0,
    });
    expect(calculatePlates(62.5, 20, PLATES.kg).perSide).toEqual([20, 1.25]);
  });

  it("loads lb plates per side", () => {
    expect(calculatePlates(225, 45, PLATES.lb).perSide).toEqual([45, 45]);
    expect(calculatePlates(135, 45, PLATES.lb).perSide).toEqual([45]);
  });

  it("reports the remainder when not achievable", () => {
    const r = calculatePlates(101, 20, PLATES.kg);
    expect(r.loaded).toBe(100);
    expect(r.remainder).toBe(1);
  });

  it("bar only / lighter than bar", () => {
    expect(calculatePlates(20, 20, PLATES.kg).perSide).toEqual([]);
    expect(calculatePlates(10, 20, PLATES.kg).perSide).toEqual([]);
  });

  it("detects barbell equipment", () => {
    expect(isBarbellExercise("Barbell")).toBe(true);
    expect(isBarbellExercise("EZ barbell")).toBe(true);
    expect(isBarbellExercise("Dumbbell")).toBe(false);
    expect(isBarbellExercise(undefined)).toBe(false);
  });
});

describe("resolveSetValues", () => {
  const logged = {
    weight: 100,
    repsActual: 5,
    rpe: 8,
    setType: "failure",
  } as LoggedSet;

  it("falls back to suggestions when inputs are empty", () => {
    const v = resolveSetValues({ draft: undefined, logged: undefined, suggestedWeight: 60, suggestedReps: 8 });
    expect(v).toMatchObject({ weightText: "", weight: 60, reps: 8, setType: "normal" });
  });

  it("typed values win over logged ones; rpe can be cleared", () => {
    const v = resolveSetValues({
      draft: { weight: "102,5", rpe: null },
      logged,
      suggestedWeight: 60,
      suggestedReps: 8,
    });
    expect(v).toMatchObject({ weight: 102.5, reps: 5, rpe: undefined, setType: "failure" });
  });

  it("invalid typed input blocks saving", () => {
    const v = resolveSetValues({ draft: { reps: "x" }, logged: undefined, suggestedWeight: 60, suggestedReps: 8 });
    expect(v.reps).toBeNull();
  });
});
