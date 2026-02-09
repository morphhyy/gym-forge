"use client";

import { Calendar } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { WorkoutProgress } from "@/app/components/workout-progress";
import { NutritionProgress } from "@/app/components/nutrition-progress";

function ProgressTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") || "workouts";

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "workouts") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(`/progress${query ? `?${query}` : ""}`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Progress
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your strength gains and nutrition
          </p>
        </div>
        <Link href="/history" className="btn btn-secondary text-sm">
          <Calendar className="w-4 h-4" />
          Calendar
        </Link>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-card border border-border rounded-lg w-fit">
        <button
          onClick={() => setTab("workouts")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "workouts"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Workouts
        </button>
        <button
          onClick={() => setTab("nutrition")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "nutrition"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Nutrition
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "workouts" ? <WorkoutProgress /> : <NutritionProgress />}
    </div>
  );
}

export default function ProgressPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="card h-64 animate-pulse" />
      </div>
    }>
      <ProgressTabs />
    </Suspense>
  );
}
