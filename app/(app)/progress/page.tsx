"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { differenceInDays, format, parseISO } from "date-fns";
import {
  ArrowRight,
  Calendar,
  Dumbbell,
  LineChart,
  Minus,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import Link from "next/link";
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

// Type for chart data
interface VolumeChartDataPoint {
  week: string;
  volume: number;
  sessions: number;
  exercises: number;
}

// Type for custom tooltip props
interface VolumeTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    value: number;
  }>;
  label?: string;
  weightUnit?: string;
}

// Custom tooltip component - defined outside render to avoid recreation
function VolumeTooltip({ active, payload, label, weightUnit = "kg" }: VolumeTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium mb-1">{label}</p>
        <p className="text-sm text-primary">
          Volume: {payload[0].value}k {weightUnit}
        </p>
      </div>
    );
  }
  return null;
}

// Muscle group color mapping
const muscleColors: Record<string, { badge: string; progress: string }> = {
  Legs: { badge: "bg-purple-500/15 text-purple-500 border-purple-500/30", progress: "bg-purple-500" },
  Chest: { badge: "bg-red-500/15 text-red-500 border-red-500/30", progress: "bg-red-500" },
  Back: { badge: "bg-blue-500/15 text-blue-500 border-blue-500/30", progress: "bg-blue-500" },
  Shoulders: { badge: "bg-amber-500/15 text-amber-500 border-amber-500/30", progress: "bg-amber-500" },
  Arms: { badge: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30", progress: "bg-cyan-500" },
  Core: { badge: "bg-green-500/15 text-green-500 border-green-500/30", progress: "bg-green-500" },
  Other: { badge: "bg-muted text-muted-foreground border-muted", progress: "bg-muted-foreground" },
};

// Level system based on weight
function getLevel(weight: number) {
  if (weight >= 100) return { level: 5, name: "Elite", color: "text-yellow-500", nextThreshold: null, prevThreshold: 100 };
  if (weight >= 75) return { level: 4, name: "Advanced", color: "text-purple-500", nextThreshold: 100, prevThreshold: 75 };
  if (weight >= 50) return { level: 3, name: "Intermediate", color: "text-blue-500", nextThreshold: 75, prevThreshold: 50 };
  if (weight >= 25) return { level: 2, name: "Beginner", color: "text-green-500", nextThreshold: 50, prevThreshold: 25 };
  return { level: 1, name: "Novice", color: "text-muted-foreground", nextThreshold: 25, prevThreshold: 0 };
}

// Trend calculation
function getTrend(bestWeight: number, oldestWeight: number) {
  if (oldestWeight === 0) return { type: "steady" as const, label: "New", icon: Minus };
  const ratio = bestWeight / oldestWeight;
  if (ratio > 1.05) return { type: "improving" as const, label: "Improving", icon: TrendingUp };
  if (ratio < 0.95) return { type: "focus" as const, label: "Focus needed", icon: TrendingDown };
  return { type: "steady" as const, label: "Steady", icon: Minus };
}

// Days ago helper
function getDaysAgo(dateString: string) {
  const days = differenceInDays(new Date(), parseISO(dateString));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

// Type for exercise stats from the query
type ExerciseStatItem = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup?: string;
  lastWeight: number;
  lastDate: string;
  sessionCount: number;
  totalVolume: number;
  bestWeight: number;
  bestWeightDate: string;
  oldestWeight: number;
  recentPR: boolean;
};

// Gamified Exercise Progress Card
function ExerciseProgressCard({
  exercise,
  weightUnit,
}: {
  exercise: ExerciseStatItem;
  weightUnit: string;
}) {
  const muscleGroup = exercise.muscleGroup || "Other";
  const colors = muscleColors[muscleGroup] || muscleColors.Other;
  const level = getLevel(exercise.bestWeight);
  const trend = getTrend(exercise.bestWeight, exercise.oldestWeight);
  const daysAgo = getDaysAgo(exercise.lastDate);

  // Calculate progress percentage to next level
  let progressPercent = 100;
  if (level.nextThreshold !== null) {
    const range = level.nextThreshold - level.prevThreshold;
    const current = exercise.bestWeight - level.prevThreshold;
    progressPercent = Math.min(100, Math.max(0, (current / range) * 100));
  }

  const TrendIcon = trend.icon;

  return (
    <Link
      href={`/progress/${exercise.exerciseId}`}
      className="card card-hover group block"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border shrink-0 ${colors.badge}`}>
            {muscleGroup}
          </span>
          {exercise.recentPR && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/15 text-yellow-500 border border-yellow-500/30 shrink-0">
              <Trophy className="w-3 h-3" />
              PR
            </span>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>

      {/* Exercise name and trend */}
      <h4 className="font-semibold text-base truncate mb-1">
        {exercise.exerciseName}
      </h4>
      <div className="flex items-center gap-2 text-sm mb-4">
        <TrendIcon
          className={`w-3.5 h-3.5 ${trend.type === "improving"
              ? "text-green-500"
              : trend.type === "focus"
                ? "text-orange-500"
                : "text-muted-foreground"
            }`}
        />
        <span
          className={`${trend.type === "improving"
              ? "text-green-500"
              : trend.type === "focus"
                ? "text-orange-500"
                : "text-muted-foreground"
            }`}
        >
          {trend.label}
        </span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground">{daysAgo}</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-xl font-bold">{exercise.bestWeight}</p>
          <p className="text-xs text-muted-foreground">{weightUnit} best</p>
        </div>
        <div>
          <p className="text-xl font-bold">{exercise.sessionCount}</p>
          <p className="text-xs text-muted-foreground">Sessions</p>
        </div>
        <div>
          <p className="text-xl font-bold">
            {exercise.totalVolume >= 1000
              ? `${(exercise.totalVolume / 1000).toFixed(1)}k`
              : exercise.totalVolume}
          </p>
          <p className="text-xs text-muted-foreground">Volume</p>
        </div>
      </div>

      {/* Progress bar and level */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className={`font-medium ${level.color}`}>Level {level.level}</span>
          <span className="text-muted-foreground">{level.name}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colors.progress}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {level.nextThreshold !== null && (
          <p className="text-xs text-muted-foreground mt-1">
            {exercise.bestWeight}/{level.nextThreshold} {weightUnit} to Level {level.level + 1}
          </p>
        )}
        {level.nextThreshold === null && (
          <p className="text-xs text-yellow-500 mt-1">Max level reached!</p>
        )}
      </div>
    </Link>
  );
}

export default function ProgressPage() {
  const weeklyStats = useQuery(api.progress.getWeeklySummary, { weeks: 12 });
  const exerciseStats = useQuery(api.progress.getAllExerciseStats);
  const userData = useQuery(api.users.getCurrentUser);

  const weightUnit = userData?.units || "kg";
  const isLoading = weeklyStats === undefined || exerciseStats === undefined;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="card h-64 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Calculate trends
  const thisWeek = weeklyStats[weeklyStats.length - 1];
  const lastWeek = weeklyStats[weeklyStats.length - 2];
  const volumeChange =
    thisWeek && lastWeek && lastWeek.totalVolume > 0
      ? Math.round(
        ((thisWeek.totalVolume - lastWeek.totalVolume) /
          lastWeek.totalVolume) *
        100
      )
      : null;

  const chartData: VolumeChartDataPoint[] = weeklyStats.map((week) => ({
    week: format(parseISO(week.weekStart), "MMM d"),
    volume: Math.round(week.totalVolume / 1000),
    sessions: week.sessionCount,
    exercises: week.uniqueExercises,
  }));

  // Group exercises by muscle group
  const exercisesByMuscle = exerciseStats.reduce(
    (acc: Record<string, typeof exerciseStats>, exercise: (typeof exerciseStats)[number]) => {
      const group = exercise.muscleGroup || "Other";
      if (!acc[group]) acc[group] = [];
      acc[group].push(exercise);
      return acc;
    },
    {} as Record<string, typeof exerciseStats>
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Progress
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your strength gains over time
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">This Week</span>
          </div>
          <p className="text-3xl font-bold">{thisWeek?.sessionCount ?? 0}</p>
          <p className="text-sm text-muted-foreground">workouts</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Dumbbell className="w-5 h-5 text-secondary" />
            <span className="text-sm text-muted-foreground">Weekly Volume</span>
          </div>
          <p className="text-3xl font-bold">
            {thisWeek ? (thisWeek.totalVolume / 1000).toFixed(1) + "k" : "0"}
          </p>
          <p className="text-sm text-muted-foreground">{weightUnit} lifted</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            {volumeChange !== null && volumeChange >= 0 ? (
              <TrendingUp className="w-5 h-5 text-primary" />
            ) : (
              <TrendingDown className="w-5 h-5 text-danger" />
            )}
            <span className="text-sm text-muted-foreground">Volume Trend</span>
          </div>
          <p
            className={`text-3xl font-bold ${volumeChange !== null
                ? volumeChange >= 0
                  ? "text-primary"
                  : "text-danger"
                : ""
              }`}
          >
            {volumeChange !== null ? `${volumeChange > 0 ? "+" : ""}${volumeChange}%` : "—"}
          </p>
          <p className="text-sm text-muted-foreground">vs last week</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <LineChart className="w-5 h-5 text-accent" />
            <span className="text-sm text-muted-foreground">Exercises</span>
          </div>
          <p className="text-3xl font-bold">{exerciseStats.length}</p>
          <p className="text-sm text-muted-foreground">tracked</p>
        </div>
      </div>

      {/* Volume Chart */}
      <div className="card">
        <h2 className="font-semibold text-lg mb-4">Weekly Volume</h2>
        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
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
                  dataKey="week"
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
                  tickFormatter={(value) => `${value}k`}
                />
                <Tooltip content={<VolumeTooltip weightUnit={weightUnit} />} />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#volumeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">
              No data yet. Start logging workouts!
            </p>
          </div>
        )}
      </div>

      {/* Exercise Progress */}
      <div>
        <h2 className="font-semibold text-lg mb-4">Exercise Progress</h2>
        {exerciseStats.length === 0 ? (
          <div className="card text-center py-12">
            <Dumbbell className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-muted-foreground">
              No exercise data yet. Start logging workouts to see your progress!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(exercisesByMuscle).map(([muscleGroup, exercises]: [string, typeof exerciseStats]) => (
              <div key={muscleGroup}>
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
                  {muscleGroup}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {exercises.map((exercise: { exerciseId: string; exerciseName: string; bestWeight: number; lastWeight: number; totalVolume: number }) => (
                    <Link
                      key={exercise.exerciseId}
                      href={`/progress/${exercise.exerciseId}`}
                      className="card card-hover group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium truncate pr-2">
                          {exercise.exerciseName}
                        </h4>
                        <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-primary">
                          {exercise.bestWeight}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {weightUnit} best
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Last: {exercise.lastWeight} {weightUnit}</span>
                        <span>
                          {(exercise.totalVolume / 1000).toFixed(1)}k vol
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
