import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAuth } from "./auth";

/*
 * Workout history import (Strong / Hevy CSV). Parsing and exercise matching
 * happen client-side (app/lib/import); these functions persist the result.
 *
 * Conflict policy: SKIP. A date that already has a session for this user is
 * left untouched and the imported workout for that date is dropped. GymForge
 * keeps one session per date, so this makes re-importing the same file
 * idempotent and never mixes imported sets into a hand-logged workout.
 */

const MAX_SESSIONS_PER_CALL = 50;
const MAX_SETS_PER_CALL = 2000;
const MAX_DATES_PER_CHECK = 500;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Which of these dates already have a session (for the preview step).
export const getExistingSessionDates = query({
  args: { dates: v.array(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (args.dates.length > MAX_DATES_PER_CHECK) {
      throw new Error(`At most ${MAX_DATES_PER_CHECK} dates per call.`);
    }
    const existing: string[] = [];
    for (const date of new Set(args.dates)) {
      const s = await ctx.db
        .query("sessions")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
        .first();
      if (s) existing.push(date);
    }
    return existing;
  },
});

// Create custom exercises for unmatched names (reusing same-named customs).
export const ensureCustomExercises = mutation({
  args: { names: v.array(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (args.names.length > 500) throw new Error("Too many exercises in one call.");
    const existing = await ctx.db
      .query("exercises")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const byName = new Map(existing.map((e) => [e.name.trim().toLowerCase(), e._id]));

    const result: Record<string, Id<"exercises">> = {};
    for (const raw of args.names) {
      const name = raw.trim().slice(0, 100);
      if (!name) continue;
      const key = name.toLowerCase();
      let id = byName.get(key);
      if (!id) {
        id = await ctx.db.insert("exercises", {
          name,
          isGlobal: false,
          userId,
          createdAt: Date.now(),
        });
        byName.set(key, id);
      }
      result[raw] = id;
    }
    return result;
  },
});

export const importSessionsBatch = mutation({
  args: {
    sessions: v.array(
      v.object({
        date: v.string(),
        notes: v.optional(v.string()),
        sets: v.array(
          v.object({
            exerciseId: v.id("exercises"),
            setIndex: v.number(),
            weight: v.number(),
            reps: v.number(),
            rpe: v.optional(v.number()),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (args.sessions.length > MAX_SESSIONS_PER_CALL) {
      throw new Error(`At most ${MAX_SESSIONS_PER_CALL} sessions per call.`);
    }
    const totalSets = args.sessions.reduce((n, s) => n + s.sets.length, 0);
    if (totalSets > MAX_SETS_PER_CALL) {
      throw new Error(`At most ${MAX_SETS_PER_CALL} sets per call.`);
    }

    // Validate exercise ownership once per id
    const allowed = new Map<Id<"exercises">, boolean>();
    const checkExercise = async (id: Id<"exercises">) => {
      if (!allowed.has(id)) {
        const ex = await ctx.db.get(id);
        allowed.set(id, !!ex && (ex.isGlobal || ex.userId === userId));
      }
      return allowed.get(id)!;
    };

    let imported = 0;
    let skippedExisting = 0;
    let setsInserted = 0;
    const now = Date.now();
    const seen = new Set<string>();

    for (const s of args.sessions) {
      if (!DATE_RE.test(s.date) || seen.has(s.date)) {
        skippedExisting++;
        continue;
      }
      seen.add(s.date);
      const existing = await ctx.db
        .query("sessions")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", s.date))
        .first();
      if (existing) {
        skippedExisting++;
        continue;
      }

      const validSets = [];
      for (const set of s.sets) {
        if (
          !(await checkExercise(set.exerciseId)) ||
          !Number.isFinite(set.weight) ||
          !Number.isFinite(set.reps) ||
          set.weight < 0 ||
          set.reps <= 0
        ) {
          continue;
        }
        validSets.push(set);
      }
      if (validSets.length === 0) continue;

      // Mark imported sessions completed at noon UTC of their date so they
      // count as finished workouts in history/streak views.
      const completedAt = Date.parse(`${s.date}T12:00:00Z`);
      const sessionId = await ctx.db.insert("sessions", {
        userId,
        date: s.date,
        weekday: new Date(`${s.date}T00:00:00Z`).getUTCDay(),
        completedAt,
        notes: s.notes?.slice(0, 2000),
        createdAt: now,
      });
      for (const set of validSets) {
        await ctx.db.insert("sessionSets", {
          sessionId,
          exerciseId: set.exerciseId,
          setIndex: Math.max(0, Math.floor(set.setIndex)),
          repsActual: Math.round(set.reps),
          weight: Math.round(set.weight * 100) / 100,
          rpe:
            set.rpe !== undefined && Number.isFinite(set.rpe)
              ? Math.min(10, Math.max(1, set.rpe))
              : undefined,
          createdAt: now,
        });
        setsInserted++;
      }
      imported++;
    }

    return { imported, skippedExisting, setsInserted };
  },
});
