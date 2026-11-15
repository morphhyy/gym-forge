"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkoutLogger, LoggerSkeleton } from "@/app/components/log/workout-logger";

function LogPageContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  const [selectedDate, setSelectedDate] = useState(
    dateParam || format(new Date(), "yyyy-MM-dd")
  );

  // Follow the URL date param when it changes (without fighting the
  // prev/next buttons, which the old effect-based sync reset immediately).
  const [prevDateParam, setPrevDateParam] = useState(dateParam);
  if (dateParam !== prevDateParam) {
    setPrevDateParam(dateParam);
    if (dateParam) setSelectedDate(dateParam);
  }

  const handleDateChange = (direction: "prev" | "next") => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + (direction === "next" ? 1 : -1));
    setSelectedDate(format(date, "yyyy-MM-dd"));
  };

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Log Workout
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your sets and weights
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-card rounded-lg p-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleDateChange("prev")}
            className="btn btn-ghost p-2 min-h-11 min-w-11"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="px-2 py-1 text-center min-w-[100px] max-sm:min-w-[200px] max-sm:flex-1">
            <p className="font-semibold">
              {isToday ? "Today" : format(new Date(selectedDate), "EEE, MMM d")}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(selectedDate), "yyyy")}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleDateChange("next")}
            className="btn btn-ghost p-2 min-h-11 min-w-11"
            disabled={isToday}
            aria-label="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Remount per date so drafts / focus state never leak across days */}
      <WorkoutLogger key={selectedDate} date={selectedDate} />
    </div>
  );
}

function LogPageFallback() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-card rounded animate-pulse" />
      <LoggerSkeleton />
    </div>
  );
}

export default function LogPage() {
  return (
    <Suspense fallback={<LogPageFallback />}>
      <LogPageContent />
    </Suspense>
  );
}
