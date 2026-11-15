"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatWeightValue, SET_TYPE_META, type SetType } from "@/app/lib/workout-logger";
import { RpePickerDialog, SetMenuDialog } from "./set-dialogs";
import { resolveSetValues, type LastTimeSet, type LoggedSet, type SetDraft } from "./types";

const SET_TYPE_BADGE: Record<SetType, string> = {
  normal: "bg-background text-foreground",
  warmup: "bg-amber-500/15 text-amber-500",
  drop: "bg-purple-500/15 text-purple-400",
  failure: "bg-red-500/15 text-red-400",
};

export interface SetRowProps {
  exerciseId: string;
  setIndex: number;
  repsTarget?: number;
  logged?: LoggedSet;
  draft?: SetDraft;
  lastSet?: LastTimeSet;
  units: "kg" | "lb";
  disabled: boolean;
  saving: boolean;
  canDelete: boolean;
  registerWeightInput: (key: string, el: HTMLInputElement | null) => void;
  onDraftChange: (exerciseId: string, setIndex: number, patch: Partial<SetDraft>) => void;
  onComplete: (exerciseId: string, setIndex: number) => void;
  /** Set type / RPE changes: saved immediately when the set is already logged. */
  onMetaChange: (
    exerciseId: string,
    setIndex: number,
    patch: { setType?: SetType; rpe?: number | null }
  ) => void;
  onDelete: (exerciseId: string, setIndex: number) => void;
}

export function SetRow({
  exerciseId,
  setIndex,
  repsTarget,
  logged,
  draft,
  lastSet,
  units,
  disabled,
  saving,
  canDelete,
  registerWeightInput,
  onDraftChange,
  onComplete,
  onMetaChange,
  onDelete,
}: SetRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [rpeOpen, setRpeOpen] = useState(false);

  const suggestedReps = repsTarget ?? lastSet?.reps;
  const values = resolveSetValues({
    draft,
    logged,
    suggestedWeight: lastSet?.weight,
    suggestedReps,
  });
  const isDone = !!logged && !draft;
  const isDirty = !!logged && !!draft;
  const canSave = values.weight !== null && values.reps !== null && !saving;
  const setNumber = setIndex + 1;
  const typeShort = SET_TYPE_META[values.setType].short;
  const key = `${exerciseId}-${setIndex}`;

  return (
    <div
      className={cn(
        "grid grid-cols-[2.75rem_1fr_1fr_2.75rem_2.75rem] items-center gap-2 py-1.5 px-1 -mx-1 rounded-lg transition-colors",
        isDone && "bg-primary/5"
      )}
    >
      {/* Set number / type — tap for set options */}
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        disabled={disabled}
        aria-label={`Set ${setNumber} options (${SET_TYPE_META[values.setType].label})`}
        className={cn(
          "h-11 w-11 rounded-full inline-flex items-center justify-center text-sm font-semibold disabled:opacity-100",
          SET_TYPE_BADGE[values.setType]
        )}
      >
        {typeShort ?? setNumber}
      </button>

      <input
        ref={(el) => registerWeightInput(key, el)}
        type="text"
        inputMode="decimal"
        enterKeyHint="next"
        autoComplete="off"
        aria-label={`Set ${setNumber} weight (${units})`}
        value={values.weightText}
        onChange={(e) => onDraftChange(exerciseId, setIndex, { weight: e.target.value })}
        disabled={disabled}
        placeholder={lastSet ? formatWeightValue(lastSet.weight) : units}
        className="input h-11 text-center text-base tabular-nums px-1"
      />

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="done"
        autoComplete="off"
        aria-label={`Set ${setNumber} reps`}
        value={values.repsText}
        onChange={(e) => onDraftChange(exerciseId, setIndex, { reps: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSave) {
            e.currentTarget.blur();
            onComplete(exerciseId, setIndex);
          }
        }}
        disabled={disabled}
        placeholder={suggestedReps !== undefined ? String(suggestedReps) : "reps"}
        className="input h-11 text-center text-base tabular-nums px-1"
      />

      <button
        type="button"
        onClick={() => setRpeOpen(true)}
        disabled={disabled}
        aria-label={values.rpe !== undefined ? `RPE ${values.rpe}, change` : "Set RPE"}
        className={cn(
          "h-11 w-11 rounded-lg border text-xs font-semibold tabular-nums disabled:opacity-60",
          values.rpe !== undefined
            ? "border-primary/40 text-primary bg-primary/10"
            : "border-border text-muted-foreground"
        )}
      >
        {values.rpe ?? "RPE"}
      </button>

      {disabled ? (
        <span
          className={cn(
            "h-11 w-11 inline-flex items-center justify-center",
            isDone ? "text-primary" : "text-muted-foreground/40"
          )}
          aria-label={isDone ? "Logged" : "Not logged"}
        >
          <Check className="w-5 h-5" />
        </span>
      ) : (
        <button
          type="button"
          onClick={() => !isDone && canSave && onComplete(exerciseId, setIndex)}
          disabled={!isDone && !canSave}
          aria-pressed={isDone}
          aria-label={isDone ? `Set ${setNumber} logged` : isDirty ? `Update set ${setNumber}` : `Log set ${setNumber}`}
          className={cn(
            "h-11 w-11 rounded-lg inline-flex items-center justify-center transition-colors",
            isDone
              ? "bg-primary text-primary-foreground"
              : isDirty
                ? "bg-primary/20 text-primary border border-primary/50"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border-hover"
          )}
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
        </button>
      )}

      <SetMenuDialog
        open={menuOpen}
        onOpenChange={setMenuOpen}
        setNumber={setNumber}
        setType={values.setType}
        onSetType={(type) => onMetaChange(exerciseId, setIndex, { setType: type })}
        onDelete={() => onDelete(exerciseId, setIndex)}
        canDelete={canDelete}
      />
      <RpePickerDialog
        open={rpeOpen}
        onOpenChange={setRpeOpen}
        value={values.rpe}
        onPick={(rpe) => onMetaChange(exerciseId, setIndex, { rpe: rpe ?? null })}
      />
    </div>
  );
}
