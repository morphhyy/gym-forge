/**
 * Warm-up and cool-down routines for plan days.
 *
 * Templates store a routine on each plan day (planDays.warmup / cooldown).
 * Days without one (older plans, AI or hand-built plans) get a routine from
 * `routineForDay`, picked from the day's name and first exercise. The logger
 * shows whichever applies next to the warm-up / cool-down ticks.
 */

export type DayRoutine = { warmup: string[]; cooldown: string[] };

export type DayFocus =
  | "push"
  | "pull"
  | "legs"
  | "upper"
  | "lower"
  | "shoulders"
  | "glutes"
  | "fullBody";

// Mobility and cool-down blocks per focus. The warm-up's final ramp-up line is
// added by routineForDay from the day's first exercise.
const LIBRARY: Record<DayFocus, DayRoutine> = {
  push: {
    warmup: [
      "5 min easy bike or incline walk",
      "Arm circles · 10 each way",
      "Band pull-aparts · 2 × 15",
      "Band shoulder pass-throughs · 10",
      "Scap push-ups · 10",
    ],
    cooldown: [
      "3 min easy walk",
      "Doorway chest stretch · 2 × 30 s / side",
      "Overhead triceps stretch · 30 s / side",
      "Cross-body shoulder stretch · 30 s / side",
      "Slow nasal breathing · 1 min",
    ],
  },
  pull: {
    warmup: [
      "5 min easy rower or bike",
      "Cat-cow · 8 reps",
      "Open-book thoracic rotation · 8 / side",
      "Dead hang · 2 × 20–30 s",
      "Scap pull-ups · 8",
    ],
    cooldown: [
      "3 min easy walk",
      "Kneeling lat stretch on bench · 2 × 30 s",
      "Child's pose, arms long · 45 s",
      "Biceps wall stretch · 30 s / side",
      "Neck side stretch · 20 s / side",
    ],
  },
  legs: {
    warmup: [
      "5 min easy bike",
      "Leg swings, front + side · 10 / leg each",
      "Bodyweight squats · 10",
      "Glute bridges · 12",
      "Walking lunges · 6 / leg",
    ],
    cooldown: [
      "3–5 min easy walk",
      "Kneeling hip-flexor stretch · 45 s / side",
      "Pigeon or figure-4 glute stretch · 45 s / side",
      "Seated hamstring stretch · 45 s",
      "Calf wall stretch · 30 s / side",
    ],
  },
  upper: {
    warmup: [
      "5 min easy bike or incline walk",
      "Arm circles · 10 each way",
      "Band pull-aparts · 2 × 15",
      "Scap pull-ups · 8",
      "Push-ups · 10",
    ],
    cooldown: [
      "3 min easy walk",
      "Doorway chest stretch · 30 s / side",
      "Kneeling lat stretch · 30 s",
      "Cross-body shoulder stretch · 30 s / side",
      "Foam-roller thoracic extension · 1 min",
    ],
  },
  lower: {
    warmup: [
      "5 min easy bike",
      "90/90 hip switches · 6 / side",
      "Leg swings · 10 / leg",
      "Goblet squat with 3 s pause · 8",
      "Glute bridges · 12",
    ],
    cooldown: [
      "3–5 min easy walk",
      "Kneeling hip-flexor stretch · 45 s / side",
      "90/90 hip stretch · 45 s / side",
      "Standing hamstring stretch · 45 s",
      "Deep squat hold · 30–45 s",
    ],
  },
  shoulders: {
    warmup: [
      "5 min easy bike or rower",
      "Arm circles · 10 each way",
      "Band pull-aparts · 2 × 15",
      "Band external rotations · 12 / side",
      "Wrist circles · 10 each way",
    ],
    cooldown: [
      "3 min easy walk",
      "Cross-body shoulder stretch · 30 s / side",
      "Overhead triceps stretch · 30 s / side",
      "Biceps wall stretch · 30 s / side",
      "Wrist flexor stretch · 30 s / side",
    ],
  },
  glutes: {
    warmup: [
      "5 min easy bike or incline walk",
      "Glute bridges · 15",
      "Banded lateral walks · 10 / side",
      "Hip hinge with dowel · 10",
      "Leg swings · 10 / leg",
    ],
    cooldown: [
      "3 min easy walk",
      "Pigeon or figure-4 glute stretch · 45 s / side",
      "Seated hamstring stretch · 45 s",
      "Kneeling hip-flexor stretch · 45 s / side",
      "Child's pose · 45 s",
    ],
  },
  fullBody: {
    warmup: [
      "5 min easy rower or bike",
      "Arm circles · 10 each way",
      "Leg swings · 10 / leg",
      "Bodyweight squats · 10",
      "Band pull-aparts · 15",
    ],
    cooldown: [
      "3 min easy walk",
      "Kneeling hip-flexor stretch · 30 s / side",
      "Doorway chest stretch · 30 s / side",
      "Kneeling lat stretch · 30 s",
      "Seated hamstring stretch · 45 s",
    ],
  },
};

