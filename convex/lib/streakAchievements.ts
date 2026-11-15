import { MutationCtx } from "../_generated/server";
import { diffDays } from "./dates";

// Streak achievement definitions (single source of truth for streaks.ts and sessions.ts)
export const STREAK_ACHIEVEMENTS = [
  { type: "streak_3", threshold: 3, label: "3-Day Streak" },
  { type: "streak_7", threshold: 7, label: "Week Warrior" },
  { type: "streak_14", threshold: 14, label: "Two Week Titan" },
  { type: "streak_30", threshold: 30, label: "Monthly Master" },
  { type: "streak_60", threshold: 60, label: "Iron Will" },
  { type: "streak_100", threshold: 100, label: "Century Club" },
] as const;

/** True if the two calendar dates are exactly one day apart (either order). */
export function areConsecutiveDays(date1: string, date2: string): boolean {
  return Math.abs(diffDays(date1, date2)) === 1;
}

/**
 * Calendar-based (no active plan) streak: continue the streak if the new
 * workout is the day after the last one, otherwise restart at 1.
 * Caller must ensure lastWorkoutDate !== sessionDate.
 */
export function nextCalendarStreak(
  lastWorkoutDate: string | undefined,
  currentStreak: number,
  sessionDate: string
): number {
  if (!lastWorkoutDate) return 1;
  if (areConsecutiveDays(lastWorkoutDate, sessionDate)) return currentStreak + 1;
  return 1;
}

/**
 * Insert any streak achievements crossed when going from `previousStreak` to
 * `newStreak` that the user doesn't already have. Returns the newly awarded types.
 */
export async function awardStreakAchievements(
  ctx: MutationCtx,
  userId: string,
  previousStreak: number,
  newStreak: number
): Promise<string[]> {
  const newAchievements: string[] = [];

  for (const achievement of STREAK_ACHIEVEMENTS) {
    if (newStreak >= achievement.threshold && previousStreak < achievement.threshold) {
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_user_type", (q) =>
          q.eq("userId", userId).eq("type", achievement.type)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("achievements", {
          userId,
          type: achievement.type,
          unlockedAt: Date.now(),
          metadata: { streak: newStreak },
        });
        newAchievements.push(achievement.type);
      }
    }
  }

  return newAchievements;
}
