/**
 * Content for the free public 5-day recomp plan (/plans/recomp).
 * Mirrors the downloadable PDF. Numbers are examples for an ~80 kg lifter.
 */

import { RECOMP_ROUTINES, type DayRoutine } from "@/app/lib/workout-routines";

export const PLAN_PDF_URL = "/plans/recomp/gymforge-5-day-recomp-plan.pdf";
/** `?template=` id that opens this plan prefilled in the plan editor. */
export const RECOMP_TEMPLATE_ID = "recomp-5-day";
export const USE_PLAN_URL = `/plan?template=${RECOMP_TEMPLATE_ID}`;
export const PLAN_PDF_FILENAME = "gymforge-5-day-recomp-plan.pdf";

export type ExerciseGif =
  | "incline_db_press"
  | "machine_chest_press"
  | "cable_fly_low_high"
  | "lateral_raise"
  | "rope_pushdown"
  | "overhead_db_ext"
  | "lat_pulldown"
  | "chest_supported_row"
  | "single_arm_cable_row"
  | "reverse_pec_deck"
  | "incline_db_curl"
  | "hammer_curl"
  | "hack_squat"
  | "hip_thrust"
  | "bulgarian_split_squat"
  | "lying_leg_curl"
  | "leg_extension"
  | "seated_calf_raise"
  | "bench_press"
  | "pull_up"
  | "seated_cable_row"
  | "seated_db_press"
  | "ez_bar_curl"
  | "cable_lateral_raise"
  | "back_squat"
  | "romanian_deadlift"
  | "leg_press"
  | "seated_leg_curl"
  | "standing_calf_raise"
  | "hanging_leg_raise";

export function exerciseGifSrc(gif: ExerciseGif): string {
  return `/plans/recomp/exercises/${gif}.gif`;
}

export interface Exercise {
  name: string;
  /** Optional substitute shown in muted text, e.g. "or weighted dips". */
  alt?: string;
  sets: string;
  rest: string;
  cue: string;
  gif: ExerciseGif;
  /** How this exercise is logged when the plan is added to GymForge. */
  log: LoggedExercise[];
}

/** One catalog exercise as it is added to a GymForge plan. `reps` is the top of the range (double progression). */
export interface LoggedExercise {
  exercise: string;
  sets: number;
  reps: number;
  muscleGroup: string;
  equipment: string;
  supersetGroup?: string;
}

export type DayKind = "pump" | "heavy" | "rest";

export interface Workout {
  id: string;
  title: string;
  weekday: string;
  /** 0 = Sunday, matching plan weekdays in the app. */
  weekdayIndex: number;
  kind: Exclude<DayKind, "rest">;
  summary: string;
  exercises: Exercise[];
}

export interface SplitDay {
  short: string;
  label: string;
  focus: string;
  kind: DayKind;
}

export const split: SplitDay[] = [
  { short: "Sun", label: "Push", focus: "Chest · delts · triceps", kind: "pump" },
  { short: "Mon", label: "Pull", focus: "Back · rear delts · biceps", kind: "pump" },
  { short: "Tue", label: "Legs", focus: "Quads · glutes · hamstrings", kind: "pump" },
  { short: "Wed", label: "Rest", focus: "30–40 min zone-2 walk or bike", kind: "rest" },
  { short: "Thu", label: "Upper", focus: "Heavy, 5–8 reps", kind: "heavy" },
  { short: "Fri", label: "Lower", focus: "Heavy, 5–8 reps", kind: "heavy" },
  { short: "Sat", label: "Rest", focus: "45–60 min walk or hike", kind: "rest" },
];

export const whyThisSplit: string[] = [
  "Every muscle is trained twice a week, which beats once a week for growth.",
  "12–18 hard sets per muscle per week, where most of the gains happen.",
  "Pump days (Sun–Tue) build size. Heavy days (Thu/Fri) build strength.",
  "Each session fits in about 60 minutes.",
];