/** Picks a focus from a plan day's name, e.g. "Chest & Back A" -> upper. */
export function classifyDay(name: string | undefined): DayFocus {
  const n = (name ?? "").toLowerCase();
  if (n.includes("full body")) return "fullBody";
  if (n.includes("quad")) return "legs";
  if (/glute|hamstring|posterior/.test(n)) return "glutes";
  if (n.includes("shoulder") || /\barms?\b/.test(n)) return "shoulders";
  if (n.includes("upper") || (n.includes("push") && n.includes("pull"))) return "upper";
  if (n.includes("chest") && n.includes("back")) return "upper";
  if (n.includes("push")) return "push";
  if (n.includes("pull")) return "pull";
  if (n.includes("lower")) return "lower";
  if (n.includes("leg")) return "legs";
  return "fullBody";
}

// Heavy barbell lifts get a bar-first ramp-up, like the recomp plan.
const BARBELL_LIFT =
  /^(squat|front squat|deadlift|bench press|overhead press|barbell|incline bench press|close-grip bench press|romanian deadlift)/i;

function rampUp(firstExercise: string): string {
  return BARBELL_LIFT.test(firstExercise)
    ? `Ramp-up ${firstExercise}: bar × 10, 50% × 5, 70% × 3, 85% × 1–2`
    : `Ramp-up ${firstExercise}: light × 10, 60% × 6, 80% × 3`;
}

/** A warm-up and cool-down that fit a day, ending with ramp-up sets. */
export function routineForDay(
  dayName: string | undefined,
  firstExercise: string | undefined
): DayRoutine {
  const base = LIBRARY[classifyDay(dayName)];
  return {
    warmup: firstExercise ? [...base.warmup, rampUp(firstExercise)] : [...base.warmup],
    cooldown: [...base.cooldown],
  };
}

/**
 * The recomp plan's routines, verbatim from the plan's "Warm-up & cool-down"
 * page, keyed by JS weekday (0 = Sunday).
 */
export const RECOMP_ROUTINES: Record<number, DayRoutine> = {
  0: {
    warmup: [
      "5 min easy bike or incline walk",
      "Arm circles · 10 each way",
      "Band pull-aparts · 2 × 15",
      "Band shoulder pass-throughs · 10",
      "Scap push-ups · 10",
      "Ramp-up incline DB press: light × 10, 60% × 6, 80% × 3",
    ],
    cooldown: [
      "3 min easy walk",
      "Doorway chest stretch · 2 × 30 s / side",
      "Overhead triceps stretch · 30 s / side",
      "Cross-body shoulder stretch · 30 s / side",
      "Slow nasal breathing · 1 min",
    ],
  },
  1: {
    warmup: [
      "5 min easy rower or bike",
      "Cat-cow · 8 reps",
      "Open-book thoracic rotation · 8 / side",
      "Dead hang · 2 × 20–30 s",
      "Scap pull-ups · 8",
      "Ramp-up lat pulldown: light × 10, 60% × 6, 80% × 3",
    ],
    cooldown: [
      "3 min easy walk",
      "Kneeling lat stretch on bench · 2 × 30 s",
      "Child's pose, arms long · 45 s",
      "Biceps wall stretch · 30 s / side",
      "Neck side stretch · 20 s / side",
    ],
  },
  2: {
    warmup: [
      "5 min easy bike",
      "Leg swings, front + side · 10 / leg each",
      "Bodyweight squats · 10",
      "Glute bridges · 12",
      "Walking lunges · 6 / leg",
      "Ramp-up hack squat: light × 10, 60% × 6, 80% × 3",
    ],
    cooldown: [
      "3–5 min easy walk",
      "Kneeling hip-flexor stretch · 45 s / side",
      "Pigeon or figure-4 glute stretch · 45 s / side",
      "Seated hamstring stretch · 45 s",
      "Calf wall stretch · 30 s / side",
    ],
  },
  4: {
    warmup: [
      "5 min easy bike or incline walk",
      "Arm circles · 10 each way",
      "Band pull-aparts · 2 × 15",
      "Scap pull-ups · 8",
      "Push-ups · 10",
      "Ramp-up bench: bar × 10, 50% × 5, 70% × 3, 85% × 1",
    ],
    cooldown: [
      "3 min easy walk",
      "Doorway chest stretch · 30 s / side",
      "Kneeling lat stretch · 30 s",
      "Cross-body shoulder stretch · 30 s / side",
      "Foam-roller thoracic extension · 1 min",
    ],
  },
  5: {
    warmup: [
      "5 min easy bike",
      "90/90 hip switches · 6 / side",
      "Leg swings · 10 / leg",
      "Goblet squat with 3 s pause · 8",
      "Glute bridges · 12",
      "Ramp-up squat: bar × 10, 50% × 5, 70% × 3, 85% × 1–2",
    ],
    cooldown: [
      "3–5 min easy walk",
      "Kneeling hip-flexor stretch · 45 s / side",
      "90/90 hip stretch · 45 s / side",
      "Standing hamstring stretch · 45 s",
      "Deep squat hold · 30–45 s",
    ],
  },
};
