/** CSV generation helpers for the "Your data" export. */

export type CsvValue = string | number | boolean | null | undefined;

/**
 * Escape one CSV cell. Strings that start with a spreadsheet formula trigger
 * (=, +, -, @, tab, CR) are prefixed with an apostrophe to prevent CSV
 * injection when the file is opened in Excel/Sheets. Numbers are left alone.
 */
export function escapeCsvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "string" ? value : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) lines.push(row.map(escapeCsvCell).join(","));
  return lines.join("\r\n") + "\r\n";
}

export interface ExportSession {
  date: string;
  notes?: string;
  sets: {
    exerciseName: string;
    setIndex: number;
    weight: number;
    repsActual: number;
    rpe?: number;
  }[];
}

export const WORKOUT_CSV_HEADERS = [
  "date",
  "exercise",
  "set #",
  "weight",
  "unit",
  "reps",
  "rpe",
  "notes",
];

/** One row per set. Session notes are repeated on each row of that session. */
export function workoutsToCsv(sessions: ExportSession[], unit: string): string {
  const rows: CsvValue[][] = [];
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  for (const s of sorted) {
    for (const set of s.sets) {
      rows.push([
        s.date,
        set.exerciseName,
        set.setIndex + 1,
        set.weight,
        unit,
        set.repsActual,
        set.rpe,
        s.notes,
      ]);
    }
  }
  return toCsv(WORKOUT_CSV_HEADERS, rows);
}

export function bodyWeightsToCsv(
  entries: { date: string; weight: number; notes?: string }[],
  unit: string
): string {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return toCsv(
    ["date", "weight", "unit", "notes"],
    sorted.map((e) => [e.date, e.weight, unit, e.notes])
  );
}

export function foodEntriesToCsv(
  entries: {
    date: string;
    mealType: string;
    foodName: string;
    servingSize?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    aiAnalyzed: boolean;
    description?: string;
  }[]
): string {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return toCsv(
    [
      "date",
      "meal",
      "food",
      "serving size",
      "calories",
      "protein (g)",
      "carbs (g)",
      "fat (g)",
      "fiber (g)",
      "sugar (g)",
      "ai analyzed",
      "description",
    ],
    sorted.map((e) => [
      e.date,
      e.mealType,
      e.foodName,
      e.servingSize,
      e.calories,
      e.protein,
      e.carbs,
      e.fat,
      e.fiber,
      e.sugar,
      e.aiAnalyzed,
      e.description,
    ])
  );
}

/** Trigger a browser download of a text file. */
export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
