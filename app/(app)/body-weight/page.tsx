"use client";

import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { format, parseISO } from "date-fns";
import {
  Minus,
  Plus,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

// Types for chart data
interface WeightChartDataPoint {
  date: string;
  weight: number;
}

// Custom tooltip for the weight chart
interface WeightTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    value: number;
  }>;
  label?: string;
  weightUnit?: string;
}

function WeightTooltip({ active, payload, label, weightUnit = "kg" }: WeightTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium mb-1">{label}</p>
        <p className="text-sm text-primary">
          {payload[0].value} {weightUnit}
        </p>
      </div>
    );
  }
  return null;
}

export default function BodyWeightPage() {
  const [period, setPeriod] = useState<30 | 60 | 90>(90);
  const [dateInput, setDateInput] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weightInput, setWeightInput] = useState("");
  const [notesInput, setNotesInput] = useState("");

  const weightHistory = useQuery(api.bodyWeight.getWeightHistory, { days: period });
  const userData = useQuery(api.users.getCurrentUser);
  const logWeight = useMutation(api.bodyWeight.logWeight);
  const deleteWeight = useMutation(api.bodyWeight.deleteWeight);

  const weightUnit = userData?.units || "kg";
  const isLoading = weightHistory === undefined;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-24 animate-pulse" />
          ))}
        </div>
        <div className="card h-72 animate-pulse" />
        <div className="card h-32 animate-pulse" />
        <div className="card h-48 animate-pulse" />
      </div>
    );
  }

  // Sort entries chronologically for chart and stats
  const sortedEntries = [...weightHistory].sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  // Stats calculations
  const latestEntry = sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1] : null;
  const oldestEntry = sortedEntries.length > 0 ? sortedEntries[0] : null;
  const periodChange =
    latestEntry && oldestEntry && sortedEntries.length > 1
      ? Number((latestEntry.weight - oldestEntry.weight).toFixed(1))
      : null;
  const lowestWeight =
    sortedEntries.length > 0
      ? Math.min(...sortedEntries.map((e) => e.weight))
      : null;
  const highestWeight =
    sortedEntries.length > 0
      ? Math.max(...sortedEntries.map((e) => e.weight))
      : null;

  // Chart data
  const chartData: WeightChartDataPoint[] = sortedEntries.map((entry) => ({
    date: format(parseISO(entry.date), "MMM d"),
    weight: entry.weight,
  }));

  // Recent entries sorted newest first for the history list
  const recentEntries = [...weightHistory].sort(
    (a, b) => b.date.localeCompare(a.date)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weightInput) return;

    await logWeight({
      date: dateInput,
      weight: parseFloat(weightInput),
      notes: notesInput || undefined,
    });

    setWeightInput("");
    setNotesInput("");
  }

  async function handleDelete(id: typeof recentEntries[number]["_id"]) {
    await deleteWeight({ id });
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Body Weight
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your body weight over time
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Scale className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Current</span>
          </div>
          <p className="text-3xl font-bold">
            {latestEntry ? latestEntry.weight : "--"}
          </p>
          <p className="text-sm text-muted-foreground">{weightUnit}</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            {periodChange !== null && periodChange > 0 ? (
              <TrendingUp className="w-5 h-5 text-danger" />
            ) : periodChange !== null && periodChange < 0 ? (
              <TrendingDown className="w-5 h-5 text-primary" />
            ) : (
              <Minus className="w-5 h-5 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">Change</span>
          </div>
          <p
            className={`text-3xl font-bold ${
              periodChange !== null
                ? periodChange > 0
                  ? "text-danger"
                  : periodChange < 0
                    ? "text-primary"
                    : ""
                : ""
            }`}
          >
            {periodChange !== null
              ? `${periodChange > 0 ? "+" : ""}${periodChange}`
              : "--"}
          </p>
          <p className="text-sm text-muted-foreground">{weightUnit} in {period}d</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Lowest</span>
          </div>
          <p className="text-3xl font-bold">
            {lowestWeight !== null ? lowestWeight : "--"}
          </p>
          <p className="text-sm text-muted-foreground">{weightUnit}</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-muted-foreground">Highest</span>
          </div>
          <p className="text-3xl font-bold">
            {highestWeight !== null ? highestWeight : "--"}
          </p>
          <p className="text-sm text-muted-foreground">{weightUnit}</p>
        </div>
      </div>

      {/* Area Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Weight Over Time</h2>
          <div className="flex gap-1">
            {([30, 60, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  period === d
                    ? "bg-primary text-primary-foreground font-medium"
                    : "btn-ghost"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#2a2a35"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="#71717a"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={["dataMin - 2", "dataMax + 2"]}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip content={<WeightTooltip weightUnit={weightUnit} />} />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#weightGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">
              No data yet. Log your weight below to start tracking!
            </p>
          </div>
        )}
      </div>

      {/* Log Weight Form */}
      <div className="card">
        <h2 className="font-semibold text-lg mb-4">Log Weight</h2>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="input sm:w-44"
            required
          />
          <input
            type="number"
            step="0.1"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder={`Weight (${weightUnit})`}
            className="input sm:w-36"
            required
          />
          <input
            type="text"
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            placeholder="Notes (optional)"
            className="input sm:flex-1"
          />
          <button type="submit" className="btn btn-primary" disabled={!weightInput}>
            <Plus className="w-4 h-4" />
            Log
          </button>
        </form>
      </div>

      {/* History List */}
      <div className="card">
        <h2 className="font-semibold text-lg mb-4">Recent Entries</h2>
        {recentEntries.length === 0 ? (
          <div className="text-center py-8">
            <Scale className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-muted-foreground">
              No entries yet. Log your first weight above!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentEntries.map((entry) => (
              <div
                key={entry._id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      {format(parseISO(entry.date), "MMM d, yyyy")}
                    </span>
                    <span className="text-primary font-bold">
                      {entry.weight} {weightUnit}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {entry.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(entry._id)}
                  className="btn btn-ghost p-2 ml-2 text-muted-foreground hover:text-danger"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