export const workouts: Workout[] = [
  {
    id: "push",
    title: "Push",
    weekday: "Sunday",
    weekdayIndex: 0,
    kind: "pump",
    summary: "Hypertrophy. Controlled reps; take isolation sets close to failure.",
    exercises: [
      { name: "Incline dumbbell press (30°)", sets: "4 × 8–12", rest: "2 min", cue: "Upper-chest focus, deep stretch at the bottom", gif: "incline_db_press",
        log: [{ exercise: "Incline Dumbbell Press", sets: 4, reps: 12, muscleGroup: "Chest", equipment: "Dumbbell" }] },
      { name: "Machine chest press", alt: "or weighted dips", sets: "3 × 10–12", rest: "90 s", cue: "Handles at mid-chest, don't slam the lockout", gif: "machine_chest_press",
        log: [{ exercise: "Machine Chest Press", sets: 3, reps: 12, muscleGroup: "Chest", equipment: "Machine" }] },
      { name: "Low-to-high cable fly", sets: "3 × 12–15", rest: "60 s", cue: "Sweep hands up to chin height and squeeze", gif: "cable_fly_low_high",
        log: [{ exercise: "Low-to-High Cable Fly", sets: 3, reps: 15, muscleGroup: "Chest", equipment: "Cable" }] },
      { name: "Dumbbell or cable lateral raise", sets: "4 × 12–20", rest: "60 s", cue: "Lead with the elbows, no swinging", gif: "lateral_raise",
        log: [{ exercise: "Lateral Raise", sets: 4, reps: 20, muscleGroup: "Shoulders", equipment: "Dumbbell" }] },
      { name: "Triceps rope pushdown", sets: "3 × 10–15", rest: "60 s", cue: "Elbows pinned, spread the rope at the bottom", gif: "rope_pushdown",
        log: [{ exercise: "Tricep Pushdown", sets: 3, reps: 15, muscleGroup: "Arms", equipment: "Cable" }] },
      { name: "Overhead dumbbell triceps extension", sets: "2 × 10–15", rest: "60 s", cue: "Lower behind the head for a full stretch", gif: "overhead_db_ext",
        log: [{ exercise: "Overhead Dumbbell Tricep Extension", sets: 2, reps: 15, muscleGroup: "Arms", equipment: "Dumbbell" }] },
    ],
  },
  {
    id: "pull",
    title: "Pull",
    weekday: "Monday",
    weekdayIndex: 1,
    kind: "pump",
    summary: "Back width and thickness, rear delts and arms.",
    exercises: [
      { name: "Neutral-grip lat pulldown", sets: "4 × 8–12", rest: "2 min", cue: "Drive elbows down to your back pockets", gif: "lat_pulldown",
        log: [{ exercise: "Lat Pulldown", sets: 4, reps: 12, muscleGroup: "Back", equipment: "Cable" }] },
      { name: "Chest-supported row", sets: "3 × 8–12", rest: "2 min", cue: "Chest stays on the pad, no jerking", gif: "chest_supported_row",
        log: [{ exercise: "Chest-Supported Row", sets: 3, reps: 12, muscleGroup: "Back", equipment: "Dumbbell" }] },
      { name: "Single-arm cable row", sets: "3 × 10–15", rest: "90 s", cue: "Elbow past the torso, stretch forward each rep", gif: "single_arm_cable_row",
        log: [{ exercise: "Single-Arm Cable Row", sets: 3, reps: 15, muscleGroup: "Back", equipment: "Cable" }] },
      { name: "Reverse pec deck", sets: "3 × 15–20", rest: "60 s", cue: "Arms wide, squeeze the rear shoulders", gif: "reverse_pec_deck",
        log: [{ exercise: "Reverse Pec Deck", sets: 3, reps: 20, muscleGroup: "Shoulders", equipment: "Machine" }] },
      { name: "Incline dumbbell curl", sets: "3 × 10–12", rest: "60 s", cue: "Arms hang behind the body for a full stretch", gif: "incline_db_curl",
        log: [{ exercise: "Incline Dumbbell Curl", sets: 3, reps: 12, muscleGroup: "Arms", equipment: "Dumbbell" }] },
      { name: "Hammer curl + face pull", sets: "2 × 10–15", rest: "60 s", cue: "Neutral grip. Add 2 × 15 face pulls for posture", gif: "hammer_curl",
        log: [{ exercise: "Hammer Curl", sets: 2, reps: 15, muscleGroup: "Arms", equipment: "Dumbbell" }, { exercise: "Face Pull", sets: 2, reps: 15, muscleGroup: "Shoulders", equipment: "Cable" }] },
    ],
  },
  {
    id: "legs",
    title: "Legs",
    weekday: "Tuesday",
    weekdayIndex: 2,
    kind: "pump",
    summary: "Volume day. Quads, glutes and hamstrings with machines and single-leg work.",
    exercises: [
      { name: "Hack squat", alt: "or leg press", sets: "4 × 8–12", rest: "2–3 min", cue: "Full depth, knees track over the toes", gif: "hack_squat",
        log: [{ exercise: "Hack Squat", sets: 4, reps: 12, muscleGroup: "Legs", equipment: "Machine" }] },
      { name: "Barbell hip thrust", sets: "3 × 8–12", rest: "2 min", cue: "Chin tucked, squeeze glutes 1 s at the top", gif: "hip_thrust",
        log: [{ exercise: "Hip Thrust", sets: 3, reps: 12, muscleGroup: "Legs", equipment: "Barbell" }] },
      { name: "Bulgarian split squat", sets: "3 × 10–12 / leg", rest: "90 s", cue: "Front heel stays down, torso tall", gif: "bulgarian_split_squat",
        log: [{ exercise: "Bulgarian Split Squat", sets: 3, reps: 12, muscleGroup: "Legs", equipment: "Dumbbell" }] },
      { name: "Lying leg curl", sets: "3 × 10–15", rest: "90 s", cue: "Hips pressed into the pad, lower slowly", gif: "lying_leg_curl",
        log: [{ exercise: "Lying Leg Curl", sets: 3, reps: 15, muscleGroup: "Legs", equipment: "Machine" }] },
      { name: "Leg extension", sets: "3 × 12–15", rest: "60 s", cue: "Pause 1 s at the top", gif: "leg_extension",
        log: [{ exercise: "Leg Extension", sets: 3, reps: 15, muscleGroup: "Legs", equipment: "Machine" }] },
      { name: "Seated calf raise", sets: "3 × 12–20", rest: "60 s", cue: "Full stretch at the bottom, 2 s pause", gif: "seated_calf_raise",
        log: [{ exercise: "Seated Calf Raise", sets: 3, reps: 20, muscleGroup: "Legs", equipment: "Machine" }] },
    ],
  },
  {
    id: "upper",
    title: "Upper",
    weekday: "Thursday",
    weekdayIndex: 4,
    kind: "heavy",
    summary: "Heavy compounds. Rest fully between sets and chase weight on the bar.",
    exercises: [
      { name: "Barbell bench press", sets: "4 × 5–7", rest: "2–3 min", cue: "Shoulder blades pinched, bar to lower chest", gif: "bench_press",
        log: [{ exercise: "Bench Press", sets: 4, reps: 7, muscleGroup: "Chest", equipment: "Barbell" }] },
      { name: "Weighted pull-up", alt: "or lat pulldown", sets: "4 × 6–8", rest: "2–3 min", cue: "Full hang at the bottom, chest to the bar", gif: "pull_up",
        log: [{ exercise: "Pull-Up", sets: 4, reps: 8, muscleGroup: "Back", equipment: "Bodyweight" }] },
      { name: "Seated cable row", sets: "3 × 8–10", rest: "2 min", cue: "Pull elbows to hips and pause 1 s", gif: "seated_cable_row",
        log: [{ exercise: "Seated Cable Row", sets: 3, reps: 10, muscleGroup: "Back", equipment: "Cable" }] },
      { name: "Seated dumbbell shoulder press", sets: "3 × 8–10", rest: "2 min", cue: "Lower to ear level, press straight up", gif: "seated_db_press",
        log: [{ exercise: "Dumbbell Shoulder Press", sets: 3, reps: 10, muscleGroup: "Shoulders", equipment: "Dumbbell" }] },
      { name: "EZ-bar curl ⇄ overhead cable triceps ext.", sets: "2 × 10–12", rest: "60 s", cue: "Superset: alternate the two with no rest between", gif: "ez_bar_curl",
        log: [{ exercise: "EZ-Bar Curl", sets: 2, reps: 12, muscleGroup: "Arms", equipment: "Barbell", supersetGroup: "arms" }, { exercise: "Overhead Cable Tricep Extension", sets: 2, reps: 12, muscleGroup: "Arms", equipment: "Cable", supersetGroup: "arms" }] },
      { name: "Cable lateral raise", sets: "2 × 12–15", rest: "60 s", cue: "Cable behind the body, raise to shoulder height", gif: "cable_lateral_raise",
        log: [{ exercise: "Cable Lateral Raise", sets: 2, reps: 15, muscleGroup: "Shoulders", equipment: "Cable" }] },
    ],
  },
  {
    id: "lower",
    title: "Lower",
    weekday: "Friday",
    weekdayIndex: 5,
    kind: "heavy",
    summary: "Strength focus. Leave 2–3 reps in the tank on squats and RDLs.",
    exercises: [
      { name: "Back squat", sets: "4 × 5–7", rest: "3 min", cue: "Brace hard, hips below parallel if mobility allows", gif: "back_squat",
        log: [{ exercise: "Squat", sets: 4, reps: 7, muscleGroup: "Legs", equipment: "Barbell" }] },
      { name: "Romanian deadlift", sets: "3 × 6–8", rest: "2–3 min", cue: "Hips back, bar close to the legs", gif: "romanian_deadlift",
        log: [{ exercise: "Romanian Deadlift", sets: 3, reps: 8, muscleGroup: "Legs", equipment: "Barbell" }] },
      { name: "Leg press", sets: "3 × 10–12", rest: "2 min", cue: "Deep as you can without the hips lifting", gif: "leg_press",
        log: [{ exercise: "Leg Press", sets: 3, reps: 12, muscleGroup: "Legs", equipment: "Machine" }] },
      { name: "Seated leg curl", sets: "3 × 10–15", rest: "90 s", cue: "Lean slightly forward for more stretch", gif: "seated_leg_curl",
        log: [{ exercise: "Seated Leg Curl", sets: 3, reps: 15, muscleGroup: "Legs", equipment: "Machine" }] },
      { name: "Standing calf raise", sets: "3 × 8–12", rest: "60 s", cue: "2 s pause at the bottom stretch", gif: "standing_calf_raise",
        log: [{ exercise: "Calf Raise", sets: 3, reps: 12, muscleGroup: "Legs", equipment: "Machine" }] },
      { name: "Hanging leg raise", sets: "3 × 10–15", rest: "60 s", cue: "Curl the pelvis up, no swinging", gif: "hanging_leg_raise",
        log: [{ exercise: "Hanging Leg Raise", sets: 3, reps: 15, muscleGroup: "Core", equipment: "Bodyweight" }] },
    ],
  },
];

