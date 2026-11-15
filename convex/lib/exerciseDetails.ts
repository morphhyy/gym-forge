/**
 * Exercise library content for the seeded global exercises, keyed by the
 * exact exercise name used in `seedExercises`.
 *
 * `alternatives` are names of other catalog exercises. `gifUrl` reuses the
 * demo GIFs shipped for the public recomp plan (public/plans/recomp/exercises)
 * where the movement matches.
 */

export interface ExerciseDetails {
  instructions: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  alternatives: string[];
  gifUrl?: string;
}

const gif = (name: string) => `/plans/recomp/exercises/${name}.gif`;

export const EXERCISE_DETAILS: Record<string, ExerciseDetails> = {
  // Chest
  "Bench Press": {
    instructions: [
      "Lie on the bench with eyes under the bar, feet planted and shoulder blades pinched together.",
      "Grip slightly wider than shoulder width and unrack with straight arms.",
      "Lower the bar under control to your lower chest, elbows about 45° from your torso.",
      "Press back up in a slight arc over your shoulders without losing your upper-back arch.",
    ],
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Front delts", "Triceps"],
    alternatives: ["Dumbbell Bench Press", "Push-Up", "Close-Grip Bench Press"],
    gifUrl: gif("bench_press"),
  },
  "Incline Bench Press": {
    instructions: [
      "Set the bench to 30–45° and lie back with shoulder blades retracted.",
      "Unrack and lower the bar to your upper chest just below the collarbones.",
      "Keep wrists stacked over elbows and press straight up.",
    ],
    primaryMuscles: ["Upper chest"],
    secondaryMuscles: ["Front delts", "Triceps"],
    alternatives: ["Incline Dumbbell Press", "Bench Press"],
  },
  "Dumbbell Bench Press": {
    instructions: [
      "Sit with dumbbells on your thighs, lie back and kick them up to your chest.",
      "Press up until arms are straight, dumbbells over your shoulders.",
      "Lower slowly until you feel a stretch in your chest, elbows around 45°.",
      "Drive back up, bringing the dumbbells slightly together at the top.",
    ],
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Front delts", "Triceps"],
    alternatives: ["Bench Press", "Push-Up", "Incline Dumbbell Press"],
  },
  "Incline Dumbbell Press": {
    instructions: [
      "Set the bench to about 30° and start with dumbbells at shoulder level.",
      "Press up and slightly in until arms are straight.",
      "Lower under control to a deep stretch at the bottom.",
    ],
    primaryMuscles: ["Upper chest"],
    secondaryMuscles: ["Front delts", "Triceps"],
    alternatives: ["Incline Bench Press", "Dumbbell Bench Press"],
    gifUrl: gif("incline_db_press"),
  },
  "Chest Fly": {
    instructions: [
      "Lie on a flat bench holding dumbbells above your chest, palms facing each other.",
      "With a slight bend in the elbows, open your arms in a wide arc until you feel a chest stretch.",
      "Squeeze your chest to bring the dumbbells back together, keeping the elbow angle fixed.",
    ],
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Front delts"],
    alternatives: ["Cable Crossover", "Dumbbell Bench Press"],
  },
  "Cable Crossover": {
    instructions: [
      "Set both pulleys high, take a handle in each hand and step forward into a split stance.",
      "With soft elbows, sweep your hands down and together in front of your hips.",
      "Squeeze for a second, then let your arms open back up under control.",
    ],
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Front delts"],
    alternatives: ["Chest Fly", "Push-Up"],
  },
  "Push-Up": {
    instructions: [
      "Start in a high plank with hands slightly wider than shoulders and body in a straight line.",
      "Lower your chest towards the floor, elbows about 45° from your body.",
      "Push the floor away until arms are straight, keeping hips level.",
    ],
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Front delts", "Triceps", "Core"],
    alternatives: ["Bench Press", "Dumbbell Bench Press", "Tricep Dip"],
  },

  // Back
  Deadlift: {
    instructions: [
      "Stand with mid-foot under the bar, feet hip-width apart.",
      "Hinge and grip the bar just outside your legs; bring shins to the bar and flatten your back.",
      "Brace your core, push the floor away and stand up, keeping the bar against your legs.",
      "Lock out with hips and knees together, then hinge back down with control.",
    ],
    primaryMuscles: ["Glutes", "Hamstrings", "Lower back"],
    secondaryMuscles: ["Quads", "Traps", "Forearms"],
    alternatives: ["Romanian Deadlift", "Barbell Row"],
  },
  "Barbell Row": {
    instructions: [
      "Hold the bar with an overhand grip and hinge forward to about 45° with a flat back.",
      "Pull the bar to your lower ribs, driving the elbows back.",
      "Pause briefly, then lower until your arms are straight without standing up.",
    ],
    primaryMuscles: ["Lats", "Upper back"],
    secondaryMuscles: ["Rear delts", "Biceps", "Lower back"],
    alternatives: ["T-Bar Row", "Dumbbell Row", "Seated Cable Row"],
  },
  "Dumbbell Row": {
    instructions: [
      "Place one knee and hand on a bench, back flat, dumbbell hanging in the other hand.",
      "Row the dumbbell towards your hip, keeping the elbow close to your side.",
      "Lower to a full stretch and repeat; switch sides.",
    ],
    primaryMuscles: ["Lats", "Upper back"],
    secondaryMuscles: ["Rear delts", "Biceps"],
    alternatives: ["Barbell Row", "Seated Cable Row"],
  },
  "Pull-Up": {
    instructions: [
      "Hang from the bar with an overhand grip slightly wider than shoulders.",
      "Pull your shoulder blades down, then drive your elbows down to bring your chest to the bar.",
      "Lower all the way to a dead hang with control.",
    ],
    primaryMuscles: ["Lats"],
    secondaryMuscles: ["Biceps", "Upper back", "Core"],
    alternatives: ["Lat Pulldown"],
    gifUrl: gif("pull_up"),
  },
  "Lat Pulldown": {
    instructions: [
      "Sit with thighs locked under the pad and grip the bar slightly wider than shoulders.",
      "Lean back slightly and pull the bar to your upper chest, elbows driving down.",
      "Let the bar rise slowly until your arms are fully extended.",
    ],
    primaryMuscles: ["Lats"],
    secondaryMuscles: ["Biceps", "Upper back"],
    alternatives: ["Pull-Up", "Seated Cable Row"],
    gifUrl: gif("lat_pulldown"),
  },
  "Seated Cable Row": {
    instructions: [
      "Sit tall with feet on the platform and knees slightly bent, holding the handle.",
      "Pull the handle to your stomach, squeezing your shoulder blades together.",
      "Pause, then extend your arms and let your shoulders stretch forward.",
    ],
    primaryMuscles: ["Upper back", "Lats"],
    secondaryMuscles: ["Rear delts", "Biceps"],
    alternatives: ["Dumbbell Row", "Barbell Row", "T-Bar Row"],
    gifUrl: gif("seated_cable_row"),
  },
  "T-Bar Row": {
    instructions: [
      "Straddle the bar, hinge forward with a flat back and grip the handle.",
      "Row the weight to your chest, keeping your torso angle fixed.",
      "Lower under control to a full stretch.",
    ],
    primaryMuscles: ["Upper back", "Lats"],
    secondaryMuscles: ["Rear delts", "Biceps", "Lower back"],
    alternatives: ["Barbell Row", "Seated Cable Row"],
  },

  // Shoulders
  "Overhead Press": {
    instructions: [
      "Stand with the bar on your front shoulders, grip just outside shoulder width.",
      "Brace your core and glutes, then press the bar straight up, moving your head back out of the way.",
      "Finish with the bar over mid-foot and your head through, then lower to the shoulders.",
    ],
    primaryMuscles: ["Front delts"],
    secondaryMuscles: ["Side delts", "Triceps", "Upper chest"],
    alternatives: ["Dumbbell Shoulder Press"],
  },
  "Dumbbell Shoulder Press": {
    instructions: [
      "Sit on an upright bench with dumbbells at ear level, palms forward.",
      "Press straight up until arms are extended without clanking the dumbbells.",
      "Lower back to ear level under control.",
    ],
    primaryMuscles: ["Front delts"],
    secondaryMuscles: ["Side delts", "Triceps"],
    alternatives: ["Overhead Press", "Lateral Raise"],
    gifUrl: gif("seated_db_press"),
  },
  "Lateral Raise": {
    instructions: [
      "Stand with dumbbells at your sides and a slight forward lean.",
      "Raise your arms out to the sides, leading with the elbows, to shoulder height.",
      "Lower slowly without swinging.",
    ],
    primaryMuscles: ["Side delts"],
    secondaryMuscles: ["Traps"],
    alternatives: ["Dumbbell Shoulder Press", "Face Pull"],
    gifUrl: gif("lateral_raise"),
  },
  "Front Raise": {
    instructions: [
      "Stand holding dumbbells in front of your thighs.",
      "Raise one or both arms straight in front of you to shoulder height.",
      "Lower under control and avoid leaning back.",
    ],
    primaryMuscles: ["Front delts"],
    secondaryMuscles: ["Upper chest"],
    alternatives: ["Dumbbell Shoulder Press", "Overhead Press"],
  },
  "Rear Delt Fly": {
    instructions: [
      "Hinge forward with a flat back, dumbbells hanging under your chest.",
      "With soft elbows, raise the dumbbells out to the sides until arms are level with your torso.",
      "Squeeze the back of your shoulders, then lower slowly.",
    ],
    primaryMuscles: ["Rear delts"],
    secondaryMuscles: ["Upper back"],
    alternatives: ["Face Pull", "Seated Cable Row"],
  },
  "Face Pull": {
    instructions: [
      "Set a rope on a high pulley and grab it with thumbs pointing back.",
      "Pull the rope towards your face, spreading the ends and driving elbows high and back.",
      "Finish with hands beside your ears, then return under control.",
    ],
    primaryMuscles: ["Rear delts"],
    secondaryMuscles: ["Upper back", "Rotator cuff"],
    alternatives: ["Rear Delt Fly"],
  },

  // Legs
  Squat: {
    instructions: [
      "Set the bar on your upper back, step out and stand with feet shoulder-width apart.",
      "Brace your core, then sit down and back, knees tracking over your toes.",
      "Descend until hips are at or below parallel if mobility allows.",
      "Drive up through the whole foot, keeping your chest up.",
    ],
    primaryMuscles: ["Quads", "Glutes"],
    secondaryMuscles: ["Adductors", "Lower back", "Core"],
    alternatives: ["Front Squat", "Leg Press", "Bulgarian Split Squat"],
    gifUrl: gif("back_squat"),
  },
  "Front Squat": {
    instructions: [
      "Rest the bar on your front shoulders with elbows high (clean grip or crossed arms).",
      "Keep your torso upright and squat straight down between your heels.",
      "Drive up, leading with the elbows so the bar stays in place.",
    ],
    primaryMuscles: ["Quads"],
    secondaryMuscles: ["Glutes", "Upper back", "Core"],
    alternatives: ["Squat", "Leg Press"],
  },
  "Leg Press": {
    instructions: [
      "Sit with your back flat on the pad and feet shoulder-width on the platform.",
      "Release the safeties and lower the platform until knees are around 90° or deeper without your hips lifting.",
      "Press back up without locking your knees hard.",
    ],
    primaryMuscles: ["Quads", "Glutes"],
    secondaryMuscles: ["Adductors", "Hamstrings"],
    alternatives: ["Squat", "Bulgarian Split Squat"],
    gifUrl: gif("leg_press"),
  },
  "Romanian Deadlift": {
    instructions: [
      "Stand holding the bar at your hips, knees slightly bent.",
      "Push your hips back and slide the bar down your thighs, keeping your back flat.",
      "Stop when you feel a strong hamstring stretch (usually just below the knees).",
      "Drive your hips forward to stand back up.",
    ],
    primaryMuscles: ["Hamstrings", "Glutes"],
    secondaryMuscles: ["Lower back", "Forearms"],
    alternatives: ["Deadlift", "Leg Curl"],
    gifUrl: gif("romanian_deadlift"),
  },
  "Leg Curl": {
    instructions: [
      "Lie face down (or sit) with the pad just above your heels and knees in line with the machine pivot.",
      "Curl your heels towards your glutes, keeping hips pressed into the pad.",
      "Lower slowly to full extension.",
    ],
    primaryMuscles: ["Hamstrings"],
    secondaryMuscles: ["Calves"],
    alternatives: ["Romanian Deadlift"],
    gifUrl: gif("lying_leg_curl"),
  },
  "Leg Extension": {
    instructions: [
      "Sit with the pad on your lower shins and knees in line with the machine pivot.",
      "Extend your legs until straight and pause for a second at the top.",
      "Lower under control.",
    ],
    primaryMuscles: ["Quads"],
    secondaryMuscles: [],
    alternatives: ["Leg Press", "Front Squat"],
    gifUrl: gif("leg_extension"),
  },
  "Calf Raise": {
    instructions: [
      "Stand with the balls of your feet on the platform and heels hanging off.",
      "Lower your heels into a full stretch and pause.",
      "Rise as high as you can onto your toes, then lower slowly.",
    ],
    primaryMuscles: ["Calves"],
    secondaryMuscles: [],
    alternatives: ["Leg Press"],
    gifUrl: gif("standing_calf_raise"),
  },
  "Bulgarian Split Squat": {
    instructions: [
      "Stand a stride in front of a bench and rest the top of your rear foot on it.",
      "Hold dumbbells at your sides and lower until your rear knee nearly touches the floor.",
      "Push through the front heel to stand, keeping your torso tall; switch legs.",
    ],
    primaryMuscles: ["Quads", "Glutes"],
    secondaryMuscles: ["Adductors", "Hamstrings"],
    alternatives: ["Lunges", "Squat", "Leg Press"],
    gifUrl: gif("bulgarian_split_squat"),
  },
  Lunges: {
    instructions: [
      "Stand tall holding dumbbells at your sides.",
      "Step forward and lower until both knees are at about 90°.",
      "Push off the front foot to return (or step into the next rep); alternate legs.",
    ],
    primaryMuscles: ["Quads", "Glutes"],
    secondaryMuscles: ["Hamstrings", "Adductors"],
    alternatives: ["Bulgarian Split Squat", "Leg Press"],
  },

  // Arms
  "Barbell Curl": {
    instructions: [
      "Stand holding the bar with an underhand, shoulder-width grip.",
      "Curl the bar up, keeping your elbows pinned to your sides.",
      "Squeeze at the top, then lower slowly to full extension.",
    ],
    primaryMuscles: ["Biceps"],
    secondaryMuscles: ["Forearms"],
    alternatives: ["Dumbbell Curl", "Hammer Curl"],
    gifUrl: gif("ez_bar_curl"),
  },
  "Dumbbell Curl": {
    instructions: [
      "Stand with dumbbells at your sides, palms facing forward.",
      "Curl the weights up without swinging, elbows fixed at your sides.",
      "Lower slowly to a full stretch.",
    ],
    primaryMuscles: ["Biceps"],
    secondaryMuscles: ["Forearms"],
    alternatives: ["Barbell Curl", "Hammer Curl"],
  },
  "Hammer Curl": {
    instructions: [
      "Hold dumbbells at your sides with palms facing each other.",
      "Curl up keeping the neutral grip and elbows still.",
      "Lower under control.",
    ],
    primaryMuscles: ["Brachialis", "Biceps"],
    secondaryMuscles: ["Forearms"],
    alternatives: ["Dumbbell Curl", "Barbell Curl"],
    gifUrl: gif("hammer_curl"),
  },
  "Tricep Pushdown": {
    instructions: [
      "Face a high pulley holding a rope or bar, elbows tucked at your sides.",
      "Push down until your arms are straight, spreading the rope at the bottom.",
      "Let your forearms rise back up without moving your elbows.",
    ],
    primaryMuscles: ["Triceps"],
    secondaryMuscles: [],
    alternatives: ["Skull Crusher", "Tricep Dip", "Close-Grip Bench Press"],
    gifUrl: gif("rope_pushdown"),
  },
  "Skull Crusher": {
    instructions: [
      "Lie on a bench holding the bar over your chest with a narrow grip.",
      "Bend at the elbows to lower the bar towards your forehead or just behind your head.",
      "Extend your elbows to press back up, keeping upper arms still.",
    ],
    primaryMuscles: ["Triceps"],
    secondaryMuscles: [],
    alternatives: ["Tricep Pushdown", "Close-Grip Bench Press"],
  },
  "Tricep Dip": {
    instructions: [
      "Support yourself on parallel bars with arms straight and body upright.",
      "Lower by bending your elbows until upper arms are about parallel to the floor.",
      "Press back up to straight arms.",
    ],
    primaryMuscles: ["Triceps"],
    secondaryMuscles: ["Chest", "Front delts"],
    alternatives: ["Close-Grip Bench Press", "Tricep Pushdown", "Push-Up"],
  },
  "Close-Grip Bench Press": {
    instructions: [
      "Lie on the bench and grip the bar about shoulder-width apart.",
      "Lower the bar to your lower chest, keeping elbows close to your body.",
      "Press back up by extending through the triceps.",
    ],
    primaryMuscles: ["Triceps"],
    secondaryMuscles: ["Chest", "Front delts"],
    alternatives: ["Bench Press", "Tricep Dip", "Skull Crusher"],
  },

  // Core
  Plank: {
    instructions: [
      "Rest on your forearms and toes with elbows under your shoulders.",
      "Squeeze your glutes and brace your abs so your body forms a straight line.",
      "Hold the position while breathing steadily; log seconds as reps.",
    ],
    primaryMuscles: ["Abs"],
    secondaryMuscles: ["Obliques", "Shoulders", "Glutes"],
    alternatives: ["Ab Wheel Rollout", "Hanging Leg Raise"],
  },
  "Hanging Leg Raise": {
    instructions: [
      "Hang from a bar with straight arms and shoulders engaged.",
      "Curl your pelvis up and raise your legs (bent or straight) without swinging.",
      "Lower slowly to a dead hang.",
    ],
    primaryMuscles: ["Abs", "Hip flexors"],
    secondaryMuscles: ["Obliques", "Forearms"],
    alternatives: ["Cable Crunch", "Plank"],
    gifUrl: gif("hanging_leg_raise"),
  },
  "Cable Crunch": {
    instructions: [
      "Kneel facing a high pulley, holding a rope beside your head.",
      "Crunch down by flexing your spine, bringing elbows towards your thighs.",
      "Return slowly, keeping your hips still.",
    ],
    primaryMuscles: ["Abs"],
    secondaryMuscles: ["Obliques"],
    alternatives: ["Hanging Leg Raise", "Ab Wheel Rollout"],
  },
  "Ab Wheel Rollout": {
    instructions: [
      "Kneel holding the ab wheel under your shoulders.",
      "Brace your core and roll forward as far as you can without your lower back sagging.",
      "Pull back to the start using your abs.",
    ],
    primaryMuscles: ["Abs"],
    secondaryMuscles: ["Lats", "Shoulders", "Obliques"],
    alternatives: ["Plank", "Cable Crunch"],
  },
};

/** Fields to patch onto an exercise doc, or null if no details exist. */
export function getExerciseDetails(name: string): ExerciseDetails | null {
  return EXERCISE_DETAILS[name] ?? null;
}
