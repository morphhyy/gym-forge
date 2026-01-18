"use client";

import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useAction, useQuery } from "convex/react";
import {
  AlertCircle,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { getDayName } from "@/app/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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

interface AIPlanGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanGenerated: (plan: GeneratedPlan) => void;
}

const promptSuggestions = [
  {
    title: "Beginner Full Body",
    prompt:
      "Create a 3-day full body workout plan for a complete beginner. Focus on learning basic compound movements with moderate volume.",
    icon: "🌱",
  },
  {
    title: "Home Workout",
    prompt:
      "Create a 3-day full body home workout plan using only dumbbells and bodyweight exercises. Focus on general fitness and core strength.",
    icon: "🏠",
  },
  {
    title: "Strength Focus",
    prompt:
      "Create a 4-day upper/lower split focused on building strength. Emphasize compound lifts with lower reps (5-8) and adequate rest days.",
    icon: "🏋️",
  },
  {
    title: "Quick Workouts",
    prompt:
      "Create a 4-day workout plan with short but intense sessions (3-4 exercises each). Good for busy professionals with limited time.",
    icon: "⚡",
  },
];

export function AIPlanGenerator({
  open,
  onOpenChange,
  onPlanGenerated,
}: AIPlanGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(
    null
  );

  const { userId } = useAuth();
  const generatePlan = useAction(api.ai.generateWorkoutPlan);
  const aiUsage = useQuery(api.users.getAIUsage);

  const handleGenerate = async () => {
    if (!prompt.trim() || !userId) return;

    setIsGenerating(true);
    setError(null);

    try {
      const plan = await generatePlan({ prompt: prompt.trim(), userId });
      setGeneratedPlan(plan as GeneratedPlan);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate plan";
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    await handleGenerate();
  };

  const handleApprove = () => {
    if (!generatedPlan) return;
    // Usage is already incremented server-side during generation
    onPlanGenerated(generatedPlan);
    onOpenChange(false);
    resetState();
  };

  const handleSuggestionClick = (suggestionPrompt: string) => {
    setPrompt(suggestionPrompt);
  };

  const resetState = () => {
    setPrompt("");
    setGeneratedPlan(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle>AI Plan Generator</DialogTitle>
              <DialogDescription>
                Describe your goals and let AI create your plan
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Usage Info */}
          {aiUsage && (
            <div
              className={`p-4 rounded-lg border ${
                aiUsage.isLimitReached
                  ? "bg-destructive/10 border-destructive/30"
                  : "bg-primary/10 border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {aiUsage.isLimitReached ? (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-primary" />
                  )}
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        aiUsage.isLimitReached
                          ? "text-destructive"
                          : "text-primary"
                      }`}
                    >
                      {aiUsage.isLimitReached
                        ? "Limit Reached"
                        : `${aiUsage.remaining} of ${aiUsage.limit} free AI plans remaining`}
                    </p>
                    {!aiUsage.isLimitReached && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        You&apos;ve used {aiUsage.usageCount} AI generation
                        {aiUsage.usageCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Limit Reached Message */}
          {aiUsage?.isLimitReached && (
            <div className="p-4 rounded-lg bg-card border">
              <p className="text-sm text-muted-foreground">
                You&apos;ve reached the free limit of {aiUsage.limit}{" "}
                AI-generated plans. You can still create workout plans manually
                using the &quot;Create Manually&quot; option.
              </p>
            </div>
          )}

          {/* Quick Suggestions */}
          {!aiUsage?.isLimitReached && (
            <div>
              <p className="text-sm font-medium mb-3 text-muted-foreground">
                Quick suggestions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {promptSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.title}
                    onClick={() => handleSuggestionClick(suggestion.prompt)}
                    disabled={isGenerating}
                    className="text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{suggestion.icon}</span>
                      <span className="font-medium text-sm">
                        {suggestion.title}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt Input */}
          {!aiUsage?.isLimitReached && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Describe your ideal workout plan
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., I'm an intermediate lifter looking to build muscle. I can train 5 days a week and want to focus on upper body while maintaining legs. I prefer compound movements and have about 60 minutes per session."
                rows={5}
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Include details like: experience level, days available, goals,
                time per session, preferred exercises
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Generation Status */}
          {isGenerating && (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <div className="text-center">
                <p className="font-medium">
                  Generating your personalized plan...
                </p>
                <p className="text-sm text-muted-foreground">
                  This may take a few seconds
                </p>
              </div>
            </div>
          )}

          {/* Generated Plan Preview */}
          {generatedPlan && !isGenerating && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <h3 className="font-semibold text-lg mb-2">
                  {generatedPlan.planName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {generatedPlan.description}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Weekly Schedule</h4>
                <div className="grid gap-3">
                  {generatedPlan.days.map((day) => (
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

              <div className="p-3 rounded-lg bg-muted border">
                <p className="text-xs text-muted-foreground">
                  Review the plan above. You can regenerate if you&apos;d like
                  changes, or approve to use this plan. Usage count only
                  increments when you approve.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t flex gap-3">
          {generatedPlan ? (
            <>
              <Button
                onClick={() => {
                  setGeneratedPlan(null);
                  setError(null);
                }}
                disabled={isGenerating}
                variant="secondary"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleRegenerate}
                disabled={isGenerating || aiUsage?.isLimitReached}
                variant="secondary"
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </>
                )}
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isGenerating}
                className="flex-1 btn-ai"
              >
                <Check className="w-4 h-4" />
                Approve Plan
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => onOpenChange(false)}
                disabled={isGenerating}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={
                  !prompt.trim() || isGenerating || aiUsage?.isLimitReached
                }
                className="flex-1 btn-ai"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Generate Plan
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
