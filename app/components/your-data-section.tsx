"use client";

import { useState } from "react";
import { useConvex } from "convex/react";
import type { FunctionReference, PaginationResult } from "convex/server";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Database, Download, FileJson, Upload } from "lucide-react";
import {
  bodyWeightsToCsv,
  downloadTextFile,
  foodEntriesToCsv,
  workoutsToCsv,
} from "@/app/lib/export/csv";
import { ImportWorkoutsDialog } from "@/app/components/import-workouts-dialog";

type ExportKind = "workouts" | "bodyWeight" | "nutrition" | "json";

const PAGE_SIZE = 100;

/** Walk a paginated export query until exhausted. */
async function fetchAllPages<T>(
  convex: ReturnType<typeof useConvex>,
  fn: FunctionReference<
    "query",
    "public",
    { paginationOpts: { numItems: number; cursor: string | null } },
    PaginationResult<T>
  >
): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | null = null;
  for (;;) {
    const res: PaginationResult<T> = await convex.query(fn, {
      paginationOpts: { numItems: PAGE_SIZE, cursor },
    });
    out.push(...res.page);
    if (res.isDone) break;
    cursor = res.continueCursor;
  }
  return out;
}

function stamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function YourDataSection({ units }: { units: "kg" | "lb" }) {
  const convex = useConvex();
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const run = async (kind: ExportKind) => {
    setBusy(kind);
    try {
      if (kind === "workouts") {
        const sessions = await fetchAllPages(convex, api.dataExport.exportSessionsPage);
        downloadTextFile(
          `gymforge-workouts-${stamp()}.csv`,
          workoutsToCsv(sessions, units),
          "text/csv"
        );
      } else if (kind === "bodyWeight") {
        const entries = await fetchAllPages(convex, api.dataExport.exportBodyWeightsPage);
        downloadTextFile(
          `gymforge-body-weight-${stamp()}.csv`,
          bodyWeightsToCsv(entries, units),
          "text/csv"
        );
      } else if (kind === "nutrition") {
        const entries = await fetchAllPages(convex, api.dataExport.exportFoodEntriesPage);
        downloadTextFile(
          `gymforge-nutrition-${stamp()}.csv`,
          foodEntriesToCsv(entries),
          "text/csv"
        );
      } else {
        const [profile, sessions, bodyWeights, foodEntries, personalRecords] =
          await Promise.all([
            convex.query(api.dataExport.exportProfileData, {}),
            fetchAllPages(convex, api.dataExport.exportSessionsPage),
            fetchAllPages(convex, api.dataExport.exportBodyWeightsPage),
            fetchAllPages(convex, api.dataExport.exportFoodEntriesPage),
            fetchAllPages(convex, api.dataExport.exportPersonalRecordsPage),
          ]);
        const payload = {
          format: "gymforge-export",
          version: 1,
          exportedAt: new Date().toISOString(),
          ...profile,
          sessions: sessions.sort((a, b) => a.date.localeCompare(b.date)),
          bodyWeights,
          foodEntries,
          personalRecords,
        };
        downloadTextFile(
          `gymforge-export-${stamp()}.json`,
          JSON.stringify(payload, null, 2),
          "application/json"
        );
      }
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Export failed. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const buttons: { kind: ExportKind; label: string; icon: typeof Download }[] = [
    { kind: "workouts", label: "Workouts (CSV)", icon: Download },
    { kind: "bodyWeight", label: "Body weight (CSV)", icon: Download },
    { kind: "nutrition", label: "Nutrition (CSV)", icon: Download },
    { kind: "json", label: "Everything (JSON)", icon: FileJson },
  ];

  return (
    <div className="card">
      <h3 className="font-semibold mb-1 flex items-center gap-2">
        <Database className="w-5 h-5" />
        Your data
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Download a copy of everything you&apos;ve logged, or bring in your history
        from Strong or Hevy.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {buttons.map(({ kind, label, icon: Icon }) => (
          <button
            key={kind}
            type="button"
            onClick={() => run(kind)}
            disabled={busy !== null}
            className="btn btn-secondary justify-start"
          >
            {busy === kind ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon className="w-4 h-4" />
            )}
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="btn btn-secondary"
        >
          <Upload className="w-4 h-4" />
          Import from Strong / Hevy
        </button>
      </div>

      <ImportWorkoutsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        targetUnit={units}
      />
    </div>
  );
}
