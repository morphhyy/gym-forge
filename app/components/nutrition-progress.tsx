"use client";

import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { format, addDays, subDays } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings2,
  Trash2,
  Utensils,
} from "lucide-react";
import { useState } from "react";
import { MacroProgressBar } from "./macro-progress-bar";
import { AddFoodDialog } from "./add-food-dialog";
import {
  NutritionGoalsDialog,
  DEFAULT_NUTRITION_GOALS,
} from "./nutrition-goals-dialog";
import { CalorieChart, MacroChart } from "./nutrition-charts";

type Period = "7" | "30" | "90";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function NutritionProgress() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [period, setPeriod] = useState<Period>("7");
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);

  const userData = useQuery(api.users.getCurrentUser);
  const isPaidUser = userData?.isPaidUser === true;

  const goals = useQuery(api.nutrition.getNutritionGoals);
  const entries = useQuery(api.nutrition.getFoodEntriesByDate, {
    date: selectedDate,
  });
  const endDate = today;
  const startDate = format(
    subDays(new Date(), Number(period) - 1),
    "yyyy-MM-dd"
  );
  const summaries = useQuery(api.nutrition.getDailySummaries, {
    startDate,
    endDate,
  });
  const deleteFoodEntry = useMutation(api.nutrition.deleteFoodEntry);

  const activeGoals = goals ?? DEFAULT_NUTRITION_GOALS;
  const isLoading = entries === undefined;

  // Calculate daily totals
  const dailyTotals = (entries ?? []).reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: acc.protein + entry.protein,
      carbs: acc.carbs + entry.carbs,
      fat: acc.fat + entry.fat,
      fiber: acc.fiber + (entry.fiber ?? 0),
      sugar: acc.sugar + (entry.sugar ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
  );

  // Group entries by meal type
  const entriesByMeal = MEAL_ORDER.reduce(
    (acc, meal) => {
      const mealEntries = (entries ?? []).filter((e) => e.mealType === meal);
      if (mealEntries.length > 0) acc[meal] = mealEntries;
      return acc;
    },
    {} as Record<string, typeof entries>
  );

  // Chart data
  const chartData = (summaries ?? []).map((s) => ({
    date: format(new Date(s.date + "T12:00:00"), "MMM d"),
    calories: s.calories,
    protein: s.protein,
    carbs: s.carbs,
    fat: s.fat,
  }));

  const navigateDate = (direction: "prev" | "next") => {
    const current = new Date(selectedDate + "T12:00:00");
    const newDate =
      direction === "prev" ? subDays(current, 1) : addDays(current, 1);
    setSelectedDate(format(newDate, "yyyy-MM-dd"));
  };

  const isToday = selectedDate === today;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-card rounded animate-pulse" />
        <div className="card h-32 animate-pulse" />
        <div className="card h-48 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Navigator + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDate("prev")}
            aria-label="Previous day"
            className="p-2 rounded-lg hover:bg-card transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-[140px]">
            <p className="font-semibold">
              {isToday
                ? "Today"
                : format(new Date(selectedDate + "T12:00:00"), "EEEE")}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(selectedDate + "T12:00:00"), "MMM d, yyyy")}
            </p>
          </div>
          <button
            onClick={() => navigateDate("next")}
            disabled={isToday}
            aria-label="Next day"
            className="p-2 rounded-lg hover:bg-card transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setGoalsOpen(true)}
            aria-label="Nutrition goals"
            className="p-2 rounded-lg hover:bg-card transition-colors text-muted-foreground"
          >
            <Settings2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setAddFoodOpen(true)}
            className="btn btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            {isPaidUser ? "Scan Food" : "Add Food"}
          </button>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Daily Summary</h3>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {Math.round(dailyTotals.calories)}
            </p>
            <p className="text-sm text-muted-foreground">
              / {activeGoals.calories} kcal
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <MacroProgressBar
            label="Protein"
            current={dailyTotals.protein}
            target={activeGoals.protein}
            color="bg-blue-500"
          />
          <MacroProgressBar
            label="Carbs"
            current={dailyTotals.carbs}
            target={activeGoals.carbs}
            color="bg-amber-500"
          />
          <MacroProgressBar
            label="Fat"
            current={dailyTotals.fat}
            target={activeGoals.fat}
            color="bg-purple-500"
          />
          <MacroProgressBar
            label="Fiber"
            current={dailyTotals.fiber}
            target={activeGoals.fiber ?? DEFAULT_NUTRITION_GOALS.fiber}
          />
          <MacroProgressBar
            label="Sugar"
            current={dailyTotals.sugar}
            target={activeGoals.sugar ?? DEFAULT_NUTRITION_GOALS.sugar}
            color="bg-pink-500"
          />
        </div>
      </div>

      {/* Food Log */}
      <div className="card">
        <h3 className="font-semibold mb-4">Food Log</h3>
        {Object.keys(entriesByMeal).length === 0 ? (
          <div className="text-center py-8">
            <Utensils className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No food logged yet. Tap &quot;{isPaidUser ? "Scan Food" : "Add Food"}&quot; to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(entriesByMeal).map(([meal, mealEntries]) => (
              <div key={meal}>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {MEAL_LABELS[meal] ?? meal}
                </p>
                <div className="space-y-2">
                  {mealEntries!.map((entry) => (
                    <div
                      key={entry._id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover transition-colors group"
                    >
                      {entry.imageUrl ? (
                        <img
                          src={entry.imageUrl}
                          alt={entry.foodName}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Utensils className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {entry.foodName}
                        </p>
                        {entry.servingSize && (
                          <p className="text-xs text-muted-foreground">
                            {entry.servingSize}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium">
                          {entry.calories} kcal
                        </p>
                        <p className="text-xs text-muted-foreground">
                          P:{entry.protein} C:{entry.carbs} F:{entry.fat}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteFoodEntry({ id: entry._id })}
                        className="p-1.5 rounded-md sm:opacity-0 sm:group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Trends</h3>
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {(["7", "30", "90"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  period === p
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}D
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Calories</p>
            <CalorieChart
              data={chartData}
              calorieGoal={activeGoals.calories}
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Macros{" "}
              <span className="inline-flex gap-3 ml-2">
                <span className="text-blue-500">Protein</span>
                <span className="text-amber-500">Carbs</span>
                <span className="text-purple-500">Fat</span>
              </span>
            </p>
            <MacroChart data={chartData} />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {userData !== undefined && (
        <AddFoodDialog
          open={addFoodOpen}
          onOpenChange={setAddFoodOpen}
          date={selectedDate}
          isPaidUser={isPaidUser}
        />
      )}
      <NutritionGoalsDialog open={goalsOpen} onOpenChange={setGoalsOpen} />
    </div>
  );
}
