// Predefined workout plan templates
// Exercise names must match the seeded global exercises in convex/exercises.ts

export interface PredefinedPlanExercise {
  exerciseName: string;
  sets: { repsTarget: number; notes?: string }[];
}

export interface PredefinedPlanDay {
  weekday: number;
  name?: string;
  exercises: PredefinedPlanExercise[];
}

export interface PredefinedPlan {
  id: string;
  name: string;
  description: string;
  icon: string;
  daysPerWeek: number;
  level: "beginner" | "intermediate" | "advanced";
  category: string;
  days: PredefinedPlanDay[];
}

export const PREDEFINED_PLANS: PredefinedPlan[] = [
  // Full Body 3-Day (Beginner)
  {
    id: "full-body-3",
    name: "Full Body 3-Day",
    description: "Perfect for beginners. Train your entire body 3 times per week with compound movements.",
    icon: "🌟",
    daysPerWeek: 3,
    level: "beginner",
    category: "Full Body",
    days: [
      {
        weekday: 0, 
        name: "Full Body A",
        exercises: [
          { exerciseName: "Squat", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Bench Press", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Barbell Row", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Overhead Press", sets: [{ repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Cable Crunch", sets: [{ repsTarget: 15 }, { repsTarget: 15 }] },
        ],
      },
      { weekday: 1, exercises: [] }, // Rest
      {
        weekday: 2, 
        name: "Full Body B",
        exercises: [
          { exerciseName: "Deadlift", sets: [{ repsTarget: 5 }, { repsTarget: 5 }, { repsTarget: 5 }] },
          { exerciseName: "Incline Dumbbell Press", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Lat Pulldown", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Lateral Raise", sets: [{ repsTarget: 15 }, { repsTarget: 15 }] },
          { exerciseName: "Tricep Pushdown", sets: [{ repsTarget: 12 }, { repsTarget: 12 }] },
        ],
      },
      { weekday: 3, exercises: [] }, // Rest
      {
        weekday: 4, 
        name: "Full Body C",
        exercises: [
          { exerciseName: "Leg Press", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Dumbbell Shoulder Press", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Seated Cable Row", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Dumbbell Curl", sets: [{ repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Face Pull", sets: [{ repsTarget: 15 }, { repsTarget: 15 }] },
        ],
      },
      { weekday: 5, exercises: [] }, // Rest
      { weekday: 6, exercises: [] }, // Rest
    ],
  },

  // Upper/Lower 4-Day (Intermediate)
  {
    id: "upper-lower-4",
    name: "Upper/Lower 4-Day",
    description: "Balanced 4-day split alternating between upper and lower body. Great for building strength and muscle.",
    icon: "⚖️",
    daysPerWeek: 4,
    level: "intermediate",
    category: "Upper/Lower",
    days: [
      {
        weekday: 0, 
        name: "Upper A",
        exercises: [
          { exerciseName: "Bench Press", sets: [{ repsTarget: 6 }, { repsTarget: 6 }, { repsTarget: 6 }, { repsTarget: 6 }] },
          { exerciseName: "Barbell Row", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Overhead Press", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Lat Pulldown", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Lateral Raise", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Skull Crusher", sets: [{ repsTarget: 12 }, { repsTarget: 12 }] },
        ],
      },
      {
        weekday: 1, 
        name: "Lower A",
        exercises: [
          { exerciseName: "Squat", sets: [{ repsTarget: 5 }, { repsTarget: 5 }, { repsTarget: 5 }, { repsTarget: 5 }] },
          { exerciseName: "Romanian Deadlift", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Leg Press", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Leg Curl", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Calf Raise", sets: [{ repsTarget: 15 }, { repsTarget: 15 }, { repsTarget: 15 }] },
        ],
      },
      { weekday: 2, exercises: [] }, // Rest
      {
        weekday: 3, 
        name: "Upper B",
        exercises: [
          { exerciseName: "Overhead Press", sets: [{ repsTarget: 6 }, { repsTarget: 6 }, { repsTarget: 6 }, { repsTarget: 6 }] },
          { exerciseName: "Lat Pulldown", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Incline Dumbbell Press", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Dumbbell Row", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Lateral Raise", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Face Pull", sets: [{ repsTarget: 15 }, { repsTarget: 15 }] },
        ],
      },
      {
        weekday: 4, 
        name: "Lower B",
        exercises: [
          { exerciseName: "Deadlift", sets: [{ repsTarget: 5 }, { repsTarget: 5 }, { repsTarget: 5 }] },
          { exerciseName: "Front Squat", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Luges", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Leg Extension", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Hanging Leg Raise", sets: [{ repsTarget: 15 }, { repsTarget: 15 }, { repsTarget: 15 }] },
        ],
      },
      { weekday: 5, exercises: [] }, // Rest
      { weekday: 6, exercises: [] }, // Rest
    ],
  },

  // Push/Pull/Legs 6-Day (Intermediate/Advanced)
  {
    id: "ppl-6",
    name: "Push/Pull/Legs",
    description: "Classic 6-day PPL split. High frequency hitting each muscle group twice per week for maximum growth.",
    icon: "💪",
    daysPerWeek: 6,
    level: "intermediate",
    category: "PPL",
    days: [
      {
        weekday: 0, 
        name: "Push A",
        exercises: [
          { exerciseName: "Bench Press", sets: [{ repsTarget: 5 }, { repsTarget: 5 }, { repsTarget: 5 }] },
          { exerciseName: "Overhead Press", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Incline Dumbbell Press", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Cable Crossover", sets: [{ repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Lateral Raise", sets: [{ repsTarget: 15 }, { repsTarget: 15 }, { repsTarget: 15 }] },
          { exerciseName: "Tricep Pushdown", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
        ],
      },
      {
        weekday: 1, 
        name: "Pull A",
        exercises: [
          { exerciseName: "Deadlift", sets: [{ repsTarget: 5 }, { repsTarget: 5 }, { repsTarget: 5 }] },
          { exerciseName: "Pull-Up", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Barbell Row", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Face Pull", sets: [{ repsTarget: 15 }, { repsTarget: 15 }, { repsTarget: 15 }] },
          { exerciseName: "Barbell Curl", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Hammer Curl", sets: [{ repsTarget: 12 }, { repsTarget: 12 }] },
        ],
      },
      {
        weekday: 2,
        name: "Legs A",
        exercises: [
          { exerciseName: "Squat", sets: [{ repsTarget: 5 }, { repsTarget: 5 }, { repsTarget: 5 }] },
          { exerciseName: "Romanian Deadlift", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Leg Press", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Leg Curl", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Leg Extension", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Calf Raise", sets: [{ repsTarget: 15 }, { repsTarget: 15 }, { repsTarget: 15 }] },
        ],
      },
      {
        weekday: 3, 
        name: "Push B",
        exercises: [
          { exerciseName: "Overhead Press", sets: [{ repsTarget: 5 }, { repsTarget: 5 }, { repsTarget: 5 }] },
          { exerciseName: "Incline Bench Press", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Dumbbell Bench Press", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Chest Fly", sets: [{ repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Front Raise", sets: [{ repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Skull Crusher", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
        ],
      },
      {
        weekday: 4,
        name: "Pull B",
        exercises: [
          { exerciseName: "Barbell Row", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Pull-Up", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Seated Cable Row", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Face Pull", sets: [{ repsTarget: 15 }, { repsTarget: 15 }, { repsTarget: 15 }] },
          { exerciseName: "Barbell Curl", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Hammer Curl", sets: [{ repsTarget: 12 }, { repsTarget: 12 }] },
        ],
      },
      {
        weekday: 5, 
        name: "Legs B",
        exercises: [
          { exerciseName: "Front Squat", sets: [{ repsTarget: 6 }, { repsTarget: 6 }, { repsTarget: 6 }] },
          { exerciseName: "Bulgarian Split Squat", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Leg Press", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Leg Curl", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Lunges", sets: [{ repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Calf Raise", sets: [{ repsTarget: 15 }, { repsTarget: 15 }, { repsTarget: 15 }] },
        ],
      },
      { weekday: 6, exercises: [] }, // Rest 
    ],
  },

  // Arnold Split 6-Day (Advanced)
  {
    id: "arnold-6",
    name: "Arnold Split",
    description: "The legendary Arnold Schwarzenegger split. Chest/Back, Shoulders/Arms, Legs rotation for serious lifters.",
    icon: "🏆",
    daysPerWeek: 6,
    level: "advanced",
    category: "Arnold",
    days: [
      {
        weekday: 0, 
        name: "Chest & Back",
        exercises: [
          { exerciseName: "Bench Press", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Incline Dumbbell Press", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Barbell Row", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Pull-Up", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Cable Crossover", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "T-Bar Row", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
        ],
      },
      {
        weekday: 1, 
        name: "Shoulders & Arms",
        exercises: [
          { exerciseName: "Overhead Press", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Lateral Raise", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Rear Delt Fly", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Barbell Curl", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Close-Grip Bench Press", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Hammer Curl", sets: [{ repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Tricep Pushdown", sets: [{ repsTarget: 12 }, { repsTarget: 12 }] },
        ],
      },
      {
        weekday: 2, 
        name: "Legs",
        exercises: [
          { exerciseName: "Squat", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Leg Press", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Romanian Deadlift", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Leg Extension", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Leg Curl", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Calf Raise", sets: [{ repsTarget: 15 }, { repsTarget: 15 }, { repsTarget: 15 }, { repsTarget: 15 }] },
        ],
      },
      {
        weekday: 3, 
        name: "Chest & Back",
        exercises: [
          { exerciseName: "Incline Bench Press", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Dumbbell Bench Press", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Lat Pulldown", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Dumbbell Row", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Chest Fly", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Seated Cable Row", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
        ],
      },
      {
        weekday: 4, 
        name: "Shoulders & Arms",
        exercises: [
          { exerciseName: "Dumbbell Shoulder Press", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Front Raise", sets: [{ repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Face Pull", sets: [{ repsTarget: 15 }, { repsTarget: 15 }, { repsTarget: 15 }] },
          { exerciseName: "Dumbbell Curl", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Skull Crusher", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Tricep Dip", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
        ],
      },
      {
        weekday: 5, 
        name: "Legs",
        exercises: [
          { exerciseName: "Front Squat", sets: [{ repsTarget: 8 }, { repsTarget: 8 }, { repsTarget: 8 }] },
          { exerciseName: "Bulgarian Split Squat", sets: [{ repsTarget: 10 }, { repsTarget: 10 }, { repsTarget: 10 }] },
          { exerciseName: "Deadlift", sets: [{ repsTarget: 5 }, { repsTarget: 5 }, { repsTarget: 5 }] },
          { exerciseName: "Lunges", sets: [{ repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Leg Curl", sets: [{ repsTarget: 12 }, { repsTarget: 12 }, { repsTarget: 12 }] },
          { exerciseName: "Calf Raise", sets: [{ repsTarget: 15 }, { repsTarget: 15 }, { repsTarget: 15 }, { repsTarget: 15 }] },
        ],
      },
      { weekday: 6, exercises: [] }, // Rest 
    ],
  },
];
