"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { Clock, Dumbbell, Layers, Trophy, TrendingUp, Zap } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatLargeNumber } from "@/app/lib/utils";
import { formatDuration, formatWeightValue } from "@/app/lib/workout-logger";
import { StreakBadge } from "@/app/components/streak-badge";

const PR_META = {
  weight: { label: "Weight", icon: Trophy, color: "text-yellow-500" },
  e1rm: { label: "Est. 1RM", icon: TrendingUp, color: "text-blue-500" },
  volume: { label: "Set volume", icon: Zap, color: "text-purple-500" },
} as const;

export function WorkoutSummary({
  sessionId,
  completedAt,
  durationMs,
  stats,
  exerciseCount,
  units,
  streak,
}: {
  sessionId: Id<"sessions">;
  completedAt: number;
  durationMs: number | null;
  stats: { totalSets: number; workingSets: number; volume: number };
  exerciseCount: number;
  units: "kg" | "lb";
  streak: number | null;
}) {
  const prs = useQuery(api.sessions.getSessionPRs, { sessionId });

  return (
    <div className="card bg-primary-muted border-primary/30 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-primary">Workout complete!</h3>
            <p className="text-sm text-muted-foreground">
              Finished at {format(new Date(completedAt), "h:mm a")}
            </p>
          </div>
        </div>
        {streak !== null && streak > 0 && <StreakBadge streak={streak} size="md" showLabel />}
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={<Clock className="w-4 h-4" />} label="Duration">
          {durationMs !== null ? formatDuration(durationMs) : "—"}
        </Stat>
        <Stat icon={<Zap className="w-4 h-4" />} label={`Volume (${units})`}>
          {formatLargeNumber(stats.volume)}
        </Stat>
        <Stat icon={<Layers className="w-4 h-4" />} label="Sets">
          {stats.workingSets}
          {stats.totalSets > stats.workingSets && (
            <span className="text-xs font-normal text-muted-foreground">
              {" "}
              +{stats.totalSets - stats.workingSets} warm-up
            </span>
          )}
        </Stat>
        <Stat icon={<Dumbbell className="w-4 h-4" />} label="Exercises">
          {exerciseCount}
        </Stat>
      </dl>

      {prs && prs.length > 0 && (
        <div className="pt-3 border-t border-primary/20">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Personal records
          </p>
          <ul className="space-y-1.5">
            {prs.map((pr) => {
              const meta = PR_META[pr.recordType];
              const Icon = meta.icon;
              return (
                <li key={pr._id} className="flex items-center gap-2 text-sm">
                  <Icon className={`w-4 h-4 ${meta.color}`} />
                  <span className="font-medium">{pr.exerciseName}</span>
                  <span className="text-muted-foreground">{meta.label}</span>
                  <span className="ml-auto tabular-nums font-semibold">
                    {formatWeightValue(pr.value)}
                    {pr.recordType !== "volume" && ` ${units}`}
                    {pr.recordType === "weight" && pr.reps ? ` × ${pr.reps}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-background/40 px-3 py-2">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="text-lg font-bold tabular-nums">{children}</dd>
    </div>
  );
}
