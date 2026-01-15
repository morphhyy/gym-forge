"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Search, Plus, Check, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExerciseSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exerciseId: Id<"exercises">, exerciseName: string) => void;
}

export function ExerciseSelector({
  open,
  onOpenChange,
  onSelect,
}: ExerciseSelectorProps) {
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newMuscleGroup, setNewMuscleGroup] = useState("");

  const exercises = useQuery(api.exercises.getAllExercises);
  const createExercise = useMutation(api.exercises.createExercise);

  const muscleGroups = useMemo(() => {
    if (!exercises) return [];
    const groups = new Set(
      exercises
        .map((e: { muscleGroup?: string }) => e.muscleGroup)
        .filter(Boolean)
    );
    return Array.from(groups).sort() as string[];
  }, [exercises]);

  type Exercise = {
    _id: string;
    name: string;
    muscleGroup?: string;
    equipment?: string;
  };

  const filteredExercises = useMemo(() => {
    if (!exercises) return [] as Exercise[];
    const searchLower = search.toLowerCase();
    return (exercises as Exercise[]).filter(
      (e: Exercise) =>
        e.name.toLowerCase().includes(searchLower) ||
        e.muscleGroup?.toLowerCase().includes(searchLower) ||
        e.equipment?.toLowerCase().includes(searchLower)
    );
  }, [exercises, search]);

  const groupedExercises = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};
    for (const exercise of filteredExercises) {
      const group = exercise.muscleGroup || "Other";
      if (!groups[group]) groups[group] = [];
      groups[group].push(exercise);
    }
    return groups;
  }, [filteredExercises]);

  const handleCreate = async () => {
    if (!newExerciseName.trim()) return;

    try {
      const id = await createExercise({
        name: newExerciseName.trim(),
        muscleGroup: newMuscleGroup || undefined,
      });
      toast.success("Exercise created successfully!");
      onSelect(id, newExerciseName.trim());
      onOpenChange(false);
      resetForm();
    } catch {
      toast.error("Failed to create exercise. Please try again.");
    }
  };

  const handleSelect = (exerciseId: Id<"exercises">, exerciseName: string) => {
    onSelect(exerciseId, exerciseName);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setSearch("");
    setShowCreateForm(false);
    setNewExerciseName("");
    setNewMuscleGroup("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Exercise</DialogTitle>
        </DialogHeader>

        {!showCreateForm ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search exercises..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
              {exercises === undefined ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredExercises.length === 0 ? (
                <div className="text-center py-8">
                  <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No exercises found</p>
                  <Button
                    onClick={() => {
                      setShowCreateForm(true);
                      setNewExerciseName(search);
                    }}
                    className="mt-4"
                  >
                    <Plus className="w-4 h-4" />
                    Create &quot;{search}&quot;
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedExercises).map(
                    ([group, groupExercises]) => (
                      <div key={group}>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          {group}
                        </h3>
                        <div className="space-y-1">
                          {groupExercises.map((exercise: Exercise) => (
                            <button
                              key={exercise._id}
                              onClick={() =>
                                handleSelect(
                                  exercise._id as Id<"exercises">,
                                  exercise.name
                                )
                              }
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left group"
                            >
                              <div>
                                <span className="font-medium">
                                  {exercise.name}
                                </span>
                                {exercise.equipment && (
                                  <span className="text-muted-foreground text-sm ml-2">
                                    ({exercise.equipment})
                                  </span>
                                )}
                              </div>
                              <Check className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Create New Button */}
            <div className="pt-4 border-t">
              <Button
                onClick={() => setShowCreateForm(true)}
                variant="secondary"
                className="w-full"
              >
                <Plus className="w-4 h-4" />
                Create Custom Exercise
              </Button>
            </div>
          </>
        ) : (
          /* Create Form */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Exercise Name
              </label>
              <Input
                type="text"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                placeholder="e.g., Incline Dumbbell Curl"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Muscle Group (optional)
              </label>
              <Select value={newMuscleGroup} onValueChange={setNewMuscleGroup}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select muscle group" />
                </SelectTrigger>
                <SelectContent>
                  {muscleGroups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setShowCreateForm(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newExerciseName.trim()}
                className="flex-1"
              >
                Create & Add
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
