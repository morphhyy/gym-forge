"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import { CalendarCheck, Trophy, X } from "lucide-react";

const STORAGE_PREFIX = "gymforge:weeklyRecapDismissed:";
const listeners = new Set<() => void>();

function readDismissed(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function formatDay(date: string, pattern: string) {
  return format(new Date(`${date}T00:00:00`), pattern);
}

function formatVolume(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
}

/**
 * Dismissible recap of the previous Sun–Sat week. `today` is the client's
 * local date (YYYY-MM-DD). Dismissal is remembered per week in localStorage.
 */
export function WeeklyRecap({ today }: { today: string }) {
  const recap = useQuery(api.recap.getWeeklyRecap, { today });
  const storageKey = recap ? `${STORAGE_PREFIX}${recap.weekStart}` : null;

  const dismissed = useSyncExternalStore(
    subscribe,
    () => (storageKey ? readDismissed(storageKey) : false),
    () => true // server render: hidden
  );

  const dismiss = useCallback(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // storage unavailable: hide for this render cycle only
    }
    listeners.forEach((l) => l());
  }, [storageKey]);

  if (!recap || dismissed) return null;
  // Nothing to recap: no workouts and nothing was planned
  if (recap.workoutCount === 0 && !recap.plan) return null;

  const range = `${formatDay(recap.weekStart, "MMM d")} – ${formatDay(recap.weekEnd, "MMM d")}`;

  return (
    <div className="card relative">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss weekly recap"
        className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 mb-1">
        <CalendarCheck className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-lg">Last week&apos;s recap</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{range}</p>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <RecapStat
          label="Workouts"
          value={String(recap.workoutCount)}
          hint={`goal ${recap.goal.weeklyGoal}/week`}
        />
        <RecapStat
          label="Volume"
          value={formatVolume(recap.totalVolume)}
          hint={`${recap.units} · ${recap.totalSets} sets`}
        />
        <RecapStat
          label="PRs"
          value={String(recap.prCount)}
          hint={recap.prCount === 1 ? "exercise" : "exercises"}
        />
        <RecapStat
          label="Plan adherence"
          value={recap.plan ? `${recap.plan.adherencePct}%` : `${recap.goal.adherencePct}%`}
          hint={
            recap.plan
              ? `${recap.plan.completed}/${recap.plan.planned} planned days`
              : "of weekly goal"
          }
        />
      </div>

      {recap.prs.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium flex items-center gap-1.5 mb-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            New records
          </p>
          <ul className="flex flex-wrap gap-2">
            {recap.prs.slice(0, 6).map((pr) => (
              <li
                key={`${pr.exerciseName}-${pr.recordType}`}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500"
              >
                {pr.exerciseName}
                {pr.recordType === "weight" &&
                  ` · ${pr.value} ${recap.units}${pr.reps ? ` × ${pr.reps}` : ""}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {recap.workouts.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Trained on {recap.workouts.map((w) => formatDay(w.date, "EEE")).join(", ")}
        </p>
      )}
    </div>
  );
}

function RecapStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl bg-card-hover/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
