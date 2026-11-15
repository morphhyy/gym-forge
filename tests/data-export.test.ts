import { describe, it, expect } from "vitest";
import {
  bodyWeightsToCsv,
  escapeCsvCell,
  foodEntriesToCsv,
  workoutsToCsv,
} from "@/app/lib/export/csv";
import { parseCsvRows } from "@/app/lib/import/csv";
import { getPreviousWeekRange, isValidDateString } from "@/convex/lib/recapDates";

describe("CSV export", () => {
  it("escapes delimiters, quotes and formula triggers", () => {
    expect(escapeCsvCell('a,"b"')).toBe('"a,""b"""');
    expect(escapeCsvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(escapeCsvCell(-5)).toBe("-5");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("writes one row per set with 1-based set numbers, sorted by date", () => {
    const csv = workoutsToCsv(
      [
        {
          date: "2024-08-03",
          sets: [{ exerciseName: "Squat", setIndex: 0, weight: 100, repsActual: 5 }],
        },
        {
          date: "2024-08-01",
          notes: "Felt good, PR day",
          sets: [
            { exerciseName: "Bench Press", setIndex: 0, weight: 80, repsActual: 8, rpe: 8 },
            { exerciseName: "Bench Press", setIndex: 1, weight: 82.5, repsActual: 6 },
          ],
        },
      ],
      "kg"
    );
    const rows = parseCsvRows(csv);
    expect(rows[0]).toEqual(["date", "exercise", "set #", "weight", "unit", "reps", "rpe", "notes"]);
    expect(rows.slice(1)).toEqual([
      ["2024-08-01", "Bench Press", "1", "80", "kg", "8", "8", "Felt good, PR day"],
      ["2024-08-01", "Bench Press", "2", "82.5", "kg", "6", "", "Felt good, PR day"],
      ["2024-08-03", "Squat", "1", "100", "kg", "5", "", ""],
    ]);
  });

  it("exports body weight and nutrition entries", () => {
    const bw = parseCsvRows(bodyWeightsToCsv([{ date: "2024-01-01", weight: 80.2 }], "kg"));
    expect(bw[1]).toEqual(["2024-01-01", "80.2", "kg", ""]);
    const food = parseCsvRows(
      foodEntriesToCsv([
        {
          date: "2024-01-01",
          mealType: "lunch",
          foodName: "Chicken, rice",
          calories: 600,
          protein: 45,
          carbs: 70,
          fat: 12,
          aiAnalyzed: false,
        },
      ])
    );
    expect(food[1].slice(0, 8)).toEqual(["2024-01-01", "lunch", "Chicken, rice", "", "600", "45", "70", "12"]);
  });
});

describe("recap week range", () => {
  it("returns the previous Sunday-Saturday week for any day", () => {
    // 2026-11-15 is a Sunday
    expect(getPreviousWeekRange("2026-11-15")).toEqual({ start: "2026-11-08", end: "2026-11-14" });
    // Saturday 2026-11-21 -> same previous week
    expect(getPreviousWeekRange("2026-11-21")).toEqual({ start: "2026-11-08", end: "2026-11-14" });
    // Across a year boundary
    expect(getPreviousWeekRange("2026-01-02")).toEqual({ start: "2025-12-21", end: "2025-12-27" });
  });

  it("validates date strings", () => {
    expect(isValidDateString("2026-02-29")).toBe(false);
    expect(isValidDateString("2028-02-29")).toBe(true);
    expect(isValidDateString("2026-1-5")).toBe(false);
  });
});