export const progression: { title: string; body: string }[] = [
  { title: "Effort", body: "End most sets with 1–2 reps left. On isolation exercises, take the last set to 0–1 reps left." },
  { title: "Double progression", body: "Once you hit the top of the rep range on every set, add 2.5 kg (upper) or 5 kg (lower) and work back up from the bottom of the range." },
  { title: "Warm-up & cool-down", body: "Every workout above has its own routine. Never skip the ramp-up sets." },
  { title: "8-week block", body: "Weeks 1–6 push progression. Week 7 deload: half the sets, same weights. Week 8 test rep maxes, then start a new block." },
];

// ------------------------------------------------------- warm-up & cool-down

/** A workout's warm-up and cool-down (shared with the plan template). */
export function workoutRoutine(workout: Workout): DayRoutine {
  return RECOMP_ROUTINES[workout.weekdayIndex];
}

export interface SessionBlock {
  label: string;
  time: string;
  kind: "warmup" | "lift" | "cooldown" | "cardio";
  /** Relative width in the session bar. */
  grow: number;
}

export const sessionStructure: SessionBlock[] = [
  { label: "Warm-up", time: "8–10 min", kind: "warmup", grow: 2 },
  { label: "Lifting · 6 exercises", time: "~55 min", kind: "lift", grow: 9 },
  { label: "Cool-down", time: "5–7 min", kind: "cooldown", grow: 1.5 },
  { label: "Cardio (optional)", time: "15–20 min", kind: "cardio", grow: 2 },
];

