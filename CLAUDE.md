# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GymForge is a workout tracking application built with Next.js 16, React 19, Convex (serverless backend), and Clerk authentication. Users create weekly workout plans with exercises/sets/reps, log workouts with weights, and view progress charts.

## Development Commands

```bash
# Run both Next.js and Convex dev servers (required for development)
npm run dev

# Or run separately:
npm run dev:next    # Next.js on localhost:3000
npm run dev:convex  # Convex sync/codegen

# Build (runs Convex codegen first)
npm run build

# Linting
npm run lint

# Unit tests (Vitest)
npm run test

# E2E tests (Playwright, requires app running)
npm run test:e2e

# Deploy Convex to production
npm run convex:deploy
```

## Architecture

### Frontend (Next.js App Router)

- `app/(app)/` - Authenticated routes (dashboard, plan, log, progress, profile)
- `app/components/` - Shared React components (AI plan generator, exercise selector, share dialog)
- `components/ui/` - Reusable shadcn/ui components (button, card, dialog, input, select)
- `app/providers.tsx` - ConvexProvider + ClerkProvider wrapper
- `app/(app)/layout.tsx` - Authenticated shell with mobile bottom nav + desktop sidebar

### Backend (Convex)

- `convex/schema.ts` - Database schema (users, exercises, plans, planDays, planExercises, sessions, sessionSets)
- `convex/auth.ts` - Auth helpers (`requireAuth`, `getAuthUserId`)
- `convex/plans.ts` - Plan CRUD, sharing, AI generation
- `convex/sessions.ts` - Workout logging
- `convex/progress.ts` - Progress queries, metrics (volume, e1RM), rules-based suggestions
- `convex/exercises.ts` - Exercise catalog management

All Convex mutations/queries are user-scoped via Clerk identity. Use `requireAuth(ctx)` to get the authenticated user's Clerk ID.

### Data Flow

1. Clerk handles authentication via `@clerk/nextjs`
2. `ConvexProviderWithClerk` in providers.tsx connects Clerk to Convex
3. React components use `useQuery`/`useMutation` hooks from `convex/react`
4. All API calls go through type-safe `api` object from `convex/_generated/api`

### Key Patterns

- Path alias `@/` maps to project root
- Convex functions must be imported from `convex/_generated/api`
- After schema changes, run `npx convex codegen` to regenerate types
- User records are auto-created via `ensureUser` mutation on first authenticated page load

## Testing

- Unit tests: `tests/*.test.ts` - metrics/utility functions
- E2E tests: `tests/e2e/` - Playwright tests for full user flows
- Playwright runs on chromium, firefox, webkit, plus mobile viewports
