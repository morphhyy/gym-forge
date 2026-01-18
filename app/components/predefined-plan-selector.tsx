"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  PREDEFINED_PLANS,
  PredefinedPlan,
} from "@/app/lib/predefined-plans";
import { getDayName } from "@/app/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ClipboardList,
} from "lucide-react";

interface GeneratedPlan {
  planName: string;
  description: string;
  days: {
    weekday: number;
    name?: string;
    exercises: {
      exerciseId: string;
      exerciseName: string;
      sets: { repsTarget: number; notes?: string }[];
    }[];
  }[];
}

interface PredefinedPlanSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanSelected: (plan: GeneratedPlan) => void;
}

export function PredefinedPlanSelector({
  open,
  onOpenChange,
  onPlanSelected,
}: PredefinedPlanSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<PredefinedPlan | null>(null);
  const exercises = useQuery(api.exercises.getAllExercises);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedPlan(null);
    }
    onOpenChange(isOpen);
  };

  const handleSelectPlan = (plan: PredefinedPlan) => {
    setSelectedPlan(plan);
  };

  const handleUsePlan = () => {
    if (!selectedPlan || !exercises) return;

    // Create exercise name to ID mapping
    const exerciseMap = new Map<string, Id<"exercises">>();
    for (const ex of exercises) {
      exerciseMap.set(ex.name.toLowerCase(), ex._id);
    }

    // Convert predefined plan to GeneratedPlan format with exercise IDs
    const convertedPlan: GeneratedPlan = {
      planName: selectedPlan.name,
      description: selectedPlan.description,
      days: selectedPlan.days.map((day) => ({
        weekday: day.weekday,
        name: day.name,
        exercises: day.exercises
          .map((ex) => {
            const exerciseId = exerciseMap.get(ex.exerciseName.toLowerCase());
            if (!exerciseId) {
              console.warn(`Exercise not found: ${ex.exerciseName}`);
              return null;
            }
            return {
              exerciseId: exerciseId as string,
              exerciseName: ex.exerciseName,
              sets: ex.sets,
            };
          })
          .filter((ex): ex is NonNullable<typeof ex> => ex !== null),
      })),
    };

    onPlanSelected(convertedPlan);
    onOpenChange(false);
  };

  const isLoading = exercises === undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle>
                {selectedPlan ? selectedPlan.name : "Choose a Template"}
              </DialogTitle>
              <DialogDescription>
                {selectedPlan
                  ? "Review the plan and use it to start your training"
                  : "Select a pre-built workout plan to get started quickly"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedPlan ? (
            // Plan Preview
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <h3 className="font-semibold text-lg mb-2">
                  <span className="mr-2">{selectedPlan.icon}</span>
                  {selectedPlan.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedPlan.description}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Weekly Schedule</h4>
                <div className="grid gap-3">
                  {selectedPlan.days.map((day) => (
                    <div
                      key={day.weekday}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-sm">
                            {getDayName(day.weekday)}
                          </span>
                          {day.name && (
                            <span className="text-xs text-primary ml-2">
                              {day.name}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {day.exercises.length} exercise
                          {day.exercises.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {day.exercises.length > 0 ? (
                        <div className="space-y-1.5 mt-2">
                          {day.exercises.map((exercise, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0"
                            >
                              <span className="text-muted-foreground">
                                {exercise.exerciseName}
                              </span>
                              <span className="text-muted-foreground">
                                {exercise.sets.length}×
                                {exercise.sets[0]?.repsTarget} reps
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          Rest Day
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Plan Selection Grid
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PREDEFINED_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan)}
                  className="text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{plan.icon}</span>
                    <span className="font-medium text-sm">{plan.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {plan.description}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t flex gap-3">
          {selectedPlan ? (
            <>
              <Button
                onClick={() => setSelectedPlan(null)}
                variant="secondary"
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={handleUsePlan}
                className="flex-1 btn-template"
              >
                <ClipboardList className="w-4 h-4" />
                Use This Plan
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onOpenChange(false)}
              variant="secondary"
              className="w-full"
            >
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
