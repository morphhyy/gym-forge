"use client";

import { Dumbbell, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import Link from "next/link";

type CalendarDayDetailProps = {
  date: string; // YYYY-MM-DD
  session: {
    _id: string;
    totalSets: number;
    totalVolume: number;
    exerciseCount: number;
    exercises: { name: string; setCount: number }[];
  } | null;
  weightUnit: string;
};

export function CalendarDayDetail({
  date,
  session,
  weightUnit,
}: CalendarDayDetailProps) {
  const formattedDate = format(parseISO(date), "EEEE, MMMM d");

  return (
    <div className="card">
      <h3 className="font-semibold text-lg mb-4">{formattedDate}</h3>

      {session ? (
        <div className="space-y-4">
          {/* Exercise List */}
          <div className="space-y-2">
            {session.exercises.map((exercise, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-muted rounded-lg flex items-center justify-center">
                    <Dumbbell className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium">{exercise.name}</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {exercise.setCount} {exercise.setCount === 1 ? "set" : "sets"}
                </span>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="flex items-center gap-6 pt-2 text-sm text-muted-foreground">
            <span>
              {session.totalSets} total {session.totalSets === 1 ? "set" : "sets"}
            </span>
            <span>
              {session.totalVolume >= 1000
                ? `${(session.totalVolume / 1000).toFixed(1)}k`
                : session.totalVolume}{" "}
              {weightUnit} volume
            </span>
          </div>

          {/* View in Log Link */}
          <Link
            href={`/log?date=${date}`}
            className="btn btn-secondary inline-flex items-center gap-2 mt-2"
          >
            <ExternalLink className="w-4 h-4" />
            View in Log
          </Link>
        </div>
      ) : (
        <div className="text-center py-6">
          <Dumbbell className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted-foreground">No workout recorded</p>
          <Link
            href={`/log?date=${date}`}
            className="btn btn-secondary inline-flex items-center gap-2 mt-4"
          >
            <ExternalLink className="w-4 h-4" />
            Log a Workout
          </Link>
        </div>
      )}
    </div>
  );
}
