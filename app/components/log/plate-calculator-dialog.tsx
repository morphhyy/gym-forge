"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  calculatePlates,
  DEFAULT_BAR,
  formatWeightValue,
  parseWeight,
  PLATES,
} from "@/app/lib/workout-logger";

const PLATE_COLORS: Record<string, string> = {
  // IWF-ish colour coding, purely visual
  "25": "bg-red-500",
  "45": "bg-blue-500",
  "20": "bg-blue-500",
  "35": "bg-yellow-500",
  "15": "bg-yellow-500",
  "10": "bg-green-500",
  "5": "bg-zinc-200",
  "2.5": "bg-zinc-400",
  "1.25": "bg-zinc-500",
};

export function PlateCalculatorDialog({
  open,
  onOpenChange,
  exerciseName,
  units,
  initialWeight,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  units: "kg" | "lb";
  initialWeight: number | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Plate calculator</DialogTitle>
          <DialogDescription>{exerciseName}</DialogDescription>
        </DialogHeader>
        {/* Remount per open so the inputs start from the current set's weight */}
        {open && <PlateCalculatorBody units={units} initialWeight={initialWeight} />}
      </DialogContent>
    </Dialog>
  );
}

function PlateCalculatorBody({
  units,
  initialWeight,
}: {
  units: "kg" | "lb";
  initialWeight: number | null;
}) {
  const [target, setTarget] = useState(initialWeight ? String(initialWeight) : "");
  const [bar, setBar] = useState(String(DEFAULT_BAR[units]));

  const targetValue = parseWeight(target);
  const barValue = parseWeight(bar) ?? DEFAULT_BAR[units];
  const result = targetValue !== null ? calculatePlates(targetValue, barValue, PLATES[units]) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="block text-muted-foreground mb-1">Target ({units})</span>
          <input
            type="text"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="input min-h-11 text-center text-lg"
            autoFocus
          />
        </label>
        <label className="text-sm">
          <span className="block text-muted-foreground mb-1">Bar ({units})</span>
          <input
            type="text"
            inputMode="decimal"
            value={bar}
            onChange={(e) => setBar(e.target.value)}
            className="input min-h-11 text-center text-lg"
          />
        </label>
      </div>

      {result && targetValue !== null && (
        <div className="rounded-xl bg-card border border-border p-4">
          {targetValue < barValue ? (
            <p className="text-sm text-muted-foreground text-center">
              Target is lighter than the bar.
            </p>
          ) : result.perSide.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">Just the bar.</p>
          ) : (
            <>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                Per side
              </p>
              {/* Visual bar: sleeve + plates */}
              <div className="flex items-center h-20 mb-3" aria-hidden>
                <div className="h-2 w-8 bg-zinc-500 rounded-l" />
                <div className="h-4 w-1.5 bg-zinc-400" />
                {result.perSide.map((plate, i) => {
                  const heavy = plate >= (units === "kg" ? 15 : 35);
                  const mid = plate >= (units === "kg" ? 5 : 10);
                  return (
                    <div
                      key={i}
                      className={`${PLATE_COLORS[String(plate)] ?? "bg-zinc-400"} w-3 mx-px rounded-sm ${
                        heavy ? "h-20" : mid ? "h-14" : "h-9"
                      }`}
                    />
                  );
                })}
                <div className="h-2 flex-1 bg-zinc-500 rounded-r" />
              </div>
              <p className="text-lg font-semibold tabular-nums">
                {groupPlates(result.perSide)
                  .map(([plate, count]) => `${count} × ${formatWeightValue(plate)}`)
                  .join("  +  ")}
              </p>
            </>
          )}
          {result.remainder > 0 && (
            <p className="text-sm text-orange-500 mt-2">
              Closest: {formatWeightValue(result.loaded)} {units} (
              {formatWeightValue(result.remainder)} {units} short)
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function groupPlates(perSide: number[]): [number, number][] {
  const counts = new Map<number, number>();
  for (const p of perSide) counts.set(p, (counts.get(p) ?? 0) + 1);
  return Array.from(counts.entries());
}
