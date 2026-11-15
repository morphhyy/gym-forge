"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { Layers } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { VolumeStatus } from "@/convex/lib/weeklyVolume";
import { cn } from "@/lib/utils";

const STATUS: Record<VolumeStatus, { label: string; bar: string; text: string }> = {
  under: { label: "Under", bar: "bg-amber-400", text: "text-amber-400" },
  in_range: { label: "In range", bar: "bg-primary", text: "text-primary" },
  over: { label: "Over", bar: "bg-danger", text: "text-danger" },
};

/** Working sets per muscle group this week vs a 10–20 sets/week guideline. */
export function WeeklyMuscleSets() {
  // Client's local calendar date; the server never computes "today".
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const data = useQuery(api.progression.getWeeklyMuscleSets, { today });

  if (data === undefined) {
    return <div className="card h-48 animate-pulse" />;
  }

  const { guideline, muscles, daysElapsed } = data;
  const scaleMax = Math.max(
    guideline.max + 5,
    ...muscles.map((m) => Math.max(m.currentWeek, m.previousWeek))
  );
  const pct = (n: number) => `${(n / scaleMax) * 100}%`;

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold">Weekly Sets per Muscle</h2>
            <p className="text-xs text-muted-foreground">
              Working sets this week (day {daysElapsed} of 7) · guideline{" "}
              {guideline.min}–{guideline.max}
            </p>
          </div>
        </div>
      </div>

      {muscles.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No sets logged in the last two weeks yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {muscles.map((m) => {
            const status = STATUS[m.status];
            const delta = m.currentWeek - m.previousWeek;
            return (
              <li key={m.muscleGroup}>
                <div className="flex items-baseline justify-between text-sm mb-1">
                  <span className="font-medium">{m.muscleGroup}</span>
                  <span className="flex items-baseline gap-2">
                    <span className="font-semibold tabular-nums">{m.currentWeek}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      last wk {m.previousWeek}
                      {delta !== 0 && ` (${delta > 0 ? "+" : ""}${delta})`}
                    </span>
                    <span className={cn("text-xs font-medium w-16 text-right", status.text)}>
                      {status.label}
                    </span>
                  </span>
                </div>
                <div
                  className="relative h-2.5 rounded-full bg-muted overflow-hidden"
                  role="img"
                  aria-label={`${m.muscleGroup}: ${m.currentWeek} sets this week, ${m.previousWeek} last week, ${status.label.toLowerCase()}`}
                >
                  {/* Guideline band */}
                  <div
                    className="absolute inset-y-0 bg-primary/15 border-x border-primary/40"
                    style={{ left: pct(guideline.min), width: pct(guideline.max - guideline.min) }}
                  />
                  {/* Previous week marker */}
                  {m.previousWeek > 0 && (
                    <div
                      className="absolute inset-y-0 w-0.5 bg-muted-foreground/70 z-10"
                      style={{ left: pct(m.previousWeek) }}
                    />
                  )}
                  {/* Current week bar */}
                  <div
                    className={cn("absolute inset-y-0 left-0 rounded-full", status.bar)}
                    style={{ width: pct(m.currentWeek) }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm bg-primary/15 border border-primary/40" />
          {guideline.min}–{guideline.max} sets guideline
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-3 bg-muted-foreground/70" />
          Last week
        </span>
      </div>
    </div>
  );
}
