import { describe, expect, it } from "vitest";
import {
  RECOMP_ROUTINES,
  classifyDay,
  routineForDay,
} from "@/app/lib/workout-routines";

describe("classifyDay", () => {
  it.each([
    ["Push", "push"],
    ["Pull", "pull"],
    ["Legs", "legs"],
    ["Legs A", "legs"],
    ["Upper", "upper"],
    ["Lower", "lower"],
    ["Upper Power", "upper"],
    ["Lower Hypertrophy", "lower"],
    ["Chest & Back A", "upper"],
    ["Shoulders & Arms B", "shoulders"],
    ["Full Body C", "fullBody"],
    ["Upper Body Push & Pull", "upper"],
    ["Upper Body & Core", "upper"],
    ["Quads & Glutes", "legs"],
    ["Glutes & Hamstrings", "glutes"],
    ["Glutes & Posterior Chain", "glutes"],
    ["Glutes & Legs (Strength)", "glutes"],
    ["Something custom", "fullBody"],
  ])("%s -> %s", (name, focus) => {
    expect(classifyDay(name)).toBe(focus);
  });

  it("handles a missing name", () => {
    expect(classifyDay(undefined)).toBe("fullBody");
  });
});

describe("routineForDay", () => {
  it("ends the warm-up with ramp-up sets of the day's first exercise", () => {
    const r = routineForDay("Push", "Incline Dumbbell Press");
    expect(r.warmup.at(-1)).toBe("Ramp-up Incline Dumbbell Press: light × 10, 60% × 6, 80% × 3");
    expect(r.warmup.length).toBeGreaterThanOrEqual(4);
    expect(r.cooldown.length).toBeGreaterThanOrEqual(4);
  });

  it("uses bar-first ramp-ups for heavy barbell lifts", () => {
    expect(routineForDay("Legs", "Squat").warmup.at(-1)).toBe(
      "Ramp-up Squat: bar × 10, 50% × 5, 70% × 3, 85% × 1–2"
    );
    expect(routineForDay("Full Body B", "Deadlift").warmup.at(-1)).toMatch(/^Ramp-up Deadlift: bar/);
  });

  it("omits the ramp-up line when the day has no exercises", () => {
    const r = routineForDay("Legs", undefined);
    expect(r.warmup.some((s) => s.startsWith("Ramp-up"))).toBe(false);
  });

  it("gives leg days lower-body mobility and upper days shoulder work", () => {
    expect(routineForDay("Legs", "Squat").warmup.join(" ")).toMatch(/Leg swings/);
    expect(routineForDay("Push", "Bench Press").warmup.join(" ")).toMatch(/Band pull-aparts/);
  });

  it("returns fresh arrays so callers can't mutate the shared library", () => {
    const a = routineForDay("Push", "Bench Press");
    a.warmup.push("x");
    expect(routineForDay("Push", "Bench Press").warmup).not.toContain("x");
  });
});

describe("RECOMP_ROUTINES", () => {
  it("covers the five recomp training days (Sun, Mon, Tue, Thu, Fri)", () => {
    expect(Object.keys(RECOMP_ROUTINES).map(Number).sort()).toEqual([0, 1, 2, 4, 5]);
  });

  it("matches plan.html for Push Sunday", () => {
    expect(RECOMP_ROUTINES[0].warmup[0]).toBe("5 min easy bike or incline walk");
    expect(RECOMP_ROUTINES[0].warmup.at(-1)).toBe(
      "Ramp-up incline DB press: light × 10, 60% × 6, 80% × 3"
    );
    expect(RECOMP_ROUTINES[0].cooldown.at(-1)).toBe("Slow nasal breathing · 1 min");
  });
});
