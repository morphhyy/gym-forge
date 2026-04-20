"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";

type TemplateExercise = {
  name: string;
  sets: number;
  reps: number;
};

type TemplateDay = {
  weekday: number;
  name: string;
  exercises: TemplateExercise[];
};

type Template = {
  id: string;
  name: string;
  description: string;
  frequency: string;
  level: string;
  days: TemplateDay[];
};

const TEMPLATES: Template[] = [
  {
    id: "arnold-split",
    name: "Arnold Split",
    description: "Arnold Schwarzenegger's classic 6-day bodybuilding split. Pairs chest/back and shoulders/arms for antagonist supersets and maximum pump.",
    frequency: "6 days/week",
    level: "Intermediate - Advanced",
    days: [
      {
        weekday: 0,
        name: "Chest & Back A",
        exercises: [
          { name: "Bench Press", sets: 4, reps: 10 },
          { name: "Incline Dumbbell Press", sets: 4, reps: 10 },
          { name: "Pull-Up", sets: 4, reps: 8 },
          { name: "Barbell Row", sets: 4, reps: 10 },
          { name: "Chest Fly", sets: 3, reps: 12 },
          { name: "Lat Pulldown", sets: 4, reps: 12 },
        ],
      },
      {
        weekday: 1,
        name: "Shoulders & Arms A",
        exercises: [
          { name: "Dumbbell Shoulder Press", sets: 4, reps: 10 },
          { name: "Lateral Raise", sets: 4, reps: 15 },
          { name: "Barbell Curl", sets: 4, reps: 10 },
          { name: "Tricep Dip", sets: 4, reps: 10 },
          { name: "Dumbbell Curl", sets: 3, reps: 12 },
          { name: "Skull Crusher", sets: 3, reps: 10 },
        ],
      },
      {
        weekday: 2,
        name: "Legs A",
        exercises: [
          { name: "Squat", sets: 4, reps: 10 },
          { name: "Lunges", sets: 3, reps: 12 },
          { name: "Romanian Deadlift", sets: 4, reps: 10 },
          { name: "Leg Extension", sets: 3, reps: 12 },
          { name: "Leg Curl", sets: 3, reps: 12 },
          { name: "Calf Raise", sets: 4, reps: 15 },
        ],
      },
      {
        weekday: 3,
        name: "Chest & Back B",
        exercises: [
          { name: "Deadlift", sets: 3, reps: 8 },
          { name: "Dumbbell Bench Press", sets: 4, reps: 10 },
          { name: "Dumbbell Row", sets: 4, reps: 10 },
          { name: "Seated Cable Row", sets: 4, reps: 12 },
          { name: "Cable Crossover", sets: 3, reps: 12 },
          { name: "Push-Up", sets: 3, reps: 15 },
        ],
      },
      {
        weekday: 4,
        name: "Shoulders & Arms B",
        exercises: [
          { name: "Overhead Press", sets: 4, reps: 10 },
          { name: "Front Raise", sets: 4, reps: 12 },
          { name: "Hammer Curl", sets: 4, reps: 10 },
          { name: "Tricep Pushdown", sets: 3, reps: 12 },
          { name: "Rear Delt Fly", sets: 3, reps: 15 },
          { name: "Close-Grip Bench Press", sets: 3, reps: 10 },
        ],
      },
      {
        weekday: 5,
        name: "Legs B",
        exercises: [
          { name: "Leg Press", sets: 4, reps: 12 },
          { name: "Romanian Deadlift", sets: 4, reps: 10 },
          { name: "Bulgarian Split Squat", sets: 3, reps: 10 },
          { name: "Leg Curl", sets: 4, reps: 12 },
          { name: "Leg Extension", sets: 3, reps: 12 },
          { name: "Calf Raise", sets: 4, reps: 15 },
        ],
      },
    ],
  },
  {
    id: "pplul",
    name: "PPLUL (Hybrid 5-Day)",
    description: "Push/Pull/Legs + Upper/Lower hybrid. Best 5-day split for body recomposition — high frequency with built-in variety.",
    frequency: "5 days/week",
    level: "Intermediate",
    days: [
      {
        weekday: 0,
        name: "Push",
        exercises: [
          { name: "Bench Press", sets: 3, reps: 8 },
          { name: "Dumbbell Shoulder Press", sets: 3, reps: 10 },
          { name: "Cable Crossover", sets: 3, reps: 12 },
          { name: "Skull Crusher", sets: 3, reps: 12 },
          { name: "Tricep Pushdown", sets: 3, reps: 12 },
        ],
      },
      {
        weekday: 1,
        name: "Pull",
        exercises: [
          { name: "Barbell Row", sets: 3, reps: 8 },
          { name: "Lat Pulldown", sets: 3, reps: 10 },
          { name: "Dumbbell Curl", sets: 3, reps: 12 },
          { name: "Hammer Curl", sets: 3, reps: 12 },
          { name: "Face Pull", sets: 3, reps: 15 },
        ],
      },
      {
        weekday: 2,
        name: "Legs",
        exercises: [
          { name: "Squat", sets: 3, reps: 8 },
          { name: "Romanian Deadlift", sets: 3, reps: 10 },
          { name: "Lunges", sets: 3, reps: 12 },
          { name: "Leg Curl", sets: 3, reps: 12 },
          { name: "Calf Raise", sets: 3, reps: 12 },
        ],
      },
      {
        weekday: 3,
        name: "Upper",
        exercises: [
          { name: "Pull-Up", sets: 3, reps: 8 },
          { name: "Incline Dumbbell Press", sets: 3, reps: 10 },
          { name: "Seated Cable Row", sets: 3, reps: 12 },
          { name: "Overhead Press", sets: 3, reps: 10 },
          { name: "Push-Up", sets: 2, reps: 15 },
        ],
      },
      {
        weekday: 4,
        name: "Lower",
        exercises: [
          { name: "Leg Press", sets: 3, reps: 10 },
          { name: "Romanian Deadlift", sets: 3, reps: 10 },
          { name: "Leg Extension", sets: 3, reps: 12 },
          { name: "Calf Raise", sets: 4, reps: 15 },
          { name: "Hanging Leg Raise", sets: 3, reps: 12 },
        ],
      },
    ],
  },
  {
    id: "phul",
    name: "PHUL (Power Hypertrophy)",
    description: "4-day Power Hypertrophy Upper Lower split. Heavy compound days build strength, hypertrophy days build size. Best of both worlds.",
    frequency: "4 days/week",
    level: "Intermediate",
    days: [
      {
        weekday: 0,
        name: "Upper Power",
        exercises: [
          { name: "Bench Press", sets: 4, reps: 5 },
          { name: "Incline Dumbbell Press", sets: 4, reps: 6 },
          { name: "Barbell Row", sets: 4, reps: 6 },
          { name: "Lat Pulldown", sets: 4, reps: 8 },
          { name: "Overhead Press", sets: 3, reps: 6 },
          { name: "Barbell Curl", sets: 3, reps: 8 },
          { name: "Skull Crusher", sets: 3, reps: 8 },
        ],
      },
      {
        weekday: 1,
        name: "Lower Power",
        exercises: [
          { name: "Squat", sets: 4, reps: 5 },
          { name: "Deadlift", sets: 4, reps: 5 },
          { name: "Leg Press", sets: 4, reps: 8 },
          { name: "Leg Curl", sets: 3, reps: 12 },
          { name: "Calf Raise", sets: 3, reps: 8 },
        ],
      },
      {
        weekday: 3,
        name: "Upper Hypertrophy",
        exercises: [
          { name: "Incline Bench Press", sets: 4, reps: 10 },
          { name: "Dumbbell Row", sets: 4, reps: 10 },
          { name: "Chest Fly", sets: 4, reps: 12 },
          { name: "Seated Cable Row", sets: 4, reps: 12 },
          { name: "Lateral Raise", sets: 4, reps: 15 },
          { name: "Dumbbell Curl", sets: 4, reps: 12 },
          { name: "Tricep Pushdown", sets: 4, reps: 12 },
        ],
      },
      {
        weekday: 4,
        name: "Lower Hypertrophy",
        exercises: [
          { name: "Front Squat", sets: 4, reps: 10 },
          { name: "Lunges", sets: 4, reps: 10 },
          { name: "Leg Curl", sets: 4, reps: 12 },
          { name: "Leg Extension", sets: 4, reps: 12 },
          { name: "Calf Raise", sets: 4, reps: 15 },
        ],
      },
    ],
  },
  {
    id: "full-body",
    name: "Full Body",
    description: "3-day full body program with compound lifts. Ideal for beginners or those short on time. Each muscle hit 3x per week.",
    frequency: "3 days/week",
    level: "Beginner",
    days: [
      {
        weekday: 0,
        name: "Full Body A",
        exercises: [
          { name: "Squat", sets: 4, reps: 8 },
          { name: "Bench Press", sets: 4, reps: 8 },
          { name: "Barbell Row", sets: 3, reps: 10 },
          { name: "Overhead Press", sets: 3, reps: 10 },
          { name: "Barbell Curl", sets: 2, reps: 12 },
          { name: "Plank", sets: 3, reps: 1 },
        ],
      },
      {
        weekday: 2,
        name: "Full Body B",
        exercises: [
          { name: "Deadlift", sets: 4, reps: 6 },
          { name: "Incline Dumbbell Press", sets: 3, reps: 10 },
          { name: "Pull-Up", sets: 3, reps: 8 },
          { name: "Lunges", sets: 3, reps: 12 },
          { name: "Lateral Raise", sets: 3, reps: 15 },
          { name: "Tricep Pushdown", sets: 2, reps: 12 },
        ],
      },
      {
        weekday: 4,
        name: "Full Body C",
        exercises: [
          { name: "Front Squat", sets: 3, reps: 8 },
          { name: "Dumbbell Bench Press", sets: 3, reps: 10 },
          { name: "Dumbbell Row", sets: 3, reps: 10 },
          { name: "Romanian Deadlift", sets: 3, reps: 10 },
          { name: "Face Pull", sets: 3, reps: 15 },
          { name: "Hammer Curl", sets: 2, reps: 12 },
        ],
      },
    ],
  },
  {
    id: "glute-focus",
    name: "Glute & Lower Body Focus",
    description: "4-day lower body emphasis split for women. Two heavy glute days with upper body maintenance. Built for weight gain and building curves.",
    frequency: "4 days/week",
    level: "Beginner - Intermediate",
    days: [
      {
        weekday: 0,
        name: "Glutes & Legs (Strength)",
        exercises: [
          { name: "Squat", sets: 4, reps: 8 },
          { name: "Romanian Deadlift", sets: 4, reps: 10 },
          { name: "Bulgarian Split Squat", sets: 3, reps: 10 },
          { name: "Leg Curl", sets: 3, reps: 12 },
          { name: "Lunges", sets: 3, reps: 12 },
          { name: "Calf Raise", sets: 3, reps: 15 },
        ],
      },
      {
        weekday: 1,
        name: "Upper Body",
        exercises: [
          { name: "Dumbbell Bench Press", sets: 3, reps: 10 },
          { name: "Barbell Row", sets: 3, reps: 10 },
          { name: "Overhead Press", sets: 3, reps: 10 },
          { name: "Lat Pulldown", sets: 3, reps: 12 },
          { name: "Dumbbell Curl", sets: 2, reps: 12 },
          { name: "Tricep Pushdown", sets: 2, reps: 12 },
        ],
      },
      {
        weekday: 3,
        name: "Glutes & Legs (Hypertrophy)",
        exercises: [
          { name: "Leg Press", sets: 4, reps: 12 },
          { name: "Deadlift", sets: 3, reps: 8 },
          { name: "Bulgarian Split Squat", sets: 3, reps: 12 },
          { name: "Leg Extension", sets: 3, reps: 12 },
          { name: "Leg Curl", sets: 3, reps: 12 },
          { name: "Lunges", sets: 3, reps: 15 },
        ],
      },
      {
        weekday: 4,
        name: "Upper Body & Core",
        exercises: [
          { name: "Incline Dumbbell Press", sets: 3, reps: 10 },
          { name: "Seated Cable Row", sets: 3, reps: 12 },
          { name: "Dumbbell Shoulder Press", sets: 3, reps: 10 },
          { name: "Face Pull", sets: 3, reps: 15 },
          { name: "Plank", sets: 3, reps: 1 },
          { name: "Hanging Leg Raise", sets: 3, reps: 12 },
        ],
      },
    ],
  },
  {
    id: "glute-sculpt",
    name: "Glute Sculpt (5-Day)",
    description: "5-day program with 3 lower body days targeting glutes from every angle. Designed for women who want maximum glute growth with balanced upper body.",
    frequency: "5 days/week",
    level: "Intermediate",
    days: [
      {
        weekday: 0,
        name: "Glutes & Hamstrings",
        exercises: [
          { name: "Romanian Deadlift", sets: 4, reps: 10 },
          { name: "Bulgarian Split Squat", sets: 4, reps: 10 },
          { name: "Leg Curl", sets: 4, reps: 12 },
          { name: "Lunges", sets: 3, reps: 12 },
          { name: "Calf Raise", sets: 3, reps: 15 },
        ],
      },
      {
        weekday: 1,
        name: "Upper Body Push & Pull",
        exercises: [
          { name: "Bench Press", sets: 3, reps: 10 },
          { name: "Barbell Row", sets: 3, reps: 10 },
          { name: "Overhead Press", sets: 3, reps: 10 },
          { name: "Lat Pulldown", sets: 3, reps: 12 },
          { name: "Lateral Raise", sets: 3, reps: 15 },
          { name: "Tricep Pushdown", sets: 2, reps: 12 },
        ],
      },
      {
        weekday: 2,
        name: "Quads & Glutes",
        exercises: [
          { name: "Squat", sets: 4, reps: 8 },
          { name: "Leg Press", sets: 4, reps: 12 },
          { name: "Front Squat", sets: 3, reps: 10 },
          { name: "Leg Extension", sets: 3, reps: 12 },
          { name: "Lunges", sets: 3, reps: 12 },
        ],
      },
      {
        weekday: 4,
        name: "Upper Body & Core",
        exercises: [
          { name: "Incline Dumbbell Press", sets: 3, reps: 10 },
          { name: "Dumbbell Row", sets: 3, reps: 10 },
          { name: "Dumbbell Shoulder Press", sets: 3, reps: 10 },
          { name: "Face Pull", sets: 3, reps: 15 },
          { name: "Cable Crunch", sets: 3, reps: 12 },
          { name: "Plank", sets: 3, reps: 1 },
        ],
      },
      {
        weekday: 5,
        name: "Glutes & Posterior Chain",
        exercises: [
          { name: "Deadlift", sets: 4, reps: 6 },
          { name: "Bulgarian Split Squat", sets: 4, reps: 10 },
          { name: "Romanian Deadlift", sets: 3, reps: 12 },
          { name: "Leg Curl", sets: 3, reps: 12 },
          { name: "Calf Raise", sets: 4, reps: 15 },
        ],
      },
    ],
  },
];

type PlanTemplatesProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (plan: {
    planName: string;
    days: {
      weekday: number;
      name?: string;
      exercises: {
        exerciseId: Id<"exercises">;
        exerciseName: string;
        order: number;
        sets: { repsTarget: number }[];
      }[];
    }[];
  }) => void;
};

export function PlanTemplates({
  open,
  onOpenChange,
  onSelectTemplate,
}: PlanTemplatesProps) {
  const exercises = useQuery(api.exercises.getAllExercises);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const findExerciseId = (name: string): Id<"exercises"> | null => {
    if (!exercises) return null;
    const found = exercises.find((e) => e.name === name);
    return found?._id ?? null;
  };

  const handleSelect = (template: Template) => {
    if (!exercises) return;

    const mappedDays = template.days.map((day) => ({
      weekday: day.weekday,
      name: day.name,
      exercises: day.exercises
        .map((ex, idx) => {
          const exerciseId = findExerciseId(ex.name);
          if (!exerciseId) return null;
          return {
            exerciseId,
            exerciseName: ex.name,
            order: idx,
            sets: Array.from({ length: ex.sets }, () => ({
              repsTarget: ex.reps,
            })),
          };
        })
        .filter(Boolean) as {
          exerciseId: Id<"exercises">;
          exerciseName: string;
          order: number;
          sets: { repsTarget: number }[];
        }[],
    }));

    onSelectTemplate({
      planName: template.name,
      days: mappedDays,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Workout Templates</DialogTitle>
          <DialogDescription>
            Pick a template and customize it to your needs
          </DialogDescription>
        </DialogHeader>

        {/* Templates List */}
        <div className="overflow-y-auto flex-1 space-y-3 pr-1">
          {TEMPLATES.map((template) => {
            const isExpanded = expandedTemplate === template.id;
            const totalExercises = template.days.reduce(
              (sum, d) => sum + d.exercises.length,
              0
            );

            return (
              <div
                key={template.id}
                className="border border-border rounded-lg overflow-hidden"
              >
                {/* Template Card Header */}
                <button
                  onClick={() =>
                    setExpandedTemplate(isExpanded ? null : template.id)
                  }
                  className="w-full text-left p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Dumbbell className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                            {template.frequency}
                          </span>
                          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                            {template.level}
                          </span>
                          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                            {totalExercises} exercises
                          </span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </button>

                {/* Expanded Preview */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                    {template.days.map((day) => (
                      <div key={day.weekday} className="space-y-1">
                        <h4 className="text-sm font-medium text-primary">
                          {day.name}
                        </h4>
                        <div className="space-y-0.5">
                          {day.exercises.map((ex, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-sm py-0.5"
                            >
                              <span className="text-muted-foreground">
                                {ex.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {ex.sets}&times;{ex.reps}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => handleSelect(template)}
                      disabled={!exercises}
                      className="btn btn-primary w-full mt-4"
                    >
                      <Check className="w-4 h-4" />
                      Use This Template
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
