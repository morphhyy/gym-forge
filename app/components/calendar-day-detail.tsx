"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Dumbbell, ExternalLink, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CalendarDayDetailProps = {
  date: string; // YYYY-MM-DD
  session: {
    _id: Id<"sessions">;
    totalSets: number;
    totalVolume: number;
    exerciseCount: number;
    exercises: { name: string; setCount: number }[];
    warmupDone?: boolean;
    cooldownDone?: boolean;
  } | null;
  weightUnit: string;
};

export function CalendarDayDetail({
  date,
  session,
  weightUnit,
}: CalendarDayDetailProps) {
  const formattedDate = format(parseISO(date), "EEEE, MMMM d");
  const deleteSession = useMutation(api.sessions.deleteSession);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!session) return;
    setDeleting(true);
    try {
      await deleteSession({ sessionId: session._id });
      toast.success("Workout deleted");
      setConfirmOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete workout"
      );
    } finally {
      setDeleting(false);
    }
  };

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
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pt-2 text-sm text-muted-foreground">
            <span>
              {session.totalSets} total {session.totalSets === 1 ? "set" : "sets"}
            </span>
            <span>
              {session.totalVolume >= 1000
                ? `${(session.totalVolume / 1000).toFixed(1)}k`
                : session.totalVolume}{" "}
              {weightUnit} volume
            </span>
            {(session.warmupDone || session.cooldownDone) && (
              <span>
                {[session.warmupDone && "Warm-up ✓", session.cooldownDone && "Cool-down ✓"]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* View in Log Link */}
            <Link
              href={`/log?date=${date}`}
              className="btn btn-secondary inline-flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View in Log
            </Link>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="btn btn-ghost inline-flex items-center gap-2 text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Delete Workout
            </button>
          </div>

          <Dialog
            open={confirmOpen}
            onOpenChange={(open) => !deleting && setConfirmOpen(open)}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Delete this workout?</DialogTitle>
                <DialogDescription>
                  This permanently deletes the workout on {formattedDate} and
                  all {session.totalSets}{" "}
                  {session.totalSets === 1 ? "set" : "sets"} logged in it.
                  Personal records set in this workout will be recalculated
                  from your remaining history. This can&apos;t be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setConfirmOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete Workout"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