export const sessionNote =
  "Total ~70 min, or ~90 min on days with cardio. Ramp-up sets count as warm-up: they're light, never to failure, and don't count toward your working sets.";

export const whyWarmup: { lead: string; body: string }[] = [
  { lead: "Warm-up", body: "raises muscle temperature and grooves the movement, so your first working set is strong and safe." },
  { lead: "Ramp-up sets", body: "are how you find the right working weight for the day." },
  { lead: "Cool-down", body: "brings your heart rate down and keeps your hips, chest and shoulders mobile. That matters a lot when you sit all day." },
  { lead: "Short on time?", body: "Keep the ramp-up sets. Cut the stretches, not the warm-up." },
];

// ------------------------------------------------------------------- cardio

export const cardioHeadline: { value: string; unit: string; label: string }[] = [
  { value: "8–10k", unit: "steps", label: "Every day" },
  { value: "2–4", unit: "zone-2 sessions", label: "Weekly" },
  { value: "1", unit: "interval session", label: "Optional, from week 4" },
];

export interface HeartRateZone {
  zone: string;
  range: string;
  feel: string;
  target?: boolean;
}

export const heartRateZones: HeartRateZone[] = [
  { zone: "Z1", range: "50–60%", feel: "Walking" },
  { zone: "Z2", range: "60–70%", feel: "Can talk in full sentences", target: true },
  { zone: "Z3", range: "70–80%", feel: "Short phrases only" },
  { zone: "Z4", range: "80–90%", feel: "A few words" },
  { zone: "Z5", range: "90%+", feel: "Can't talk" },
];

