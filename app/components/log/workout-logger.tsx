"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { Calendar, Clock, Flame, Link2, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { deriveSessionExercises } from "@/convex/lib/sessionExercises";
import { useAchievementToasts } from "@/app/components/achievement-toast";
import { PRCelebration } from "@/app/components/pr-celebration";
import { ExerciseSelector } from "@/app/components/exercise-selector";
import {
  computeSessionStats,
  formatDuration,
  groupBySuperset,
  nextAfterSet,
  resolveRestSeconds,
  type SetType,
} from "@/app/lib/workout-logger";
import { ExerciseCard } from "./exercise-card";
import { RestTimerBar } from "./rest-timer";
import { useNow } from "./use-now";
import { primeAudio, useRestTimer } from "./use-rest-timer";
import { useWakeLock } from "./use-wake-lock";
import { WorkoutSummary } from "./workout-summary";
import {
  resolveSetValues,
  setKey,
  type ExerciseInfo,
  type LastTime,
  type LoggedSet,
  type LoggerExercise,
  type SetDraft,
} from "./types";

type PRInfo = {
  type: "weight" | "volume" | "e1rm";
  value: number;
  previousValue?: number;
  exerciseName?: string;
};

type SelectorState = null | { mode: "add" } | { mode: "swap"; exerciseId: Id<"exercises"> };

/**
 * The workout logger for a single date. Mount with `key={date}` so all local
 * state (drafts, focus targets) resets when the date changes.
 */
