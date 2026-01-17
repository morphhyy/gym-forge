"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
  Calendar,
  Dumbbell,
  LineChart,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Trophy,
} from "lucide-react";
import { format } from "date-fns";
import { StreakBadge } from "@/app/components/streak-badge";
import { WeeklyProgressRing } from "@/app/components/weekly-progress-ring";

export default function DashboardPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const activePlan = useQuery(api.plans.getActivePlan);
  const todayTemplate = useQuery(api.plans.getTodayTemplate, { date: today });
  const weeklyStats = useQuery(api.progress.getWeeklySummary, { weeks: 4 });
  const userData = useQuery(api.users.getCurrentUser);
  const streakData = useQuery(api.streaks.getStreakData);
  const streakStatus = useQuery(api.streaks.getStreakStatus);
  const userAchievements = useQuery(api.streaks.getUserAchievements);

  const weightUnit = userData?.units || "kg";

  const isLoading =
    activePlan === undefined ||
    todayTemplate === undefined;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const weekday = new Date().getDay(); // 0=Sunday, 6=Saturday
  const todayName = dayNames[weekday];

  const thisWeekStats = weeklyStats?.[weeklyStats.length - 1];
  const lastWeekStats = weeklyStats?.[weeklyStats.length - 2];
  const volumeChange =
    thisWeekStats && lastWeekStats && lastWeekStats.totalVolume > 0
      ? Math.round(
          ((thisWeekStats.totalVolume - lastWeekStats.totalVolume) /
            lastWeekStats.totalVolume) *
            100
        )
      : null;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM d")} — Let&apos;s crush it today.
          </p>
        </div>
        {streakData && (
          <StreakBadge
            streak={streakData.currentStreak}
            size="lg"
            showLabel
          />
        )}
      </div>

      {/* Streak at risk warning */}
      {streakStatus?.status === "at_risk" && streakStatus.streak > 0 && (
        <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
          <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-orange-500">
              Your {streakStatus.streak}-day streak is at risk!
            </p>
            <p className="text-sm text-muted-foreground">
              Complete a workout today to keep your streak going.
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Today's Workout Card */}
        <Link href="/log" className="card card-hover group">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-primary-muted rounded-xl flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-primary" />
            </div>
            <ChevronRight className="w-5 h-5 text-muted group-hover:text-foreground transition-colors" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Today&apos;s Workout</h3>
          {todayTemplate?.day ? (
            <p className="text-muted-foreground text-sm">
              {todayTemplate.day.name || todayName} —{" "}
              {todayTemplate.exercises.length} exercise
              {todayTemplate.exercises.length !== 1 ? "s" : ""}
            </p>
          ) : activePlan ? (
            <p className="text-muted-foreground text-sm">Rest day</p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Create a plan to get started
            </p>
          )}
        </Link>

        {/* Plan Card */}
        <Link href="/plan" className="card card-hover group">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-amber-500/15 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-amber-500" />
            </div>
            <ChevronRight className="w-5 h-5 text-muted group-hover:text-foreground transition-colors" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Workout Plan</h3>
          {activePlan ? (
            <p className="text-muted-foreground text-sm">
              {activePlan.name}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              No active plan — create one
            </p>
          )}
        </Link>

        {/* Progress Card */}
        <Link href="/progress" className="card card-hover group">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/15 rounded-xl flex items-center justify-center">
              <LineChart className="w-6 h-6 text-blue-500" />
            </div>
            <ChevronRight className="w-5 h-5 text-muted group-hover:text-foreground transition-colors" />
          </div>
          <h3 className="font-semibold text-lg mb-1">View Progress</h3>
          <p className="text-muted-foreground text-sm">
            Charts and analytics for every lift
          </p>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Weekly Goal Progress */}
        <div className="card">
          {streakData ? (
            <WeeklyProgressRing
              completed={streakData.weeklyCompleted}
              goal={streakData.weeklyGoal}
              size="md"
              showLabel
            />
          ) : (
            <>
              <p className="text-muted-foreground text-sm mb-1">This Week</p>
              <p className="text-2xl font-bold">
                {thisWeekStats?.sessionCount ?? 0}
              </p>
              <p className="text-muted-foreground text-xs">workouts</p>
            </>
          )}
        </div>
        <div className="card">
          <p className="text-muted-foreground text-sm mb-1">Weekly Volume</p>
          <p className="text-2xl font-bold">
            {thisWeekStats?.totalVolume
              ? (thisWeekStats.totalVolume / 1000).toFixed(1) + "k"
              : "0"}
          </p>
          <p className="text-muted-foreground text-xs">{weightUnit} lifted</p>
        </div>
        <div className="card">
          <p className="text-muted-foreground text-sm mb-1">Volume Change</p>
          <div className="flex items-center gap-2">
            <p
              className={`text-2xl font-bold ${
                volumeChange !== null
                  ? volumeChange >= 0
                    ? "text-primary"
                    : "text-danger"
                  : ""
              }`}
            >
              {volumeChange !== null ? `${volumeChange > 0 ? "+" : ""}${volumeChange}%` : "—"}
            </p>
            {volumeChange !== null && volumeChange > 0 && (
              <TrendingUp className="w-5 h-5 text-primary" />
            )}
          </div>
          <p className="text-muted-foreground text-xs">vs last week</p>
        </div>
        <div className="card">
          <p className="text-muted-foreground text-sm mb-1">Exercises</p>
          <p className="text-2xl font-bold">
            {thisWeekStats?.uniqueExercises ?? 0}
          </p>
          <p className="text-muted-foreground text-xs">unique this week</p>
        </div>
      </div>

      {/* Today's Exercises Preview */}
      {todayTemplate?.exercises && todayTemplate.exercises.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Today&apos;s Plan</h2>
            <Link
              href="/log"
              className="text-primary text-sm font-medium hover:underline"
            >
              Start Workout →
            </Link>
          </div>
          <div className="space-y-3">
            {todayTemplate.exercises.slice(0, 5).map((pe: { _id: string; exercise?: { name: string } | null; sets: { repsTarget: number }[] }, index: number) => (
              <div
                key={pe._id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-primary-muted rounded-full flex items-center justify-center text-xs font-medium text-primary">
                    {index + 1}
                  </span>
                  <span className="font-medium">
                    {pe.exercise?.name ?? "Unknown"}
                  </span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {pe.sets.length} × {pe.sets[0]?.repsTarget ?? 0} reps
                </span>
              </div>
            ))}
            {todayTemplate.exercises.length > 5 && (
              <p className="text-muted-foreground text-sm text-center pt-2">
                +{todayTemplate.exercises.length - 5} more exercises
              </p>
            )}
          </div>
        </div>
      )}

      {/* Achievements - minimal display */}
      {userAchievements && userAchievements.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h2 className="font-semibold">Achievements</h2>
            </div>
            <span className="text-sm text-muted-foreground">{userAchievements.length} unlocked</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {userAchievements.slice(0, 6).map((achievement: { _id: string; type: string }) => {
              const achievementConfig: Record<string, { label: string; color: string }> = {
                first_workout: { label: "First Steps", color: "bg-primary/10 text-primary" },
                streak_3: { label: "On Fire", color: "bg-orange-500/10 text-orange-500" },
                streak_7: { label: "Week Warrior", color: "bg-orange-500/10 text-orange-500" },
                streak_14: { label: "Consistency King", color: "bg-orange-500/10 text-orange-500" },
                streak_30: { label: "Iron Will", color: "bg-yellow-500/10 text-yellow-500" },
                first_pr: { label: "Record Breaker", color: "bg-yellow-500/10 text-yellow-500" },
              };
              const config = achievementConfig[achievement.type] || { label: achievement.type, color: "bg-muted text-muted-foreground" };

              return (
                <span
                  key={achievement._id}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}
                >
                  {config.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!activePlan && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-primary-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Workout Plan Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create your first workout plan to start tracking your progress and
            building strength.
          </p>
          <Link href="/plan" className="btn btn-primary">
            Create Your Plan
          </Link>
        </div>
      )}
    </div>
  );
}
