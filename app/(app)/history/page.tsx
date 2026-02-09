"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  isBefore,
  isAfter,
  parseISO,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarDayDetail } from "@/app/components/calendar-day-detail";

export default function HistoryPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const sessionsForMonth = useQuery(api.sessions.getSessionsForMonth, {
    year: currentMonth.getFullYear(),
    month: currentMonth.getMonth() + 1,
  });
  const activePlan = useQuery(api.plans.getActivePlan);
  const userData = useQuery(api.users.getCurrentUser);

  const weightUnit = userData?.units || "kg";

  const today = startOfDay(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startOffset = getDay(monthStart); // 0=Sunday

  // Check if a given weekday (0-6) is a planned workout day
  const isPlannedWorkoutDay = (weekday: number): boolean => {
    if (!activePlan?.days) return false;
    return activePlan.days.some(
      (day) => day.weekday === weekday && day.exercises.length > 0
    );
  };

  // Find a session for a given date string
  const getSessionForDate = (dateStr: string) => {
    if (!sessionsForMonth) return null;
    return sessionsForMonth.find((s) => s.date === dateStr) ?? null;
  };

  const isLoading =
    sessionsForMonth === undefined ||
    activePlan === undefined ||
    userData === undefined;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="card h-16 animate-pulse" />
        <div className="card">
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-11 bg-card rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Find the selected session for the detail panel
  const selectedSession = selectedDate
    ? getSessionForDate(selectedDate)
    : null;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Workout History
        </h1>
        <p className="text-muted-foreground mt-1">
          View your training calendar
        </p>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="btn btn-ghost p-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="btn btn-ghost p-2"
          disabled={isAfter(startOfMonth(addMonths(currentMonth, 1)), today)}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="card">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Leading empty cells for offset */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[44px]" />
          ))}

          {/* Day cells */}
          {daysInMonth.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayOfMonth = day.getDate();
            const weekday = getDay(day);
            const isFuture = isAfter(startOfDay(day), today);
            const isToday = isSameDay(day, today);
            const isSelected = selectedDate === dateStr;
            const session = getSessionForDate(dateStr);
            const hasCompletedWorkout = session?.completedAt != null;
            const isPast = isBefore(startOfDay(day), today);
            const isMissed =
              isPast &&
              !hasCompletedWorkout &&
              isPlannedWorkoutDay(weekday);

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`
                  min-h-[44px] rounded-lg flex flex-col items-center justify-center gap-1
                  transition-colors relative
                  ${isFuture ? "opacity-40" : ""}
                  ${isToday ? "ring-2 ring-primary" : ""}
                  ${isSelected ? "bg-primary/20" : "hover:bg-card"}
                `}
              >
                <span className="text-sm font-medium">{dayOfMonth}</span>
                {/* Status dot */}
                {hasCompletedWorkout && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
                {isMissed && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span>Missed</span>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedDate && (
        <CalendarDayDetail
          date={selectedDate}
          session={selectedSession}
          weightUnit={weightUnit}
        />
      )}
    </div>
  );
}