export const zone2Note =
  "Max heart rate ≈ 220 − your age. Zone 2 is 60–70% of that. At age 30 that's about 115–135 bpm. No watch? Use the talk test: you can talk in full sentences but wouldn't want to sing.";

export interface CardioDay {
  day: string;
  gym: string;
  cardio: string;
  how: string;
  /** When to start; null = no cardio that day. */
  start: string | null;
  /** Standalone session (not after lifting). */
  key?: boolean;
}

export const cardioWeek: CardioDay[] = [
  { day: "Sun", gym: "Push", cardio: "15–20 min after lifting", how: "Incline treadmill 10–12%, 5–5.5 km/h, hands off rails", start: "Week 5" },
  { day: "Mon", gym: "Pull", cardio: "15–20 min after lifting", how: "Bike or rower, steady easy pace", start: "If fat loss stalls" },
  { day: "Tue", gym: "Legs", cardio: "None", how: "Recovery. Daily steps only", start: null },
  { day: "Wed", gym: "Rest", cardio: "30–40 min zone 2", how: "Brisk walk or cycling (intervals option from week 4)", start: "Week 1", key: true },
  { day: "Thu", gym: "Upper", cardio: "15 min after lifting", how: "Incline walk or bike", start: "Week 5" },
  { day: "Fri", gym: "Lower", cardio: "None", how: "Heavy leg day. Steps only", start: null },
  { day: "Sat", gym: "Rest", cardio: "45–60 min walk / hike", how: "Outdoors, easy hills, bring friends or family", start: "Week 1", key: true },
];

export const intervalSession = {
  when: "Wednesday only, from week 4, if you're recovering well.",
  steps: [
    "5 min easy pedalling",
    "20 s all-out + 100 s slow. Repeat 6–8 rounds on a bike or rower",
    "5 min easy, ~25 min in total",
  ],
};

export type MachineVerdict = "best" | "good" | "careful" | "skip";

export const cardioMachines: { verdict: MachineVerdict; name: string; note: string }[] = [
  { verdict: "best", name: "Incline walk", note: "low fatigue, easy to keep in zone 2" },
  { verdict: "best", name: "Bike", note: "easy on the knees, good for intervals" },
  { verdict: "good", name: "Rower", note: "full body. Keep your back flat" },
  { verdict: "careful", name: "Stair climber", note: "tires the legs, so avoid it before Legs or Lower" },
  { verdict: "skip", name: "Running", note: "while you're heavy and lifting 5×: it's hard on the joints" },
];

export const cardioRules =
  "Lift first, cardio after. Never do hard cardio the day before Legs or Lower. If fat loss stalls for 2 weeks, add 2k steps or 10 min of zone 2 before cutting food. Steps matter more than any single cardio session.";

// ---------------------------------------------------------------- nutrition

export interface MacroTarget {
  label: string;
  grams: number;
  percent: number;
}

