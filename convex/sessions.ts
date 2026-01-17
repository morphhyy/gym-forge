import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, getAuthUserId } from "./auth";

// Get or create today's session
export const getOrCreateSession = mutation({
  args: {
    date: v.string(),
    planId: v.optional(v.id("plans")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    // Check for existing session
    const existingSession = await ctx.db
      .query("sessions")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", userId).eq("date", args.date)
      )
      .first();

    if (existingSession) {
      return existingSession._id;
    }

    // Calculate weekday (0=Sunday, 6=Saturday - matches JS Date.getDay())
    const dateObj = new Date(args.date);
    const weekday = dateObj.getUTCDay();

    // Create new session
    return await ctx.db.insert("sessions", {
      userId,
      date: args.date,
      planId: args.planId,
      weekday,
      createdAt: Date.now(),
    });
  },
});

// Get session by date
export const getSessionByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", userId).eq("date", args.date)
      )
      .first();

    if (!session) return null;

    // Get all sets for this session
    const sets = await ctx.db
      .query("sessionSets")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();

    // Get exercise details for each set
    const setsWithExercise = await Promise.all(
      sets.map(async (set) => {
        const exercise = await ctx.db.get(set.exerciseId);
        return { ...set, exercise };
      })
    );

    return {
      ...session,
      sets: setsWithExercise,
    };
  },
});

// Log a set
export const logSet = mutation({
  args: {
    sessionId: v.id("sessions"),
    exerciseId: v.id("exercises"),
    setIndex: v.number(),
    repsActual: v.number(),
    weight: v.number(),
    rpe: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    
    // Verify session belongs to user
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    // Check for existing set at this index
    const existingSet = await ctx.db
      .query("sessionSets")
      .withIndex("by_session_exercise", (q) => 
        q.eq("sessionId", args.sessionId).eq("exerciseId", args.exerciseId)
      )
      .filter((q) => q.eq(q.field("setIndex"), args.setIndex))
      .first();

    if (existingSet) {
      // Update existing set
      await ctx.db.patch(existingSet._id, {
        repsActual: args.repsActual,
        weight: args.weight,
        rpe: args.rpe,
      });
      return existingSet._id;
    } else {
      // Create new set
      return await ctx.db.insert("sessionSets", {
        sessionId: args.sessionId,
        exerciseId: args.exerciseId,
        setIndex: args.setIndex,
        repsActual: args.repsActual,
        weight: args.weight,
        rpe: args.rpe,
        createdAt: Date.now(),
      });
    }
  },
});

// Helper to check if two dates are consecutive days
function areConsecutiveDays(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

// Streak achievement definitions
const STREAK_ACHIEVEMENTS = [
  { type: "streak_3", threshold: 3 },
  { type: "streak_7", threshold: 7 },
  { type: "streak_14", threshold: 14 },
  { type: "streak_30", threshold: 30 },
  { type: "streak_60", threshold: 60 },
  { type: "streak_100", threshold: 100 },
];

// Complete a session
export const completeSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    // Only update streak if session wasn't already completed
    const wasAlreadyCompleted = session.completedAt !== undefined;

    await ctx.db.patch(args.sessionId, {
      completedAt: Date.now(),
      notes: args.notes,
    });

    // Update streak if this is a new completion
    let streakResult = null;
    if (!wasAlreadyCompleted) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", userId))
        .first();

      if (user) {
        const lastWorkoutDate = user.lastWorkoutDate;
        const currentStreak = user.currentStreak ?? 0;
        const longestStreak = user.longestStreak ?? 0;
        const sessionDate = session.date;

        let newStreak = currentStreak;
        const newAchievements: string[] = [];

        // Don't update if already logged for this date
        if (lastWorkoutDate !== sessionDate) {
          if (!lastWorkoutDate) {
            newStreak = 1;
          } else if (areConsecutiveDays(lastWorkoutDate, sessionDate)) {
            newStreak = currentStreak + 1;
          } else {
            newStreak = 1;
          }

          const newLongestStreak = Math.max(longestStreak, newStreak);

          // Check for new achievements
          for (const achievement of STREAK_ACHIEVEMENTS) {
            if (newStreak >= achievement.threshold && currentStreak < achievement.threshold) {
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

          await ctx.db.patch(user._id, {
            currentStreak: newStreak,
            longestStreak: newLongestStreak,
            lastWorkoutDate: sessionDate,
          });

          streakResult = {
            streak: newStreak,
            longestStreak: newLongestStreak,
            newAchievements,
          };
        }
      }
    }

    return { success: true, streakResult };
  },
});

// Get recent sessions
export const getRecentSessions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit ?? 10;

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return sessions;
  },
});

// Get session sets for an exercise (for pre-filling)
export const getLastWeightForExercise = query({
  args: { exerciseId: v.id("exercises") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get recent sessions
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);

    for (const session of sessions) {
      const sets = await ctx.db
        .query("sessionSets")
        .withIndex("by_session_exercise", (q) => 
          q.eq("sessionId", session._id).eq("exerciseId", args.exerciseId)
        )
        .first();

      if (sets) {
        return sets.weight;
      }
    }

    return null;
  },
});