export function WorkoutLogger({ date }: { date: string }) {
  const todayTemplate = useQuery(api.plans.getTodayTemplate, { date });
  const sessionData = useQuery(api.sessions.getSessionByDate, { date });
  const userData = useQuery(api.users.getCurrentUser);

  const getOrCreateSession = useMutation(api.sessions.getOrCreateSession);
  const logSet = useMutation(api.sessions.logSet);
  const deleteSet = useMutation(api.sessions.deleteSet);
  const addSessionSet = useMutation(api.sessions.addSessionSet);
  const addSessionExercise = useMutation(api.sessions.addSessionExercise);
  const swapSessionExercise = useMutation(api.sessions.swapSessionExercise);
  const removeSessionExercise = useMutation(api.sessions.removeSessionExercise);
  const completeSession = useMutation(api.sessions.completeSession);
  const checkAndUpdatePR = useMutation(api.records.checkAndUpdatePR);

  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({});
  const [savingKeys, setSavingKeys] = useState<ReadonlySet<string>>(new Set());
  const [selector, setSelector] = useState<SelectorState>(null);
  const [completing, setCompleting] = useState(false);
  const [completedStreak, setCompletedStreak] = useState<number | null>(null);
  const [prData, setPrData] = useState<PRInfo[] | null>(null);
  const closePR = useCallback(() => setPrData(null), []);
  const { showAchievements, AchievementToasts } = useAchievementToasts();

  const weightInputs = useRef(new Map<string, HTMLInputElement>());
  const registerWeightInput = useCallback((key: string, el: HTMLInputElement | null) => {
    if (el) weightInputs.current.set(key, el);
    else weightInputs.current.delete(key);
  }, []);
  const createdSessionId = useRef<Id<"sessions"> | null>(null);

  const units = userData?.units ?? "kg";
  const restTimer = useRestTimer({
    sound: userData?.restTimerSound ?? true,
    vibrate: userData?.restTimerVibrate ?? true,
  });

  const isToday = date === format(new Date(), "yyyy-MM-dd");
  const isCompleted = sessionData?.completedAt != null;
  const inProgress = !!sessionData && !isCompleted;

  // Keep the screen on at the gym while a session is running
  useWakeLock(inProgress && isToday);

  // ---------------------------------------------------------------------------
  // Session exercise list. A materialized `session.exercises` snapshot wins;
  // otherwise it's derived from the plan template + logged sets, exactly as the
  // server derives it (see convex/lib/sessionExercises.ts).
  // ---------------------------------------------------------------------------
  const entries: LoggerExercise[] = useMemo(() => {
    const template = todayTemplate?.exercises ?? [];
    const details = new Map<string, ExerciseInfo>();
    for (const pe of template) if (pe.exercise) details.set(pe.exerciseId, pe.exercise);
    for (const s of sessionData?.sets ?? []) if (s.exercise) details.set(s.exerciseId, s.exercise);
    for (const e of sessionData?.exercises ?? []) if (e.exercise) details.set(e.exerciseId, e.exercise);

    // The server derives from the plan stored on the session; only use the
    // currently active template when it is that same plan.
    const templateMatches = !sessionData || sessionData.planId === todayTemplate?.plan?._id;
    const base =
      sessionData?.exercises ??
      deriveSessionExercises(templateMatches ? template : [], sessionData?.sets ?? []);

    return base.map((e) => ({
      key: e.key,
      exerciseId: e.exerciseId,
      planExerciseId: e.planExerciseId,
      sets: e.sets,
      supersetGroup: e.supersetGroup,
      restSeconds: e.restSeconds,
      swappedFromExerciseId: e.swappedFromExerciseId,
      exercise: details.get(e.exerciseId) ?? null,
      swappedFromName: e.swappedFromExerciseId
        ? (details.get(e.swappedFromExerciseId)?.name ?? "planned exercise")
        : undefined,
    }));
  }, [todayTemplate, sessionData]);

  const groups = useMemo(() => groupBySuperset(entries), [entries]);

  const logged = useMemo(() => {
    const map = new Map<string, LoggedSet>();
    for (const s of sessionData?.sets ?? []) map.set(setKey(s.exerciseId, s.setIndex), s);
    return map;
  }, [sessionData?.sets]);

  const exerciseIds = useMemo(() => entries.map((e) => e.exerciseId), [entries]);
  const lastTimes = useQuery(
    api.sessions.getLastWeightsForExercises,
    exerciseIds.length > 0 ? { exerciseIds, beforeDate: date } : "skip"
  ) as Record<string, LastTime> | undefined;
  const suggestions = useQuery(
    api.progress.getBatchExerciseSuggestions,
    exerciseIds.length > 0 ? { exerciseIds } : "skip"
  );

  const lastSetFor = (exerciseId: string, setIndex: number) => {
    const sets = lastTimes?.[exerciseId]?.sets;
    return sets?.find((s) => s.setIndex === setIndex) ?? sets?.at(-1);
  };

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const ensureSession = async (): Promise<Id<"sessions">> => {
    if (sessionData?._id) return sessionData._id;
    if (createdSessionId.current) return createdSessionId.current;
    const id = await getOrCreateSession({ date, planId: todayTemplate?.plan?._id });
    createdSessionId.current = id;
    return id;
  };

  const setSaving = (key: string, saving: boolean) =>
    setSavingKeys((prev) => {
      const next = new Set(prev);
      if (saving) next.add(key);
      else next.delete(key);
      return next;
    });

  const clearDraft = (key: string) =>
    setDrafts((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const onDraftChange = (exerciseId: string, setIndex: number, patch: Partial<SetDraft>) => {
    const key = setKey(exerciseId, setIndex);
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const focusSet = (exerciseId: string, setIndex: number) => {
    const el = weightInputs.current.get(setKey(exerciseId, setIndex));
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  /** Label for the rest timer: the next unlogged set after this one. */
  const nextUpLabel = (justLogged: string): string | undefined => {
    for (const group of groups) {
      const maxSets = Math.max(...group.items.map((e) => e.sets.length));
      for (let i = 0; i < maxSets; i++) {
        for (const e of group.items) {
          const key = setKey(e.exerciseId, i);
          if (i < e.sets.length && key !== justLogged && !logged.has(key)) {
            return `${e.exercise?.name ?? "Exercise"} · set ${i + 1}`;
          }
        }
      }
    }
    return undefined;
  };

  const persistSet = async (
    entry: LoggerExercise,
    setIndex: number,
    values: { weight: number; reps: number; rpe?: number; setType: SetType },
    checkPR: boolean
  ) => {
    const key = setKey(entry.exerciseId, setIndex);
    setSaving(key, true);
    try {
      const sessionId = await ensureSession();
      await logSet({
        sessionId,
        exerciseId: entry.exerciseId,
        setIndex,
        weight: values.weight,
        repsActual: values.reps,
        rpe: values.rpe,
        setType: values.setType,
      });
      clearDraft(key);

      if (checkPR && values.setType !== "warmup" && values.weight > 0 && values.reps > 0) {
        const pr = await checkAndUpdatePR({
          sessionId,
          exerciseId: entry.exerciseId,
          weight: values.weight,
          reps: values.reps,
          date,
          setType: values.setType,
        });
        if (pr.newPRs.length > 0) {
          setPrData(pr.newPRs.map((p) => ({ ...p, exerciseName: entry.exercise?.name })));
        }
        if (pr.newAchievement) showAchievements([pr.newAchievement]);
      }
    } catch (error) {
      console.error("Failed to save set:", error);
      toast.error("Couldn't save that set. Check your connection and try again.");
    } finally {
      setSaving(key, false);
    }
  };

  const onComplete = (exerciseId: string, setIndex: number) => {
    const entry = entries.find((e) => e.exerciseId === exerciseId);
    if (!entry) return;
    const key = setKey(exerciseId, setIndex);
    if (savingKeys.has(key)) return;
    const loggedSet = logged.get(key);
    const lastSet = lastSetFor(exerciseId, setIndex);
    const values = resolveSetValues({
      draft: drafts[key],
      logged: loggedSet,
      suggestedWeight: lastSet?.weight,
      suggestedReps: entry.sets[setIndex]?.repsTarget ?? lastSet?.reps,
    });
    if (values.weight === null || values.reps === null) return;

    // Everything below runs synchronously inside the tap, so audio unlocks and
    // focusing the next input opens the mobile keyboard.
    primeAudio();
    if (!loggedSet) {
      const group = groups.find((g) => g.items.includes(entry))?.items ?? [entry];
      const flow = nextAfterSet(
        group.map((e) => ({ exerciseId: e.exerciseId, setCount: e.sets.length })),
        exerciseId,
        setIndex,
        (ex, i) => logged.has(setKey(ex, i))
      );
      if (flow.focus) {
        focusSet(flow.focus.exerciseId, flow.focus.setIndex);
      } else if (flow.startRest && !isCompleted) {
        restTimer.start(
          resolveRestSeconds(group, userData?.defaultRestSeconds),
          nextUpLabel(key)
        );
      }
    }

    void persistSet(
      entry,
      setIndex,
      { weight: values.weight, reps: values.reps, rpe: values.rpe, setType: values.setType },
      true
    );
  };

  const onMetaChange = (
    exerciseId: string,
    setIndex: number,
    patch: { setType?: SetType; rpe?: number | null }
  ) => {
    const key = setKey(exerciseId, setIndex);
    const loggedSet = logged.get(key);
    const entry = entries.find((e) => e.exerciseId === exerciseId);
    if (loggedSet && entry && !drafts[key]) {
      // Already logged and not being edited: save the change right away
      void persistSet(
        entry,
        setIndex,
        {
          weight: loggedSet.weight,
          reps: loggedSet.repsActual,
          rpe: patch.rpe === null ? undefined : (patch.rpe ?? loggedSet.rpe),
          setType: patch.setType ?? loggedSet.setType ?? "normal",
        },
        false
      );
      return;
    }
    onDraftChange(exerciseId, setIndex, patch);
  };

  const onDelete = async (exerciseId: string, setIndex: number) => {
    try {
      const sessionId = await ensureSession();
      await deleteSet({ sessionId, exerciseId: exerciseId as Id<"exercises">, setIndex });
      // Mirror the server's re-indexing for unsaved drafts of this exercise
      setDrafts((prev) => {
        const next: Record<string, SetDraft> = {};
        const prefix = `${exerciseId}-`;
        for (const [key, draft] of Object.entries(prev)) {
          if (!key.startsWith(prefix)) {
            next[key] = draft;
            continue;
          }
          const index = Number(key.slice(prefix.length));
          if (index < setIndex) next[key] = draft;
          else if (index > setIndex) next[setKey(exerciseId, index - 1)] = draft;
        }
        return next;
      });
    } catch (error) {
      console.error("Failed to delete set:", error);
      toast.error("Couldn't remove that set.");
    }
  };

  const onAddSet = async (exerciseId: Id<"exercises">) => {
    try {
      const sessionId = await ensureSession();
      await addSessionSet({ sessionId, exerciseId });
    } catch (error) {
      console.error("Failed to add set:", error);
      toast.error("Couldn't add a set.");
    }
  };

  const onRemoveExercise = async (exerciseId: Id<"exercises">) => {
    try {
      const sessionId = await ensureSession();
      await removeSessionExercise({ sessionId, exerciseId });
      setDrafts((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`${exerciseId}-`)))
      );
    } catch (error) {
      console.error("Failed to remove exercise:", error);
      toast.error("Couldn't remove the exercise.");
    }
  };

  const onSelectExercise = async (exerciseId: Id<"exercises">) => {
    const current = selector;
    setSelector(null);
    if (!current) return;
    if (entries.some((e) => e.exerciseId === exerciseId)) {
      toast.info("That exercise is already in this workout.");
      return;
    }
    try {
      const sessionId = await ensureSession();
      if (current.mode === "add") {
        await addSessionExercise({ sessionId, exerciseId });
      } else {
        await swapSessionExercise({ sessionId, exerciseId: current.exerciseId, newExerciseId: exerciseId });
        setDrafts((prev) =>
          Object.fromEntries(
            Object.entries(prev).filter(([k]) => !k.startsWith(`${current.exerciseId}-`))
          )
        );
      }
    } catch (error) {
      console.error("Failed to update exercises:", error);
      toast.error(current.mode === "add" ? "Couldn't add the exercise." : "Couldn't swap the exercise.");
    }
  };

  const handleFinish = async () => {
    if (!sessionData?._id) return;
    setCompleting(true);
    try {
      const result = await completeSession({ sessionId: sessionData._id });
      restTimer.skip();
      if (result.streakResult) {
        setCompletedStreak(result.streakResult.streak);
        if (result.streakResult.newAchievements.length > 0) {
          showAchievements(result.streakResult.newAchievements);
        }
      }
    } catch (error) {
      console.error("Failed to complete session:", error);
      toast.error("Couldn't finish the workout.");
    } finally {
      setCompleting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (todayTemplate === undefined || sessionData === undefined) {
    return <LoggerSkeleton />;
  }

  const startedAt =
    sessionData?.startedAt ??
    (sessionData && sessionData.sets.length > 0
      ? Math.min(...sessionData.sets.map((s) => s.createdAt))
      : sessionData?.createdAt);
  const totalPlanned = entries.reduce((sum, e) => sum + e.sets.length, 0);
  const totalLogged = sessionData?.sets.length ?? 0;
  const stats = computeSessionStats(sessionData?.sets ?? []);

  return (
    <div className="space-y-4">
      <AchievementToasts />
      {prData && <PRCelebration prs={prData} onClose={closePR} />}

      {isCompleted && sessionData && (
        <WorkoutSummary
          sessionId={sessionData._id}
          completedAt={sessionData.completedAt!}
          durationMs={startedAt ? sessionData.completedAt! - startedAt : null}
          stats={stats}
          exerciseCount={new Set(sessionData.sets.map((s) => s.exerciseId)).size}
          units={units}
          streak={completedStreak}
        />
      )}

      {!isCompleted && totalPlanned > 0 && (
        <div className="card py-3">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-medium">
              {todayTemplate?.day?.name && entries.some((e) => e.planExerciseId)
                ? todayTemplate.day.name
                : "Progress"}
            </span>
            <span className="flex items-center gap-3 text-muted-foreground tabular-nums">
              {inProgress && startedAt && isToday && <Elapsed since={startedAt} />}
              <span>
                {totalLogged} / {totalPlanned} sets
              </span>
            </span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(100, (totalLogged / totalPlanned) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        !isCompleted && (
          <EmptyState
            hasPlan={!!todayTemplate?.plan}
            onFreestyle={() => setSelector({ mode: "add" })}
          />
        )
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const isSuperset = !!group.supersetGroup && group.items.length > 1;
            const cards = group.items.map((entry) => (
              <ExerciseCard
                key={entry.key}
                entry={entry}
                logged={logged}
                drafts={drafts}
                savingKeys={savingKeys}
                lastTime={lastTimes?.[entry.exerciseId]}
                suggestion={suggestions?.[entry.exerciseId]}
                units={units}
                disabled={isCompleted}
                registerWeightInput={registerWeightInput}
                onDraftChange={onDraftChange}
                onComplete={onComplete}
                onMetaChange={onMetaChange}
                onDelete={onDelete}
                onAddSet={onAddSet}
                onSwap={(exerciseId) => setSelector({ mode: "swap", exerciseId })}
                onRemove={onRemoveExercise}
              />
            ));
            return isSuperset ? (
              <div key={group.items[0].key} className="card border-l-2 border-l-primary">
                <div className="flex items-center gap-1.5 mb-3">
                  <Link2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Superset · {group.items.length} exercises
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    Rest after each round
                  </span>
                </div>
                <div className="divide-y divide-border/50 [&>*]:py-3 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
                  {cards}
                </div>
              </div>
            ) : (
              <div key={group.items[0].key} className="card">
                {cards}
              </div>
            );
          })}

          {!isCompleted && (
            <button
              type="button"
              onClick={() => setSelector({ mode: "add" })}
              className="btn btn-secondary w-full min-h-12 border-dashed"
            >
              <Plus className="w-4 h-4" />
              Add exercise
            </button>
          )}

          {!isCompleted && totalLogged > 0 && (
            <button
              type="button"
              onClick={handleFinish}
              disabled={completing || !sessionData?._id}
              className="btn btn-primary w-full min-h-14 text-base shadow-lg"
            >
              {completing ? (
                <span className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Flame className="w-5 h-5" />
                  Finish workout ({totalLogged} sets)
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Spacer so the floating timer never covers the last controls */}
      {restTimer.timer && <div className="h-24" aria-hidden />}
      {restTimer.timer && (
        <RestTimerBar timer={restTimer.timer} onAdjust={restTimer.adjust} onSkip={restTimer.skip} />
      )}

      <ExerciseSelector
        open={selector !== null}
        onOpenChange={(open) => !open && setSelector(null)}
        onSelect={(exerciseId) => void onSelectExercise(exerciseId)}
        title={selector?.mode === "swap" ? "Swap Exercise" : "Add Exercise"}
      />
    </div>
  );
}

function Elapsed({ since }: { since: number }) {
  const now = useNow(1000);
  return (
    <span className="flex items-center gap-1" aria-label="Workout duration">
      <Clock className="w-3.5 h-3.5" aria-hidden />
      {formatDuration(now - since)}
    </span>
  );
}

function EmptyState({ hasPlan, onFreestyle }: { hasPlan: boolean; onFreestyle: () => void }) {
  return (
    <div className="card text-center py-14">
      <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border">
        <Calendar className="w-8 h-8 text-blue-400" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{hasPlan ? "Rest Day" : "No Workout Plan"}</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {hasPlan
          ? "Take a well-deserved break — or log a freestyle workout if you trained anyway."
          : "Create a workout plan, or log a freestyle workout right now."}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button type="button" onClick={onFreestyle} className="btn btn-primary min-h-11">
          <Plus className="w-4 h-4" />
          Start freestyle workout
        </button>
        {!hasPlan && (
          <Link href="/plan" className="btn btn-secondary min-h-11">
            Create Plan
          </Link>
        )}
      </div>
    </div>
  );
}

export function LoggerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="card h-16 animate-pulse" />
      <div className="card h-96 animate-pulse" />
    </div>
  );
}