export const nutrition = {
  calories: 1900,
  maintenance: 2450,
  macros: [
    { label: "Protein", grams: 150, percent: 32 },
    { label: "Fat", grams: 60, percent: 28 },
    { label: "Carbs", grams: 190, percent: 40 },
  ] satisfies MacroTarget[],
  fibre: "30 g+",
  water: "3 L+",
  formula:
    "Maintenance ≈ bodyweight (lb) × 14–15. Eat 20–25% below that, and keep protein near 1.8–2 g per kg of bodyweight.",
  pace: "Aim to lose about 0.5 kg a week. Muscle gain can hide fat loss on the scale, so judge progress by waist measurement and photos, not only body weight.",
} as const;

export const keyRules: string[] = [
  "Hit 150 g protein every day. It protects muscle while you're in a deficit.",
  "Rice = 1 heaped katori (150 g) per meal, not a full plate.",
  "Get stronger every week. Log every lift; add reps or weight when you can.",
  "8–10k steps daily. If you sit all day, steps are your biggest fat-loss lever.",
  "Sleep 7–8 hours. Short sleep means less fat lost and more muscle lost.",
];

export interface Meal {
  type: "meal";
  time: string;
  meal: string;
  food: string;
  kcal: number;
  protein: number;
}

export interface TrainingSlot {
  type: "train";
}

export type MealPlanEntry = Meal | TrainingSlot;

export interface MealPlanDay {
  day: string;
  tag: string;
  training: boolean;
  kcal: number;
  protein: number;
  entries: MealPlanEntry[];
}

const meal = (time: string, name: string, food: string, kcal: number, protein: number): Meal => ({
  type: "meal",
  time,
  meal: name,
  food,
  kcal,
  protein,
});
const TRAIN: TrainingSlot = { type: "train" };

export const mealPlan: MealPlanDay[] = [
  {
    day: "Sunday", tag: "Push", training: true, kcal: 1995, protein: 145,
    entries: [
      meal("8:00", "Breakfast", "Chiya without sugar + 2 roti + anda bhurji (3 eggs + 2 whites)", 555, 35),
      meal("11:30", "Lunch", "Bhat 150 g + dal + lean buff curry 180 g (or chicken) + saag + achar", 615, 49),
      meal("−1 h", "Pre-gym", "Papaya bowl + soya chunk chatpate (30 g dry, boiled)", 165, 16),
      TRAIN,
      meal("+30 m", "Post-gym", "Dahi 200 g + 2 boiled eggs", 265, 19),
      meal("7:30", "Dinner", "Homemade chicken momo, 8 pieces (breast mince, steamed) + tomato-til achar + clear jhol", 395, 26),
    ],
  },
  {
    day: "Monday", tag: "Pull", training: true, kcal: 2035, protein: 145,
    entries: [
      meal("8:00", "Breakfast", "Chiura 50 g + bhatmas 20 g + 3 boiled eggs + chiya without sugar", 545, 32),
      meal("11:30", "Lunch", "Bhat 150 g + dal + chicken curry 180 g + saag + achar", 635, 53),
      meal("−1 h", "Pre-gym", "Apple or banana + roasted bhatmas 20 g", 170, 7),
      TRAIN,
      meal("+30 m", "Post-gym", "Dahi 200 g + 2 boiled eggs", 265, 19),
      meal("7:30", "Dinner", "1 roti + fish curry 150 g (or egg curry) + saag + mohi", 420, 34),
    ],
  },
  {
    day: "Tuesday", tag: "Legs · highest carbs", training: true, kcal: 1915, protein: 145,
    entries: [
      meal("8:00", "Breakfast", "Chiya without sugar + omelette (3 eggs + 2 whites) + 1 roti", 455, 31),
      meal("11:30", "Lunch", "Bhat 180 g + dal + chicken curry 150 g + saag + mohi", 695, 55),
      meal("−1 h", "Pre-gym", "Banana + sattu drink 40 g", 260, 9),
      TRAIN,
      meal("+30 m", "Post-gym", "2 boiled eggs", 145, 12),
      meal("7:30", "Dinner", "Homemade chicken thukpa (40 g noodles, 150 g breast, lots of veg)", 360, 38),
    ],
  },
  {
    day: "Wednesday", tag: "Rest + cardio", training: false, kcal: 1965, protein: 141,
    entries: [
      meal("8:00", "Breakfast", "Sattu drink (40 g, lemon, no sugar) + 3 boiled eggs + 2 whites + chiya without sugar", 475, 36),
      meal("12:00", "Lunch", "Kodo or fapar dhido (60 g flour) + gundruk or saag + chicken jhol 200 g + dal", 680, 59),
      meal("3:30", "Khaja", "Guava or apple + roasted bhatmas 30 g", 205, 11),
      meal("7:30", "Dinner", "Bhat 120 g + kwati soup + egg curry (2 eggs + 2 whites) + mohi", 605, 35),
    ],
  },
  {
    day: "Thursday", tag: "Upper", training: true, kcal: 2000, protein: 150,
    entries: [
      meal("8:00", "Breakfast", "Chiya without sugar + omelette (3 eggs + 2 whites, onion, chili, tomato) + 1 roti", 455, 31),
      meal("11:30", "Lunch", "Bhat 150 g + dal + chicken curry 180 g + saag + achar", 635, 53),
      meal("−1 h", "Pre-gym", "Banana + roasted bhatmas 30 g", 235, 12),
      TRAIN,
      meal("+30 m", "Post-gym", "Dahi 200 g + 2 boiled eggs", 265, 19),
      meal("7:30", "Dinner", "1 roti + soya chunk tarkari (60 g dry) + mohi + mula-kakro salad", 430, 38),
    ],
  },
  {
    day: "Friday", tag: "Lower", training: true, kcal: 1935, protein: 142,
    entries: [
      meal("8:00", "Breakfast", "Chiura 50 g + dahi 200 g + banana + 2 boiled eggs", 540, 24),
      meal("11:30", "Lunch", "Bhat 150 g + dal + fish curry (rohu) 180 g + aloo-cauli tarkari + achar", 675, 45),
      meal("−1 h", "Pre-gym", "Chana chatpate (40 g dry, not fried) + chiya without sugar", 210, 11),
      TRAIN,
      meal("+30 m", "Post-gym", "2 boiled eggs", 145, 12),
      meal("7:30", "Dinner", "Chicken sekuwa 200 g (grilled, little oil) + gundruk soup + mohi", 365, 50),
    ],
  },
  {
    day: "Saturday", tag: "Rest", training: false, kcal: 1895, protein: 137,
    entries: [
      meal("8:00", "Breakfast", "2 roti + chana tarkari + 2 boiled eggs + 2 whites + chiya without sugar", 610, 37),
      meal("12:00", "Lunch", "Bhat 150 g + dal + chicken or buff choila 180 g + saag + achar", 625, 53),
      meal("3:30", "Khaja", "Dahi 200 g + guava", 180, 7),
      meal("7:30", "Dinner", "Kwati soup + soya chunk curry (50 g dry) + 1 roti + salad", 480, 40),
    ],
  },
];

