// App-level domain helpers (formatting, weekdays, metrics).
// `cn` lives in @/lib/utils, where shadcn (components.json) expects it.

// Calculate estimated 1RM using Epley formula
export function calculateE1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

// Calculate total volume (weight × reps)
export function calculateVolume(
  sets: { weight: number; reps: number }[]
): number {
  return sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
}

// Format weight with units
export function formatWeight(weight: number, units: "lb" | "kg" = "kg"): string {
  return `${weight} ${units}`;
}

// Format large numbers (e.g., 12500 -> 12.5k)
export function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
}

// Get day name from weekday number (0=Sunday, 6=Saturday)
export function getDayName(weekday: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[weekday] ?? "Unknown";
}

// Get short day name (0=Sunday, 6=Saturday)
export function getShortDayName(weekday: number): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[weekday] ?? "???";
}
