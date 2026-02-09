"use client";

import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { Lock, Loader2, Settings2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface NutritionGoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DEFAULT_NUTRITION_GOALS = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
  fiber: 25,
  sugar: 50,
};

export function NutritionGoalsDialog({
  open,
  onOpenChange,
}: NutritionGoalsDialogProps) {
  const existingGoals = useQuery(api.nutrition.getNutritionGoals);
  const saveGoals = useMutation(api.nutrition.saveNutritionGoals);
  const userData = useQuery(api.users.getCurrentUser);
  const isPaidUser = userData?.isPaidUser === true;
  const generateGoals = useAction(api.nutritionAi.generateNutritionGoals);

  const [goals, setGoals] = useState(DEFAULT_NUTRITION_GOALS);
  const [saving, setSaving] = useState(false);
  const [showAiForm, setShowAiForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [aiForm, setAiForm] = useState({
    weightKg: 70,
    heightCm: 175,
    age: 25,
    sex: "male" as "male" | "female",
    activityLevel: "moderately_active" as
      | "sedentary"
      | "lightly_active"
      | "moderately_active"
      | "very_active"
      | "extremely_active",
    goal: "maintain" as "bulk" | "cut" | "maintain",
  });

  useEffect(() => {
    if (existingGoals) {
      setGoals({
        calories: existingGoals.calories,
        protein: existingGoals.protein,
        carbs: existingGoals.carbs,
        fat: existingGoals.fat,
        fiber: existingGoals.fiber ?? DEFAULT_NUTRITION_GOALS.fiber,
        sugar: existingGoals.sugar ?? DEFAULT_NUTRITION_GOALS.sugar,
      });
    }
  }, [existingGoals]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveGoals({
        calories: goals.calories,
        protein: goals.protein,
        carbs: goals.carbs,
        fat: goals.fat,
        fiber: goals.fiber,
        sugar: goals.sugar,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setAiError(null);
    setAiReasoning(null);
    try {
      const result = await generateGoals({
        weightKg: aiForm.weightKg,
        heightCm: aiForm.heightCm,
        age: aiForm.age,
        sex: aiForm.sex,
        activityLevel: aiForm.activityLevel,
        goal: aiForm.goal,
      });
      setGoals({
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        fiber: result.fiber,
        sugar: result.sugar,
      });
      setAiReasoning(result.reasoning);
      setShowAiForm(false);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Failed to generate goals");
    } finally {
      setGenerating(false);
    }
  };

  const fields = [
    { key: "calories" as const, label: "Calories", unit: "kcal" },
    { key: "protein" as const, label: "Protein", unit: "g" },
    { key: "carbs" as const, label: "Carbs", unit: "g" },
    { key: "fat" as const, label: "Fat", unit: "g" },
    { key: "fiber" as const, label: "Fiber", unit: "g" },
    { key: "sugar" as const, label: "Sugar", unit: "g" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Nutrition Goals</DialogTitle>
              <DialogDescription>
                Set your daily macro targets
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 mt-2 pr-1">
          <div className="space-y-4">
            {fields.map(({ key, label, unit }) => (
              <div key={key} className="flex items-center gap-3">
                <label className="text-sm font-medium w-20">{label}</label>
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    min={0}
                    value={goals[key]}
                    onChange={(e) =>
                      setGoals((prev) => ({
                        ...prev,
                        [key]: Number(e.target.value) || 0,
                      }))
                    }
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {unit}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            {!isPaidUser ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                <Lock className="w-4 h-4 flex-shrink-0" />
                <p className="text-xs font-medium">
                  Upgrade to Pro to generate goals with AI
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAiForm(!showAiForm)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {showAiForm ? "Hide AI Generator" : "Generate with AI"}
                </Button>

                {showAiForm && (
                  <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Weight (kg)
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={aiForm.weightKg}
                          onChange={(e) =>
                            setAiForm((prev) => ({
                              ...prev,
                              weightKg: Number(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Height (cm)
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={aiForm.heightCm}
                          onChange={(e) =>
                            setAiForm((prev) => ({
                              ...prev,
                              heightCm: Number(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Age
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={aiForm.age}
                          onChange={(e) =>
                            setAiForm((prev) => ({
                              ...prev,
                              age: Number(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">
                          Sex
                        </label>
                        <Select
                          value={aiForm.sex}
                          onValueChange={(val: "male" | "female") =>
                            setAiForm((prev) => ({ ...prev, sex: val }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">
                        Activity Level
                      </label>
                      <Select
                        value={aiForm.activityLevel}
                        onValueChange={(
                          val:
                            | "sedentary"
                            | "lightly_active"
                            | "moderately_active"
                            | "very_active"
                            | "extremely_active"
                        ) =>
                          setAiForm((prev) => ({
                            ...prev,
                            activityLevel: val,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sedentary">
                            Sedentary (little/no exercise)
                          </SelectItem>
                          <SelectItem value="lightly_active">
                            Lightly Active (1-3 days/week)
                          </SelectItem>
                          <SelectItem value="moderately_active">
                            Moderately Active (3-5 days/week)
                          </SelectItem>
                          <SelectItem value="very_active">
                            Very Active (6-7 days/week)
                          </SelectItem>
                          <SelectItem value="extremely_active">
                            Extremely Active (2x/day)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">
                        Goal
                      </label>
                      <Select
                        value={aiForm.goal}
                        onValueChange={(val: "bulk" | "cut" | "maintain") =>
                          setAiForm((prev) => ({ ...prev, goal: val }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bulk">Bulk (gain muscle)</SelectItem>
                          <SelectItem value="maintain">Maintain</SelectItem>
                          <SelectItem value="cut">Cut (lose fat)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleGenerate}
                      disabled={generating}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Goals
                        </>
                      )}
                    </Button>

                    {aiError && (
                      <p className="text-xs text-destructive">{aiError}</p>
                    )}
                  </div>
                )}

                {aiReasoning && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-medium text-foreground">
                        AI Reasoning:
                      </span>{" "}
                      {aiReasoning}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-4 pt-2 border-t">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Goals"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
