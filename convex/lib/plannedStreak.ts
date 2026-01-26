import { QueryCtx } from "../_generated/server";

/**
 * Get the set of weekdays (0=Sunday, 6=Saturday) that have workouts in the active plan.
 * Returns null if there's no active plan or no workout days.
 */
export async function getWorkoutWeekdaysFromActivePlan(
  ctx: QueryCtx,
  userId: string
): Promise<Set<number> | null> {
  // Find the active plan for this user
  const plan = await ctx.db
    .query("plans")
    .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("active", true))
    .first();

  if (!plan) {
    return null;
  }

  // Get all plan days
  const planDays = await ctx.db
    .query("planDays")
    .withIndex("by_plan", (q) => q.eq("planId", plan._id))
    .collect();

  if (planDays.length === 0) {
    return null;
  }

  // Check which days have at least one exercise
  const workoutWeekdays = new Set<number>();

  for (const day of planDays) {
    const exercises = await ctx.db
      .query("planExercises")
      .withIndex("by_plan_day", (q) => q.eq("planDayId", day._id))
      .first();

    if (exercises) {
      workoutWeekdays.add(day.weekday);
    }
  }

  return workoutWeekdays.size > 0 ? workoutWeekdays : null;
}

/**
 * Check if a specific date is a planned workout day.
 */
export function isWorkoutDayForDate(
  dateStr: string,
  workoutWeekdays: Set<number>
): boolean {
  const date = new Date(dateStr);
  const weekday = date.getUTCDay();
  return workoutWeekdays.has(weekday);
}

/**
 * Get the previous scheduled workout date before the given date.
 * Returns null if no workout day is found within maxDaysBack.
 */
export function getPreviousWorkoutDate(
  dateStr: string,
  workoutWeekdays: Set<number>,
  maxDaysBack: number = 14
): string | null {
  const date = new Date(dateStr);

  for (let i = 1; i <= maxDaysBack; i++) {
    date.setUTCDate(date.getUTCDate() - 1);
    const weekday = date.getUTCDay();

    if (workoutWeekdays.has(weekday)) {
      return date.toISOString().split("T")[0];
    }
  }

  return null;
}

/**
 * Check if a session was completed on a specific date.
 */
export async function isSessionCompletedOnDate(
  ctx: QueryCtx,
  userId: string,
  dateStr: string
): Promise<boolean> {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", dateStr))
    .first();

  return session?.completedAt !== undefined;
}

/**
 * Compute the planned streak as of a given date.
 * Only counts consecutive completed workout days (rest days are ignored).
 * 
 * @param ctx - Query context
 * @param userId - User's Clerk ID
 * @param asOfDate - The date to compute streak as of (usually today)
 * @param workoutWeekdays - Set of weekdays that are workout days
 * @returns { streak: number, completedToday: boolean, isWorkoutToday: boolean }
 */
export async function computePlannedStreak(
  ctx: QueryCtx,
  userId: string,
  asOfDate: string,
  workoutWeekdays: Set<number>
): Promise<{
  streak: number;
  completedToday: boolean;
  isWorkoutToday: boolean;
}> {
  const isWorkoutToday = isWorkoutDayForDate(asOfDate, workoutWeekdays);
  let completedToday = false;

  if (isWorkoutToday) {
    completedToday = await isSessionCompletedOnDate(ctx, userId, asOfDate);
  }

  // Start counting streak
  let streak = 0;
  let currentDate = asOfDate;

  // If today is a workout day and completed, count it
  if (isWorkoutToday && completedToday) {
    streak = 1;
    // Move to previous workout day
    const prevDate = getPreviousWorkoutDate(currentDate, workoutWeekdays);
    if (prevDate) {
      currentDate = prevDate;
    } else {
      return { streak, completedToday, isWorkoutToday };
    }
  } else if (isWorkoutToday && !completedToday) {
    // Today is workout day but not completed yet - check from yesterday's workout day
    const prevDate = getPreviousWorkoutDate(currentDate, workoutWeekdays);
    if (prevDate) {
      currentDate = prevDate;
    } else {
      return { streak: 0, completedToday, isWorkoutToday };
    }
  } else {
    // Today is a rest day - check from the most recent workout day
    const prevDate = getPreviousWorkoutDate(currentDate, workoutWeekdays);
    if (prevDate) {
      currentDate = prevDate;
    } else {
      return { streak: 0, completedToday, isWorkoutToday };
    }
  }

  // Walk backward through workout days counting consecutive completed sessions
  const maxIterations = 365; // Safety limit
  for (let i = 0; i < maxIterations; i++) {
    const completed = await isSessionCompletedOnDate(ctx, userId, currentDate);

    if (!completed) {
      // Streak is broken at this workout day
      break;
    }

    streak++;

    // Move to previous workout day
    const prevDate = getPreviousWorkoutDate(currentDate, workoutWeekdays);
    if (!prevDate) {
      break;
    }
    currentDate = prevDate;
  }

  return { streak, completedToday, isWorkoutToday };
}

/**
 * Get today's date in ISO format (YYYY-MM-DD) using UTC time.
 * 
 * WARNING: This returns the UTC date, which may differ from the user's local date
 * depending on their timezone. For user-facing features where the date attribution
 * matters (e.g., "did I work out today?"), consider passing the date from the
 * client where the user's local timezone is known.
 * 
 * For server-side streak calculations, this is acceptable since:
 * 1. Session dates are stored as UTC dates
 * 2. Consistency matters more than absolute accuracy for streak counting
 */
export function getTodayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}
