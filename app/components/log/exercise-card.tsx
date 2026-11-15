"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Calculator,
  Dumbbell,
  History,
  MoreVertical,
  Plus,
  Repeat,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatWeightValue,
  isBarbellExercise,
  parseWeight,
  SET_TYPE_META,
} from "@/app/lib/workout-logger";
import { ProgressionHint } from "@/app/components/progression-hint";
import type { NextTarget } from "@/convex/lib/progression";
import { PlateCalculatorDialog } from "./plate-calculator-dialog";
import { SetRow, type SetRowProps } from "./set-row";
import {
  setKey,
  type LastTime,
  type LoggedSet,
  type LoggerExercise,
  type SetDraft,
} from "./types";

type RowHandlers = Pick<
  SetRowProps,
  "registerWeightInput" | "onDraftChange" | "onComplete" | "onMetaChange" | "onDelete"
>;

export interface ExerciseCardProps extends RowHandlers {
  entry: LoggerExercise;
  logged: Map<string, LoggedSet>;
  drafts: Record<string, SetDraft>;
  savingKeys: ReadonlySet<string>;
  lastTime?: LastTime;
  /** Next-session target from the progression engine. */
  target?: NextTarget | null;
  /** Pre-fill this exercise's unlogged sets with the target. */
  onApplyTarget?: (exerciseId: LoggerExercise["exerciseId"], weight: number, reps: number) => void;
  units: "kg" | "lb";
  disabled: boolean;
  onAddSet: (exerciseId: LoggerExercise["exerciseId"]) => void;
  onSwap: (exerciseId: LoggerExercise["exerciseId"]) => void;
  onRemove: (exerciseId: LoggerExercise["exerciseId"]) => void;
}

export function ExerciseCard({
  entry,
  logged,
  drafts,
  savingKeys,
  lastTime,
  target,
  onApplyTarget,
  units,
  disabled,
  onAddSet,
  onSwap,
  onRemove,
  ...rowHandlers
}: ExerciseCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [platesOpen, setPlatesOpen] = useState(false);
  const exercise = entry.exercise;
  const exerciseId = entry.exerciseId;
  const loggedCount = entry.sets.filter((_, i) => logged.has(setKey(exerciseId, i))).length;
  const isBarbell = isBarbellExercise(exercise?.equipment);

  // Weight to seed the plate calculator: first unlogged row's value
  const plateSeed = (() => {
    for (let i = 0; i < entry.sets.length; i++) {
      const key = setKey(exerciseId, i);
      if (logged.has(key)) continue;
      const typed = parseWeight(drafts[key]?.weight);
      return typed ?? lastTime?.sets.find((s) => s.setIndex === i)?.weight ?? null;
    }
    return logged.get(setKey(exerciseId, entry.sets.length - 1))?.weight ?? null;
  })();

  return (
    <div data-exercise-id={exerciseId}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-primary-muted rounded-xl flex items-center justify-center shrink-0">
          <Dumbbell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold leading-tight">{exercise?.name ?? "Unknown exercise"}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {exercise?.muscleGroup}
            {exercise?.equipment && ` • ${exercise.equipment}`}
            {entry.swappedFromName && ` • swapped for ${entry.swappedFromName}`}
            {!entry.planExerciseId && !entry.swappedFromName && " • added"}
          </p>
        </div>

        {!disabled && (
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="h-11 w-11 -mr-2 -mt-1 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card-hover shrink-0"
            aria-label={`${exercise?.name ?? "Exercise"} options`}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Next target: own row so it never squeezes the exercise name on phones */}
      {target && !disabled && (
        <ProgressionHint
          exerciseId={entry.exerciseId}
          target={target}
          units={units}
          compact
          className="mb-3"
          onApply={
            onApplyTarget
              ? ({ weight, reps }) => onApplyTarget(entry.exerciseId, weight, reps)
              : undefined
          }
        />
      )}

      {/* Last time */}
      {lastTime && lastTime.sets.length > 0 && (
        <p className="text-xs text-muted-foreground mb-2 flex items-start gap-1.5">
          <History className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden />
          <span>
            <span className="font-medium">
              Last ({format(new Date(lastTime.date + "T00:00:00"), "MMM d")}):
            </span>{" "}
            <span className="tabular-nums">
              {lastTime.sets
                .map((s) => {
                  const short = s.setType ? SET_TYPE_META[s.setType].short : null;
                  return `${short ? short + " " : ""}${formatWeightValue(s.weight)}×${s.reps}${
                    s.rpe ? ` @${s.rpe}` : ""
                  }`;
                })
                .join(", ")}
            </span>
          </span>
        </p>
      )}

      {/* Sets */}
      <div className="grid grid-cols-[2.75rem_1fr_1fr_2.75rem_2.75rem] gap-2 px-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span className="text-center">Set</span>
        <span className="text-center">{units}</span>
        <span className="text-center">Reps</span>
        <span className="text-center">RPE</span>
        <span className="text-center">Done</span>
      </div>
      <div>
        {entry.sets.map((row, setIndex) => {
          const key = setKey(exerciseId, setIndex);
          return (
            <SetRow
              key={key}
              exerciseId={exerciseId}
              setIndex={setIndex}
              repsTarget={row.repsTarget}
              logged={logged.get(key)}
              draft={drafts[key]}
              lastSet={lastTime?.sets.find((s) => s.setIndex === setIndex) ?? lastTime?.sets.at(-1)}
              units={units}
              disabled={disabled}
              saving={savingKeys.has(key)}
              canDelete={entry.sets.length > 1 || loggedCount > 0}
              {...rowHandlers}
            />
          );
        })}
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={() => onAddSet(exerciseId)}
          className="btn btn-ghost w-full min-h-11 mt-1 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add set
        </button>
      )}

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{exercise?.name ?? "Exercise"}</DialogTitle>
            <DialogDescription>Changes apply to this workout only.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {isBarbell && (
              <MenuButton
                icon={<Calculator className="w-4 h-4" />}
                label="Plate calculator"
                onClick={() => {
                  setMenuOpen(false);
                  setPlatesOpen(true);
                }}
              />
            )}
            <MenuButton
              icon={<Repeat className="w-4 h-4" />}
              label="Swap exercise"
              hint={loggedCount > 0 ? "Remove logged sets first" : undefined}
              disabled={loggedCount > 0}
              onClick={() => {
                setMenuOpen(false);
                onSwap(exerciseId);
              }}
            />
            <MenuButton
              icon={<Trash2 className="w-4 h-4" />}
              label="Remove from workout"
              danger
              onClick={() => {
                if (
                  loggedCount > 0 &&
                  !window.confirm(`Remove ${exercise?.name ?? "this exercise"} and its ${loggedCount} logged set(s)?`)
                ) {
                  return;
                }
                setMenuOpen(false);
                onRemove(exerciseId);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {isBarbell && (
        <PlateCalculatorDialog
          open={platesOpen}
          onOpenChange={setPlatesOpen}
          exerciseName={exercise?.name ?? ""}
          units={units}
          initialWeight={plateSeed}
        />
      )}
    </div>
  );
}

function MenuButton({
  icon,
  label,
  hint,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn w-full min-h-12 justify-start ${danger ? "btn-danger" : "btn-secondary"}`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </button>
  );
}
