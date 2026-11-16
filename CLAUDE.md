# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run lint      # Run ESLint
npm test          # Vitest (watch); `npm run test:run` for a single run
```

Tests live in `src/__tests__/` (Vitest + jsdom + Testing Library). Data-layer tests mock `@/lib/supabase`.

## Architecture Overview

Next.js App Router app for tracking the Jeff Nippard Intermediate bodybuilding program (the active program is named by `ACTIVE_PROGRAM_NAME` in `program-db.ts`; there is no per-user program selection yet). Full-stack with Supabase (PostgreSQL + Auth).

### Route Structure

- `/(main)/` — Home: suggested next workout + feed of recent completed workouts
- `/(main)/program` — My program: progress bar, next workout, week overview. Its header links to Settings and signs out
- `/(main)/settings` — Preferences (weight unit, theme, week start, body weight, height), loaded and saved by `useSettings`. Opened from Program, so the Program tab stays selected on it
- `/(main)/history/[sessionId]` — One completed workout, read-only with an Edit mode
- `/(main)/progress` — 3 tabs: exercise progression, weekly volume, history list
- `/(main)/builder/[programId]` — Full CRUD program editor
- `/(workout)/workout` — Active workout session (`?week=X&day=Y` query params). Own route group: keeps the tab bar (no back button); pages fill `.workout-viewport`. While a workout is in progress the tab bar shows a raised centre Workout tab (elapsed time, or the rest countdown)
- `/auth` — Email/password sign-in/sign-up

### State Layers

1. **`ProgramContext`** (`src/context/ProgramContext.tsx`) — Loads the full 12-week program structure, warmup protocols, and failure technique metadata once at app start. Available everywhere via `useProgramContext()`; `failed` is true when it couldn't load and nothing is cached.
2. **Supabase** — Authoritative store for workout sessions (`workout_sessions`), set logs (`set_logs`), and user preferences (`user_preferences`).
3. **localStorage** (`src/lib/cache.ts`) — Short-lived cache for program data (`workout_cache_program-v1`), dashboard/home-feed state, user prefs (`lib/prefs-cache.ts`) and the workout in progress for the Workout tab (`lib/active-workout.ts`) to avoid redundant DB round-trips.

### Data Flow: Starting a Workout

Dashboard fetches next/incomplete session → user navigates to `/workout?week=X&day=Y` → page creates a new `workout_sessions` row → `ProgramContext` supplies exercise details → `SetLogger` writes each set to `set_logs` in real time → completion marks the session and redirects home.

### Key Files

| File | Purpose |
|---|---|
| `src/lib/types.ts` | All TypeScript interfaces |
| `src/lib/db/` | All Supabase queries, split by domain; every call goes through `unwrap()` (`db/result.ts`), which throws `DbError` on failure |
| `src/lib/supabase.ts` | Browser-safe Supabase client factory, typed with `Database` |
| `src/lib/database.types.ts` | Generated schema types — regenerate after every migration, never hand-edit |
| `src/lib/auth.ts` | `getSignedInUser()` (local session, no Auth-server round trip), `signIn` / `signUp` / `signOut` |
| `src/lib/require-user.ts` | `requireSignedInUser(router)` — redirects to sign-in when signed out; use it in every page/hook load |
| `supabase/migrations/` | Source of truth for the schema; `supabase-schema.sql` is the original bootstrap only |
| `src/lib/program-data.ts` | Schedule navigation: `nextWorkout`, session numbering, totals |
| `src/lib/day-types.ts` | The one day-type table; always display via `dayLabel()` |
| `src/lib/units.ts` | The one kg↔lbs conversion (`kgToDisplay` / `displayToKg`) |
| `src/lib/alternates.ts` | Choosing among a slot's alternates: `chooseExercise`, `mergeChoices` (swaps over defaults), `parseExerciseChoices` (ignores the old position/boolean format) |
| `src/lib/db/body-weight.ts` | Body weight is a dated history (`body_weight_logs`, one entry per day, `source` for future health-app sync); the latest entry is the current weight |
| `src/lib/weigh-in.ts` | When the weekly weigh-in prompt is due (from `weekStartsOn` in preferences) |
| `src/lib/theme.ts` | Light / dark / system theme, saved per device; `THEME_INIT_SCRIPT` in the root layout's `<head>` applies it before first paint (`html.light` / `html.dark` in globals.css override the device setting) |
| `src/lib/workout-history.ts` | Route helpers (`startWorkoutHref`, `workoutDetailHref`) and set grouping |
| `scripts/program-data-static.ts` | Hardcoded program structure used by the seed script |
| `src/lib/program-db.ts` | Loads program from DB into context |
| `scripts/seed-program.ts` | Seeds warmup protocols, exercises, failure techniques |

### Non-Obvious Conventions

- **Warmup sets use negative indices**: set index −3/−2/−1 are warmup; 0+ are working sets.
- **Weight is always stored in kg**; every screen converts with `lib/units.ts` for lbs users (charts, volumes and deltas too).
- **Alternate exercises are real exercises.** Each `program_day_exercises` slot points at up to two (`alternate_1_exercise_id`, `alternate_2_exercise_id`), so an alternate has its own id, flags (`weight_per_side`, `is_bodyweight`), rest, warm-up and history. `loadFullProgram` builds them as full `Exercise`s carrying the slot's sets/reps/RPE. Which one to do is resolved by `lib/alternates.ts`: this workout's swaps (`workout_sessions.exercise_swaps`) win over the user's saved defaults (`user_preferences.alternate_selections`), both `{ mainExerciseId: chosenExerciseId }`. A swap is for the current workout only unless "make this my default" is ticked in the swap sheet, and it can't change once a set is logged for the exercise. Never rename an exercise to show an alternate: sets must log under the alternate's own id.
- **Embed `exercises` from `program_day_exercises` with an explicit foreign key** (`exercises!program_day_exercises_exercise_id_fkey(...)`): the table references `exercises` three times, so an unnamed embed is ambiguous and the API rejects it.
- **Never hard-code program dimensions.** Builder-edited programs can have any number of weeks, days per week, and gaps. Next workout, session numbers and totals come from the loaded schedule via `nextWorkout()` / `getSessionNumber()` / `getTotalSessions()` in `program-data.ts`; the DB stores only the last completed position.
- **Saves are never silent**: use `useSaveError().attempt()` (or try/catch + `report`) for writes from UI handlers; sheets stay open with an inline error if `onSave` rejects.
- **Pages are client components** (`"use client"`) that load data in an effect; a failed first load must show `FullScreenMessage`, never an endless "Loading…".
- **Shared UI**: `FullScreenMessage`, `SaveErrorAlert`, `CompletedWorkoutCell`, `NextWorkoutCard`, and the `.btn-primary` utility (globals.css) for primary buttons. Use theme tokens (`bg-surface`, `text-muted`, `text-primary`…), never raw Tailwind palette colours.
- **Round trips are the main latency cost** (the DB is in `eu-west-2`). Combine dependent queries with PostgREST embeds (`select("*, set_logs(*)")`) or a Postgres function called via `sb.rpc()`; run independent ones with `Promise.all`.
- **Multi-step writes are Postgres functions**, not chained client calls: `log_set` (set + session progress, idempotent on a client-generated id), `duplicate_program_week` (atomic). Child rows are removed by `ON DELETE CASCADE` — don't delete them by hand.
- **Set logging is optimistic**: the workout page advances immediately and rolls back if `logSetAndAdvance` throws.
- **Cross-user aggregates need `SECURITY DEFINER`** (RLS hides other users' rows), e.g. `program_user_counts`. Return aggregates only, and check visibility inside the function.

### Environment Variables

Requires `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
