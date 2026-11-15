"use client";

import { Timer, SkipForward } from "lucide-react";
import { formatDuration } from "@/app/lib/workout-logger";
import type { RestTimerState } from "./use-rest-timer";
import { useNow } from "./use-now";

interface RestTimerBarProps {
  timer: RestTimerState;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
}

/** Floating rest timer, docked under the mobile header (top of the desktop content area). */
export function RestTimerBar({ timer, onAdjust, onSkip }: RestTimerBarProps) {
  // Remaining time is always derived from the end timestamp, so throttled
  // background ticks can't make it drift.
  const now = useNow(250);
  const remainingMs = Math.max(0, timer.endAt - now);
  const progress = Math.min(1, remainingMs / (timer.totalSeconds * 1000));

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Rest timer, ${Math.ceil(remainingMs / 1000)} seconds remaining`}
      className="fixed inset-x-0 top-16 lg:top-6 lg:left-64 z-40 px-4 pointer-events-none"
    >
      <div className="max-w-md mx-auto pointer-events-auto bg-card border border-primary/40 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.45)] overflow-hidden">
        <div className="h-1 bg-background">
          <div
            className="h-full bg-primary transition-[width] duration-200 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-2 p-2 pl-4">
          <Timer className="w-5 h-5 text-primary shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold tabular-nums leading-none">
              {formatDuration(remainingMs + 999)}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              Rest{timer.label ? ` · next: ${timer.label}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAdjust(-15)}
            className="btn btn-secondary min-h-11 min-w-11 px-2 tabular-nums"
            aria-label="Subtract 15 seconds"
          >
            −15
          </button>
          <button
            type="button"
            onClick={() => onAdjust(15)}
            className="btn btn-secondary min-h-11 min-w-11 px-2 tabular-nums"
            aria-label="Add 15 seconds"
          >
            +15
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="btn btn-primary min-h-11 min-w-11 px-3"
            aria-label="Skip rest"
          >
            <SkipForward className="w-4 h-4" />
            <span className="max-sm:hidden">Skip</span>
          </button>
        </div>
      </div>
    </div>
  );
}
