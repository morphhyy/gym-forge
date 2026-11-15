"use client";

import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { RPE_OPTIONS, SET_TYPE_META, type SetType } from "@/app/lib/workout-logger";

const RPE_HINTS: Record<number, string> = {
  6: "4+ reps left",
  7: "3 reps left",
  8: "2 reps left",
  9: "1 rep left",
  10: "Max effort",
};

export function RpePickerDialog({
  open,
  onOpenChange,
  value,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: number | undefined;
  onPick: (rpe: number | undefined) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rate of perceived exertion</DialogTitle>
          <DialogDescription>How hard was this set?</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {RPE_OPTIONS.map((rpe) => (
            <button
              key={rpe}
              type="button"
              onClick={() => {
                onPick(rpe);
                onOpenChange(false);
              }}
              className={cn(
                "min-h-14 rounded-lg border text-center transition-colors",
                value === rpe
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:bg-card-hover"
              )}
            >
              <span className="block text-lg font-semibold tabular-nums">{rpe}</span>
              {RPE_HINTS[rpe] && (
                <span
                  className={cn(
                    "block text-[10px] leading-tight",
                    value === rpe ? "opacity-80" : "text-muted-foreground"
                  )}
                >
                  {RPE_HINTS[rpe]}
                </span>
              )}
            </button>
          ))}
        </div>
        {value !== undefined && (
          <button
            type="button"
            className="btn btn-ghost min-h-11 w-full"
            onClick={() => {
              onPick(undefined);
              onOpenChange(false);
            }}
          >
            Clear RPE
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function SetMenuDialog({
  open,
  onOpenChange,
  setNumber,
  setType,
  onSetType,
  onDelete,
  canDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setNumber: number;
  setType: SetType;
  onSetType: (type: SetType) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Set {setNumber}</DialogTitle>
          <DialogDescription>
            Warm-up sets don&apos;t count towards volume or PRs.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SET_TYPE_META) as SetType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onSetType(type);
                onOpenChange(false);
              }}
              className={cn(
                "min-h-12 rounded-lg border px-3 text-sm font-medium flex items-center gap-2 transition-colors",
                setType === type
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:bg-card-hover"
              )}
            >
              <span className="w-6 h-6 rounded-full bg-background/20 inline-flex items-center justify-center text-xs font-bold">
                {SET_TYPE_META[type].short ?? setNumber}
              </span>
              {SET_TYPE_META[type].label}
            </button>
          ))}
        </div>
        {canDelete && (
          <button
            type="button"
            className="btn btn-danger min-h-11 w-full"
            onClick={() => {
              onDelete();
              onOpenChange(false);
            }}
          >
            <Trash2 className="w-4 h-4" />
            Remove set
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
