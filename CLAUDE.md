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

Next.js App Router app for following a bodybuilding program (Jeff Nippard Intermediate is the built-in one). Each user follows one program or none (`user_preferences.active_program_id`, null = none). Full-stack with Supabase (PostgreSQL + Auth).

### Route Structure

- `/(main)/` — Home: suggested next workout + feed of recent completed workouts
- `/(main)/profile` — Hub for the current program, My programs, Exercises, Settings and sign-out. Pages opened from it (`/program`, `/programs`, `/exercises`, `/settings`) keep the Profile tab selected and lead back with `BackToProfile`
- `/(main)/exercises` — Exercise glossary (search, grouped by muscle group). `/exercises/new`, `/exercises/[exerciseId]` (detail; Edit/Delete on your own) and `/exercises/[exerciseId]/edit`. Opened from Profile
- `/(main)/program` — My program: progress bar, next workout, week overview (browse any week; tap a day not done to start it, via a confirm sheet that saves or discards an unfinished workout)
- `/(main)/settings` — Preferences (weight unit, theme, week start, body weight, height), loaded and saved by `useSettings`
- `/(main)/community` — Placeholder for the upcoming social features
- `/(main)/history/[sessionId]` — One completed workout, read-only with an Edit mode
- `/(main)/progress` — 2 tabs: exercise progression, weekly volume. Before anything is logged, an empty state instead: start the next workout, or choose/create a program when following none
- `/(main)/programs` — My programs: "Created by me" and "Available to me" (public today, subscribed later); each opens its preview, and the followed one is marked Current. `?new=1` (`NEW_PROGRAM_HREF`) arrives with the sheet open. "New program" (`createProgram`, idempotent on a client-made id) starts a private one-week program and opens it in the editor
- `/(main)/programs/[programId]` — Read-only program preview (week switcher, day cards). Shows Edit only when `canEditProgram()` (`lib/program-access.ts`). Follow this program / Stop following (`followProgram`)
- `/(main)/programs/[programId]/edit` — Full CRUD program editor; anyone who can't edit is sent to the preview. URLs come from `lib/program-routes.ts`; the old `/builder` addresses redirect (next.config.ts)
- `/(workout)/workout` — Active workout session (`?week=X&day=Y` query params). Own route group: keeps the tab bar (no back button); pages fill `.workout-viewport`. The tab bar (`Home · Progress · ▶ · Community · Profile`) always has a raised centre button: idle it starts the next workout (`findNextWorkout`); while a workout is in progress it shows the elapsed time, or the rest countdown, and leads back
- `/onboarding` — First-run setup after the account exists: units, week start & theme → body weight (skippable) → pick a program (the available ones, or "No program for now"; or Build your own) → Start first workout / Home. Outside the tab bar. `OnboardingGate` (in the `(main)` layout) sends any account without `user_preferences.onboarded_at` here; a failed check fails open. Accounts that already had preferences or workouts were backfilled as done (migration 012)
- `/auth` — The signed-out start: a welcome, then create an account or sign in (email + password; sign-up needs the emailed confirmation link, and "Send it again" resends it), plus forgot password. Friendly messages come from `lib/auth-errors.ts`. A corner sun/moon `ThemeToggle` flips light/dark (saved on the device, works before sign-in). "Continue with Google" and "Continue with Apple" sit above the email form on the create-account and sign-in screens, and only appears once the provider is switched on in Supabase (the project's public `/auth/v1/settings` says so, via `getEnabledSocialProviders`), so a button never leads to an error page; another provider is a line in `SOCIAL_PROVIDERS`, an icon and enabling it in Supabase. A signed-in visitor is sent Home
- `/auth/callback` — Where a provider sends the person back (`redirectTo` of `signInWithProvider`): waits for the session (`useLinkSession`), then goes Home (the onboarding gate takes a new account on); a cancel or error comes back in the address and is explained (`providerReturnError`). **Needs `<site>/auth/callback` in Supabase's allowed Redirect URLs**
- `/auth/reset` — Where the password-reset email link lands: waits for the link to sign the person in, then sets the new password. **Needs `<site>/auth/reset` and `<site>/` in Supabase's allowed Redirect URLs** (Authentication → URL Configuration), or links fall back to the Site URL

### State Layers

1. **`ProgramContext`** (`src/context/ProgramContext.tsx`) — Loads the signed-in user's followed program (schedule, `programId`, `programName`), warmup protocols and failure techniques, and reloads when the account changes. Following none: `ready` with an empty schedule and `programId` null, so screens show `ChooseProgramCard`. `followProgram(id | null)` saves the choice and reloads. `failed` is true when it couldn't load and nothing is cached.
2. **Supabase** — Authoritative store for workout sessions (`workout_sessions`), set logs (`set_logs`), and user preferences (`user_preferences`).
3. **localStorage** (`src/lib/cache.ts`) — Short-lived cache for program data (`workout_cache_program-v1`), dashboard/home-feed state, user prefs (`lib/prefs-cache.ts`) and the workout in progress for the Workout tab (`lib/active-workout.ts`) to avoid redundant DB round-trips.

### Data Flow: Starting a Workout

Home/Program suggest the next (or unfinished) day, or the user picks any day not done on Program → user navigates to `/workout?week=X&day=Y` → page shows the day's overview (nothing recorded yet) → "Begin Workout" creates the `workout_sessions` row (`beginWorkout`), which starts the timer → `ProgramContext` supplies exercise details → `SetLogger` writes each set to `set_logs` in real time → completion (after the last exercise, or early via Finish workout with whatever is logged) marks the session and shows the done screen.

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
| `src/lib/program-data.ts` | Schedule navigation: `programRun` (days done, next workout), session numbering, totals |
| `src/lib/day-types.ts` | The one day-type table; always display via `dayLabel()` |
| `src/lib/units.ts` | The one kg↔lbs conversion (`kgToDisplay` / `displayToKg`) |
| `src/lib/alternates.ts` | Choosing among a slot's alternates: `chooseExercise`, `mergeChoices` (swaps over defaults), `parseExerciseChoices` (ignores the old position/boolean format) |
| `src/lib/db/body-weight.ts` | Body weight is a dated history (`body_weight_logs`, one entry per day, `source` for future health-app sync); the latest entry is the current weight |
| `src/lib/weigh-in.ts` | When the weekly weigh-in prompt is due (from `weekStartsOn` in preferences) |
| `src/lib/onboarding.ts` | `checkOnboarded` (a yes is cached per user on the device) / `finishOnboarding`; `ONBOARDING_PATH` |
| `src/lib/youtube.ts` | `openInYouTubeApp`: tries the YouTube app on a phone (iOS scheme with a timed browser fallback, Android intent with its own fallback); every demo-video link goes through `components/widgets/VideoLink` |
| `src/lib/theme.ts` | Light / dark / system theme, saved per device; `THEME_INIT_SCRIPT` in the root layout's `<head>` applies it before first paint (`html.light` / `html.dark` in globals.css override the device setting) |
| `src/lib/workout-history.ts` | Route helpers (`startWorkoutHref`, `workoutDetailHref`) and set grouping |
| `scripts/program-data-static.ts` | Hardcoded program structure used by the seed script |
| `src/lib/program-db.ts` | Loads the user's followed program (embedded through their preferences, one round trip) into context |
| `scripts/seed-program.ts` | Seeds warmup protocols, exercises, failure techniques |

### Non-Obvious Conventions

- **Warmup sets use negative indices**: set index −3/−2/−1 are warmup; 0+ are working sets.
- **Weight is always stored in kg**; every screen converts with `lib/units.ts` for lbs users (charts, volumes and deltas too).
- **Alternate exercises are real exercises.** Each `program_day_exercises` slot points at up to two (`alternate_1_exercise_id`, `alternate_2_exercise_id`), so an alternate has its own id, flags (`weight_per_side`, `is_bodyweight`), rest, warm-up and history. `loadFullProgram` builds them as full `Exercise`s carrying the slot's sets/reps/RPE. Which one to do is resolved by `lib/alternates.ts`: this workout's swaps (`workout_sessions.exercise_swaps`) win over the user's saved defaults (`user_preferences.alternate_selections`), both `{ mainExerciseId: chosenExerciseId }`. A swap is for the current workout only unless "make this my default" is ticked in the swap sheet, and it can't change once a set is logged for the exercise. Never rename an exercise to show an alternate: sets must log under the alternate's own id.
- **Embed `exercises` from `program_day_exercises` with an explicit foreign key** (`exercises!program_day_exercises_exercise_id_fkey(...)`): the table references `exercises` three times, so an unnamed embed is ambiguous and the API rejects it.
- **Never hard-code program dimensions.** Builder-edited programs can have any number of weeks, days per week, and gaps. Next workout, session numbers and totals come from the loaded schedule via `programRun()` / `getSessionNumber()` / `getTotalSessions()` in `program-data.ts`.
- **Progress is per program.** `workout_overview(p_program_id)` counts only that program's sessions (`workout_sessions.program_id`), so switching programs starts the new one at its first day; `getWorkoutOverview(null)` asks nothing.
- **Days can be done in any order.** A day is done from its completed sessions, never from its position: `programRun` counts completions per day, and the current run is the lowest count across the schedule (so a finished program starts a fresh run). Next is the earliest day not done, after any unfinished workout.
- **Saves are never silent**: use `useSaveError().attempt()` (or try/catch + `report`) for writes from UI handlers; sheets stay open with an inline error if `onSave` rejects.
- **Pages are client components** (`"use client"`) that load data in an effect; a failed first load must show `FullScreenMessage`, never an endless "Loading…".
- **One component per file, reused ones in `components/widgets/`.** A `page.tsx` holds only the screen itself; every sub-component it uses lives in its own file under `components/<feature>/` (named after the screen: `profile/`, `exercises/`, `program/`, `progress/`…). The moment a component is imported from a second feature area it moves to `components/widgets/` (the design system: `FullScreenMessage`, `SaveErrorAlert`, `BackLink`, `SectionHeading`, `WeekSwitcher`, `EmptyState`, `OverlayPresence`, `NextWorkoutCard`, `UnitSetting`…). Reuse inside one feature stays in that feature's folder. Helpers, types and constants shared by a feature's components get their own non-component file (`props.ts`, `volume-chart.ts`).
- **Shared UI**: everything in `components/widgets/`, plus `CompletedWorkoutCell` and the `.btn-primary` utility (globals.css) for primary buttons. Use theme tokens (`bg-surface`, `text-muted`, `text-primary`…), never raw Tailwind palette colours.
- **Round trips are the main latency cost** (the DB is in `eu-west-2`). Combine dependent queries with PostgREST embeds (`select("*, set_logs(*)")`) or a Postgres function called via `sb.rpc()`; run independent ones with `Promise.all`.
- **Multi-step writes are Postgres functions**, not chained client calls: `log_set` (set + session progress, idempotent on a client-generated id), `duplicate_program_week` (atomic). Child rows are removed by `ON DELETE CASCADE` — don't delete them by hand.
- **Set logging is optimistic**: the workout page advances immediately and rolls back if `logSetAndAdvance` throws.
- **Users can add exercises** (`lib/db/exercises.ts`, validated by `lib/exercise-form.ts`). `exercises.created_by` is null for built-ins; a custom exercise is private to its creator but readable by anyone who can see a program that uses it or logged sets for it (RLS). Ids are client-made (`newExerciseId()`, `custom-<uuid>`) so a retried create is a no-op. There is no DELETE policy: delete with `delete_own_exercise` (refuses when any program slot or logged set uses it — `set_logs` has no FK to `exercises`, and the alternate FKs are `ON DELETE SET NULL`).
- **Cross-user aggregates need `SECURITY DEFINER`** (RLS hides other users' rows), e.g. `program_user_counts`. Return aggregates only, and check visibility inside the function.

### Environment Variables

Requires `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
