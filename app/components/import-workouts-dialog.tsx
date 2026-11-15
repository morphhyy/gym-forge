"use client";

import { useMemo, useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { AlertCircle, Check, FileUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseWorkoutCsv } from "@/app/lib/import/parsers";
import { buildImportPlan, ExerciseMatcher, PlannedSession } from "@/app/lib/import/match";
import type { ParseResult, WeightUnit } from "@/app/lib/import/types";

const MAX_SESSIONS_PER_BATCH = 40;
const MAX_SETS_PER_BATCH = 1500;
const DATE_CHECK_CHUNK = 400;

type Step = "select" | "preview" | "importing" | "done";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUnit: WeightUnit;
}

function chunkSessions(sessions: PlannedSession[]): PlannedSession[][] {
  const batches: PlannedSession[][] = [];
  let current: PlannedSession[] = [];
  let sets = 0;
  for (const s of sessions) {
    if (
      current.length > 0 &&
      (current.length >= MAX_SESSIONS_PER_BATCH || sets + s.sets.length > MAX_SETS_PER_BATCH)
    ) {
      batches.push(current);
      current = [];
      sets = 0;
    }
    current.push(s);
    sets += s.sets.length;
  }
  if (current.length) batches.push(current);
  return batches;
}

export function ImportWorkoutsDialog({ open, onOpenChange, targetUnit }: Props) {
  const convex = useConvex();
  const catalog = useQuery(api.exercises.getAllExercises);
  const ensureCustomExercises = useMutation(api.importer.ensureCustomExercises);
  const importSessionsBatch = useMutation(api.importer.importSessionsBatch);

  const [step, setStep] = useState<Step>("select");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [existingDates, setExistingDates] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [includeWarmups, setIncludeWarmups] = useState(true);
  const [fallbackUnit, setFallbackUnit] = useState<WeightUnit>(targetUnit);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ imported: number; skipped: number; sets: number } | null>(
    null
  );

  const matcher = useMemo(() => {
    if (!catalog) return null;
    // Global exercises win over same-named custom ones
    const sorted = [...catalog].sort((a, b) => Number(b.isGlobal) - Number(a.isGlobal));
    return new ExerciseMatcher(sorted.map((e) => ({ id: e._id, name: e.name })));
  }, [catalog]);

  const plan = useMemo(() => {
    if (!parsed || !matcher) return null;
    return buildImportPlan(parsed.workouts, matcher, {
      targetUnit,
      fallbackUnit,
      includeWarmups,
      sourceLabel: parsed.source === "strong" ? "Strong" : "Hevy",
    });
  }, [parsed, matcher, targetUnit, fallbackUnit, includeWarmups]);

  const toImport = useMemo(
    () => plan?.sessions.filter((s) => !existingDates.has(s.date)) ?? [],
    [plan, existingDates]
  );

  const reset = () => {
    setStep("select");
    setFileName("");
    setParsed(null);
    setExistingDates(new Set());
    setError(null);
    setResult(null);
    setProgress({ done: 0, total: 0 });
  };

  const handleOpenChange = (next: boolean) => {
    if (step === "importing") return; // don't close mid-import
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = async (file: File) => {
    setError(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const res = parseWorkoutCsv(text);
      if (res.workouts.length === 0) {
        setError("No strength-training sets were found in this file.");
        return;
      }
      const dates = Array.from(new Set(res.workouts.map((w) => w.date)));
      const existing = new Set<string>();
      for (let i = 0; i < dates.length; i += DATE_CHECK_CHUNK) {
        const found = await convex.query(api.importer.getExistingSessionDates, {
          dates: dates.slice(i, i + DATE_CHECK_CHUNK),
        });
        found.forEach((d) => existing.add(d));
      }
      setExistingDates(existing);
      setParsed(res);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this file.");
    }
  };

  const runImport = async () => {
    if (!plan) return;
    setStep("importing");
    try {
      const newNames = Array.from(
        new Set(
          toImport.flatMap((s) =>
            s.sets.filter((x) => x.exerciseKey.startsWith("new:")).map((x) => x.exerciseKey.slice(4))
          )
        )
      );
      const created: Record<string, Id<"exercises">> = {};
      for (let i = 0; i < newNames.length; i += 200) {
        Object.assign(created, await ensureCustomExercises({ names: newNames.slice(i, i + 200) }));
      }
      const resolveId = (key: string): Id<"exercises"> | null =>
        key.startsWith("id:") ? (key.slice(3) as Id<"exercises">) : (created[key.slice(4)] ?? null);

      const batches = chunkSessions(toImport);
      setProgress({ done: 0, total: toImport.length });
      let imported = 0;
      let skipped = skippedExistingCount;
      let sets = 0;
      let done = 0;
      for (const batch of batches) {
        const res = await importSessionsBatch({
          sessions: batch.map((s) => ({
            date: s.date,
            notes: s.notes,
            sets: s.sets.flatMap((x) => {
              const exerciseId = resolveId(x.exerciseKey);
              return exerciseId
                ? [{ exerciseId, setIndex: x.setIndex, weight: x.weight, reps: x.reps, rpe: x.rpe, isWarmup: x.isWarmup }]
                : [];
            }),
          })),
        });
        imported += res.imported;
        skipped += res.skippedExisting;
        sets += res.setsInserted;
        done += batch.length;
        setProgress({ done, total: toImport.length });
      }
      setResult({ imported, skipped, sets });
      setStep("done");
      toast.success(`Imported ${imported} workout${imported === 1 ? "" : "s"}`);
    } catch (err) {
      console.error("Import failed:", err);
      setError(
        "Import stopped partway. Workouts imported so far were kept; re-running the import will skip them."
      );
      setStep("preview");
    }
  };

  const sourceLabel = parsed?.source === "strong" ? "Strong" : "Hevy";
  const skippedExistingCount = plan
    ? plan.sessions.filter((s) => existingDates.has(s.date)).length
    : 0;
  const setsToImport = toImport.reduce((n, s) => n + s.sets.length, 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import workout history</DialogTitle>
          <DialogDescription>
            Upload a CSV export from Strong (Settings → Export Strong Data) or Hevy
            (Settings → Export &amp; Import → Export Workouts).
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 text-danger text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "select" && (
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:bg-card-hover transition-colors">
            <FileUp className="w-8 h-8 text-muted-foreground" />
            <span className="font-medium">{fileName || "Choose a .csv file"}</span>
            <span className="text-xs text-muted-foreground">
              Parsed on your device; nothing is uploaded until you confirm.
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={!catalog}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
          </label>
        )}

        {step === "preview" && plan && parsed && (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Detected a <span className="font-medium text-foreground">{sourceLabel}</span>{" "}
              export: {fileName}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Workout days to import" value={toImport.length} />
              <Stat label="Sets to import" value={setsToImport} />
              <Stat label="Days skipped (already logged)" value={skippedExistingCount} />
              <Stat label="Rows ignored (cardio/timed)" value={parsed.skippedRows} />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeWarmups}
                  onChange={(e) => setIncludeWarmups(e.target.checked)}
                />
                Include warm-up sets
              </label>
              {parsed.hasUnknownUnits && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span>Weights in this file are in</span>
                  {(["kg", "lb"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setFallbackUnit(u)}
                      className={`btn px-3 py-1 text-xs ${fallbackUnit === u ? "btn-primary" : "btn-secondary"}`}
                    >
                      {u}
                    </button>
                  ))}
                  {fallbackUnit !== targetUnit && (
                    <span className="text-xs text-muted-foreground">
                      (converted to {targetUnit})
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <p className="font-medium">
                {plan.matched.size} exercise{plan.matched.size === 1 ? "" : "s"} matched to the
                catalog
              </p>
              {plan.unmatched.length > 0 && (
                <>
                  <p className="text-muted-foreground mt-1">
                    {plan.unmatched.length} not found. They&apos;ll be created as custom
                    exercises:
                  </p>
                  <ul className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-border p-2 space-y-1">
                    {plan.unmatched.map((n) => (
                      <li key={n} className="truncate">
                        {n}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              GymForge keeps one workout per day: workouts on the same date are merged, and
              dates you&apos;ve already logged are left untouched.
            </p>

            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={reset}>
                Choose another file
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={toImport.length === 0}
                onClick={runImport}
              >
                Import {toImport.length} workout{toImport.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="py-6 text-center space-y-3">
            <div className="w-6 h-6 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">
              Importing… {progress.done}/{progress.total} workouts
            </p>
          </div>
        )}

        {step === "done" && result && (
          <div className="py-4 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-primary font-medium">
              <Check className="w-5 h-5" />
              Import complete
            </div>
            <p>
              Imported {result.imported} workouts ({result.sets} sets).
              {result.skipped > 0 && ` Skipped ${result.skipped} already-logged days.`}
            </p>
            <div className="flex justify-end">
              <button type="button" className="btn btn-primary" onClick={() => handleOpenChange(false)}>
                Done
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
