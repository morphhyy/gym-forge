"use client";

import { ArrowDown, ArrowUp, Plus, Sparkles } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import type { NextTarget, ProgressionAction } from "@/convex/lib/progression";
import { cn } from "@/app/lib/utils";

export interface ProgressionHintProps {
  exerciseId: Id<"exercises"> | string;
  /** Entry from `api.progression.getNextTargets` (undefined while loading). */
  target: NextTarget | undefined | null;
  units?: "kg" | "lb";
  /** Optional: pre-fill the logger with the suggested weight/reps. */
  onApply?: (target: { exerciseId: string; weight: number; reps: number }) => void;
  compact?: boolean;
  className?: string;
}

const STYLES: Record<
  ProgressionAction,
  { label: string; icon: typeof ArrowUp; tone: string }
> = {
  increase_load: { label: "Add weight", icon: ArrowUp, tone: "text-primary bg-primary-muted border-primary/30" },
  add_reps: { label: "Add reps", icon: Plus, tone: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
  deload: { label: "Deload", icon: ArrowDown, tone: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  start: { label: "First time", icon: Sparkles, tone: "text-muted-foreground bg-card border-border" },
};

function formatWeight(weight: number): string {
  return String(Math.round(weight * 100) / 100);
}

/**
 * Shows the next double-progression target for one exercise.
 * Purely presentational: the parent fetches targets in one batch with
 * `useQuery(api.progression.getNextTargets, { exerciseIds })`.
 */
export function ProgressionHint({
  exerciseId,
  target,
  units = "kg",
  onApply,
  compact = false,
  className,
}: ProgressionHintProps) {
  if (!target) return null;

  const style = STYLES[target.action];
  const Icon = style.icon;
  const canApply = onApply && target.weight !== null;
  const headline =
    target.weight === null
      ? `${target.repRange.min}–${target.repRange.max} reps`
      : target.weight === 0
        ? `Bodyweight × ${target.reps}`
        : `${formatWeight(target.weight)} ${units} × ${target.reps}`;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-2 text-sm",
        style.tone,
        className
      )}
      data-testid="progression-hint"
      data-action={target.action}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">
          <span className="sr-only">{style.label}: </span>
          Next: {headline}
          <span className="ml-2 text-xs font-normal opacity-80">{style.label}</span>
        </p>
        {!compact && (
          <p className="text-xs text-muted-foreground mt-0.5">{target.reason}</p>
        )}
      </div>
      {canApply && (
        <button
          type="button"
          onClick={() =>
            onApply({
              exerciseId: String(exerciseId),
              weight: target.weight as number,
              reps: target.reps,
            })
          }
          className="shrink-0 rounded-md border border-current/30 px-2 py-1 text-xs font-medium hover:bg-foreground/5 transition-colors"
        >
          Use
        </button>
      )}
    </div>
  );
}
