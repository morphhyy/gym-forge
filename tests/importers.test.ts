import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { parseCsvRows, detectDelimiter, parseNumber } from "@/app/lib/import/csv";
import { parseWorkoutCsv, UnsupportedCsvError } from "@/app/lib/import/parsers";
import { convertWeight, parseDateOnly } from "@/app/lib/import/types";
import {
  buildImportPlan,
  ExerciseMatcher,
  normalizeExerciseName,
} from "@/app/lib/import/match";

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, "fixtures", name), "utf8");

// Subset of the global catalog seeded by convex/exercises.ts
const CATALOG = [
  "Bench Press",
  "Dumbbell Bench Press",
  "Incline Dumbbell Press",
  "Dumbbell Shoulder Press",
  "Tricep Pushdown",
  "Squat",
  "Deadlift",
  "Romanian Deadlift",
  "Leg Curl",
  "Lat Pulldown",
  "Seated Cable Row",
  "Face Pull",
  "Dumbbell Curl",
  "Barbell Curl",
  "Pull-Up",
  "Push-Up",
].map((name, i) => ({ id: `ex${i}`, name }));
const idOf = (name: string) => CATALOG.find((c) => c.name === name)!.id;

describe("csv parsing", () => {
  it("handles quotes, escaped quotes, embedded newlines and CRLF", () => {
    const rows = parseCsvRows('a,b\r\n"x, y","he said ""hi""\nthere"\r\n');
    expect(rows).toEqual([
      ["a", "b"],
      ["x, y", 'he said "hi"\nthere'],
    ]);
  });

  it("strips a BOM and detects semicolon delimiters", () => {
    expect(detectDelimiter("﻿Date;Workout Name;Reps")).toBe(";");
    expect(detectDelimiter('"a;b",c,d')).toBe(",");
    expect(parseCsvRows("﻿a;b\n1;2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("parses decimal commas", () => {
    expect(parseNumber("8,5")).toBe(8.5);
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("abc")).toBeNull();
  });
});

describe("date parsing", () => {
  it("handles Strong and Hevy date formats without timezone shifts", () => {
    expect(parseDateOnly("2024-08-01 18:23:30")).toBe("2024-08-01");
    expect(parseDateOnly("2024/8/1 23:59")).toBe("2024-08-01");
    expect(parseDateOnly("05 Sep 2024, 18:02")).toBe("2024-09-05");
    expect(parseDateOnly("5 September 2024, 23:30")).toBe("2024-09-05");
    expect(parseDateOnly("Sep 5, 2024 11:30 PM")).toBe("2024-09-05");
    expect(parseDateOnly("2024-02-30 10:00")).toBeNull();
    expect(parseDateOnly("garbage")).toBeNull();
  });
});

describe("Strong parser", () => {
  it("parses the comma-delimited export", () => {
    const res = parseWorkoutCsv(fixture("strong-export.csv"));
    expect(res.source).toBe("strong");
    // Two workouts on 2024-08-03 stay separate at parse time
    expect(res.workouts.map((w) => [w.date, w.title])).toEqual([
      ["2024-08-01", "Push Day"],
      ["2024-08-03", "Leg Day"],
      ["2024-08-03", "Arms"],
    ]);
    // Plank (timed), Rest Timer row and treadmill run are skipped
    expect(res.skippedRows).toBe(3);
    const push = res.workouts[0];
    expect(push.notes).toBe("Felt strong, good pump");
    expect(push.sets).toHaveLength(5);
    expect(push.sets[0]).toMatchObject({ isWarmup: true, weight: 40, reps: 10 });
    expect(push.sets[2]).toMatchObject({ weight: 82.5, reps: 6, rpe: 9.5 });
    // This Strong version doesn't include a unit column
    expect(res.hasUnknownUnits).toBe(true);
  });

  it("parses the semicolon-delimited export with a Weight Unit column", () => {
    const res = parseWorkoutCsv(fixture("strong-export-semicolon.csv"));
    expect(res.source).toBe("strong");
    expect(res.hasUnknownUnits).toBe(false);
    expect(res.workouts).toHaveLength(1);
    const w = res.workouts[0];
    expect(w.notes).toBe("Gym; crowded");
    expect(w.sets.map((s) => [s.exerciseName, s.weight, s.unit, s.reps, s.rpe])).toEqual([
      ["Deadlift (Barbell)", 225, "lb", 5, undefined],
      ["Deadlift (Barbell)", 225, "lb", 5, 8.5],
      ["Pull Up", 0, "lb", 10, undefined],
    ]);
  });
});

describe("Hevy parser", () => {
  it("parses the kg export", () => {
    const res = parseWorkoutCsv(fixture("hevy-export.csv"));
    expect(res.source).toBe("hevy");
    expect(res.workouts.map((w) => w.date)).toEqual(["2024-09-05", "2024-09-07"]);
    expect(res.skippedRows).toBe(1); // Dead Hang (duration only)
    expect(res.hasUnknownUnits).toBe(false);
    const pull = res.workouts[0];
    expect(pull.title).toBe("Pull");
    expect(pull.notes).toBe("Back focus");
    expect(pull.sets[0]).toMatchObject({ isWarmup: true, unit: "kg", weight: 30 });
    expect(pull.sets[1]).toMatchObject({ isWarmup: false, rpe: 8, weight: 60, reps: 10 });
  });

  it("reads weight_lbs exports as pounds", () => {
    const res = parseWorkoutCsv(fixture("hevy-export-lbs.csv"));
    expect(res.workouts[0].date).toBe("2025-01-12");
    expect(res.workouts[0].sets[0]).toMatchObject({ unit: "lb", weight: 185, reps: 5 });
  });

  it("rejects unknown CSV formats", () => {
    expect(() => parseWorkoutCsv("foo,bar\n1,2")).toThrow(UnsupportedCsvError);
  });
});

describe("exercise matching", () => {
  const matcher = new ExerciseMatcher(CATALOG);

  it("normalizes case, whitespace, punctuation and plurals", () => {
    expect(normalizeExerciseName("  Pull-Ups ")).toBe("pull up");
    expect(normalizeExerciseName("Triceps   Pushdown")).toBe("tricep pushdown");
    expect(matcher.match("bench   PRESS")?.name).toBe("Bench Press");
    expect(matcher.match("Pull Up")?.name).toBe("Pull-Up");
  });

  it("maps Strong/Hevy names with equipment suffixes", () => {
    const cases: [string, string][] = [
      ["Bench Press (Barbell)", "Bench Press"],
      ["Bench Press (Dumbbell)", "Dumbbell Bench Press"],
      ["Incline Bench Press (Dumbbell)", "Incline Dumbbell Press"],
      ["Shoulder Press (Dumbbell)", "Dumbbell Shoulder Press"],
      ["Triceps Pushdown (Cable - Straight Bar)", "Tricep Pushdown"],
      ["Lat Pulldown (Cable)", "Lat Pulldown"],
      ["Seated Cable Row - V Grip (Cable)", "Seated Cable Row"],
      ["Lying Leg Curl (Machine)", "Leg Curl"],
      ["Bicep Curl (Dumbbell)", "Dumbbell Curl"],
      ["Bicep Curl (Barbell)", "Barbell Curl"],
      ["Deadlift (Barbell)", "Deadlift"],
    ];
    for (const [src, expected] of cases) {
      expect(matcher.match(src)?.name, src).toBe(expected);
    }
  });

  it("returns null for unknown exercises", () => {
    expect(matcher.match("Zercher Squat")).toBeNull();
    expect(matcher.match("Dead Hang")).toBeNull();
  });
});

describe("buildImportPlan", () => {
  const matcher = new ExerciseMatcher(CATALOG);

  it("merges same-day workouts, numbers sets per exercise and reports unmatched", () => {
    const parsed = parseWorkoutCsv(fixture("strong-export.csv"));
    const plan = buildImportPlan(parsed.workouts, matcher, {
      targetUnit: "kg",
      fallbackUnit: "kg",
      includeWarmups: true,
      sourceLabel: "Strong",
    });
    expect(plan.sessions.map((s) => s.date)).toEqual(["2024-08-01", "2024-08-03"]);
    expect(plan.unmatched).toEqual(["Zercher Squat"]);
    expect(plan.totalSets).toBe(9);

    const push = plan.sessions[0];
    expect(push.notes).toContain("Imported from Strong: Push Day");
    const bench = push.sets.filter((s) => s.exerciseKey === `id:${idOf("Bench Press")}`);
    expect(bench.map((s) => s.setIndex)).toEqual([0, 1, 2]);

    const legs = plan.sessions[1];
    expect(legs.notes).toContain("Leg Day + Arms");
    expect(legs.sets.some((s) => s.exerciseKey === "new:Zercher Squat")).toBe(true);
  });

  it("drops warm-ups when asked and converts units", () => {
    const parsed = parseWorkoutCsv(fixture("strong-export-semicolon.csv"));
    const plan = buildImportPlan(parsed.workouts, matcher, {
      targetUnit: "kg",
      fallbackUnit: "kg",
      includeWarmups: false,
      sourceLabel: "Strong",
    });
    expect(plan.sessions[0].sets[0].weight).toBeCloseTo(102.06, 2);
    expect(plan.sessions[0].sets[0].exerciseKey).toBe(`id:${idOf("Deadlift")}`);

    const hevy = parseWorkoutCsv(fixture("hevy-export.csv"));
    const hevyPlan = buildImportPlan(hevy.workouts, matcher, {
      targetUnit: "lb",
      fallbackUnit: "kg",
      includeWarmups: false,
      sourceLabel: "Hevy",
    });
    const pulldown = hevyPlan.sessions[0].sets.filter(
      (s) => s.exerciseKey === `id:${idOf("Lat Pulldown")}`
    );
    expect(pulldown).toHaveLength(1); // warm-up removed
    expect(pulldown[0]).toMatchObject({ setIndex: 0, weight: 132.28, rpe: 8 });
    expect(hevyPlan.unmatched).toEqual([]);
  });

  it("converts weights both ways", () => {
    expect(convertWeight(100, "kg", "lb")).toBe(220.46);
    expect(convertWeight(225, "lb", "kg")).toBe(102.06);
    expect(convertWeight(50, "kg", "kg")).toBe(50);
  });
});
