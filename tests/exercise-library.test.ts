import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import path from "path";
import { SEED_EXERCISES } from "@/convex/lib/exerciseCatalog";
import { EXERCISE_DETAILS, getExerciseDetails } from "@/convex/lib/exerciseDetails";

const names = new Set(SEED_EXERCISES.map((e) => e.name));

describe("exercise library content", () => {
  it("has unique seed exercise names", () => {
    expect(names.size).toBe(SEED_EXERCISES.length);
  });

  it("has details for every seeded exercise and no orphan entries", () => {
    for (const e of SEED_EXERCISES) {
      expect(getExerciseDetails(e.name), e.name).not.toBeNull();
    }
    for (const name of Object.keys(EXERCISE_DETAILS)) {
      expect(names.has(name), name).toBe(true);
    }
  });

  it("has instructions and primary muscles for each exercise", () => {
    for (const [name, d] of Object.entries(EXERCISE_DETAILS)) {
      expect(d.instructions.length, name).toBeGreaterThanOrEqual(3);
      expect(d.primaryMuscles.length, name).toBeGreaterThan(0);
    }
  });

  it("only lists alternatives that exist in the catalog (and never itself)", () => {
    for (const [name, d] of Object.entries(EXERCISE_DETAILS)) {
      expect(d.alternatives.length, name).toBeGreaterThan(0);
      for (const alt of d.alternatives) {
        expect(names.has(alt), `${name} -> ${alt}`).toBe(true);
        expect(alt).not.toBe(name);
      }
    }
  });

  it("only references GIFs that ship in /public", () => {
    for (const [name, d] of Object.entries(EXERCISE_DETAILS)) {
      if (!d.gifUrl) continue;
      expect(existsSync(path.join(__dirname, "..", "public", d.gifUrl)), name).toBe(true);
    }
  });

  it("returns null for unknown names", () => {
    expect(getExerciseDetails("Underwater Basket Squat")).toBeNull();
  });
});
