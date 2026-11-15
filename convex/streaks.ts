import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId, requireAuth } from "./auth";
import {
  computePlannedStreak,
  getPreviousWorkoutDate,
  getWorkoutWeekdaysFromActivePlan,
  isSessionCompletedOnDate
} from "./lib/plannedStreak";
import { addDays, resolveToday, weekStartSunday } from "./lib/dates";
import {
  STREAK_ACHIEVEMENTS,
  awardStreakAchievements,
  nextCalendarStreak,
} from "./lib/streakAchievements";

// Get current streak data for the user
export const getStreakData = query({
  args: {
    // Client's local calendar date (YYYY-MM-DD). Optional only for old clients;
    // falls back to the UTC date when omitted.
    today: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
      .first();

    if (!user) return null;

    const today = resolveToday(args.today);

    // Get weekly progress (sessions from this week's Sunday onward)
    const weekStart = weekStartSunday(today);
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", weekStart)
      )
      .collect();

    const weeklyCompleted = sessions.filter((s) => s.completedAt).length;

    // Get workout weekdays from active plan
    const workoutWeekdays = await getWorkoutWeekdaysFromActivePlan(ctx, userId);

    let currentStreak = user.currentStreak ?? 0;

    // If user has an active plan with workout days, compute plan-aware streak
    if (workoutWeekdays && workoutWeekdays.size > 0) {
      const streakResult = await computePlannedStreak(ctx, userId, today, workoutWeekdays);
      currentStreak = streakResult.streak;
    }

    return {
      currentStreak,
      longestStreak: user.longestStreak ?? 0,
      lastWorkoutDate: user.lastWorkoutDate ?? null,
      weeklyGoal: user.weeklyGoal ?? 3,
      weeklyCompleted,
    };
  },
});

// Update streak when a session is completed
export const updateStreak = mutation({
  args: {
    sessionDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const lastWorkoutDate = user.lastWorkoutDate;
    const currentStreak = user.currentStreak ?? 0;
    const longestStreak = user.longestStreak ?? 0;

    // Don't update streak if already logged on this date
    if (lastWorkoutDate === args.sessionDate) {
      return { streak: currentStreak, newAchievements: [] };
    }

    const newStreak = nextCalendarStreak(lastWorkoutDate, currentStreak, args.sessionDate);

    // Calculate new longest streak
    const newLongestStreak = Math.max(longestStreak, newStreak);

    // Check for new achievements
    const newAchievements = await awardStreakAchievements(
      ctx,
      userId,
      currentStreak,
      newStreak
    );

    // Update user record
    await ctx.db.patch(user._id, {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastWorkoutDate: args.sessionDate,
    });

    return {
      streak: newStreak,
      longestStreak: newLongestStreak,
      newAchievements,
    };
  },
});

// Set weekly workout goal
export const setWeeklyGoal = mutation({
  args: {
    goal: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    if (args.goal < 1 || args.goal > 7) {
      throw new Error("Weekly goal must be between 1 and 7");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      weeklyGoal: args.goal,
    });

    return { success: true };
  },
});

// Get user achievements
export const getUserAchievements = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Add labels to achievements
    return achievements.map((a) => {
      const info = STREAK_ACHIEVEMENTS.find((sa) => sa.type === a.type);
      return {
        ...a,
        label: info?.label ?? a.type,
      };
    });
  },
});

// Check if streak is at risk (hasn't worked out today and streak > 0)
// Now plan-aware: only shows "at_risk" on workout days, rest days never break streak
export const getStreakStatus = query({
  args: {
    // Client's local calendar date (YYYY-MM-DD). Optional only for old clients;
    // falls back to the UTC date when omitted.
    today: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
      .first();

    if (!user) return null;

    const today = resolveToday(args.today);
    const yesterday = addDays(today, -1);

    // Get workout weekdays from active plan
    const workoutWeekdays = await getWorkoutWeekdaysFromActivePlan(ctx, userId);

    // If no active plan, fall back to simple calendar-based logic
    if (!workoutWeekdays || workoutWeekdays.size === 0) {
      const currentStreak = user.currentStreak ?? 0;
      const lastWorkoutDate = user.lastWorkoutDate;

      if (currentStreak === 0) {
        return { status: "none", streak: 0 };
      }

      if (lastWorkoutDate === today) {
        return { status: "completed", streak: currentStreak };
      }

      if (lastWorkoutDate === yesterday) {
        return { status: "at_risk", streak: currentStreak };
      }

      return { status: "broken", streak: 0 };
    }

    // Plan-aware streak status
    const streakResult = await computePlannedStreak(ctx, userId, today, workoutWeekdays);
    const { streak, completedToday, isWorkoutToday } = streakResult;

    if (streak === 0 && !isWorkoutToday) {
      // Rest day with no streak - check if the last workout day was missed
      const lastWorkoutDay = getPreviousWorkoutDate(today, workoutWeekdays);
      if (lastWorkoutDay) {
        const wasCompleted = await isSessionCompletedOnDate(ctx, userId, lastWorkoutDay);
        if (!wasCompleted) {
          return { status: "broken", streak: 0 };
        }
      }
      return { status: "none", streak: 0 };
    }

    if (isWorkoutToday) {
      if (completedToday) {
        return { status: "completed", streak };
      } else if (streak > 0) {
        // Today is a workout day, not done yet, but has an existing streak
        return { status: "at_risk", streak };
      } else {
        // No streak, workout day not completed
        return { status: "none", streak: 0 };
      }
    } else {
      // Rest day - streak is safe, just report the current streak
      if (streak > 0) {
        return { status: "completed", streak };
      }
      return { status: "none", streak: 0 };
    }
  },
});