export const kitchenRules: string[] = [
  "Rice: 1 heaped katori per meal.",
  "Oil: 1 tsp per person per dish. Take your portion out before the final tadka.",
  "Chiya without sugar. 3 sweet cups add ~200 kcal a day.",
  "Protein at every meal: egg, chicken, buff, fish, soya, dahi or bhatmas.",
  "Limit fried food (sel roti, samosa, pakoda, chowmein) to once a week.",
];

export const swaps: { from: string; to: string }[] = [
  { from: "Chicken 180 g", to: "Buff 180 g · fish 200 g · soya 70 g dry" },
  { from: "2 roti", to: "Bhat 150 g · dhido 60 g flour" },
  { from: "Dahi 200 g", to: "1 glass milk + 2 egg whites" },
  { from: "Bhatmas 30 g", to: "Chana chatpate · 2 boiled eggs" },
  { from: "Paneer", to: "Occasionally only, 75 g max (high fat)" },
];

export const deskFixes: string[] = [
  "Walk 10 min after every meal and take calls on your feet.",
  "Every 45–60 min: stand up, do 10 bodyweight squats or a hip-flexor stretch.",
  "5-min daily mobility: hip-flexor stretch, thoracic extension, band pull-aparts.",
  "Water: 1 glass every hour you work, 3 L+ a day.",
];

/** GIFs used in the landing-page preview grid. */
export const previewGifs: { gif: ExerciseGif; label: string }[] = [
  { gif: "incline_db_press", label: "Incline DB press" },
  { gif: "lat_pulldown", label: "Lat pulldown" },
  { gif: "back_squat", label: "Back squat" },
  { gif: "lateral_raise", label: "Lateral raise" },
];
