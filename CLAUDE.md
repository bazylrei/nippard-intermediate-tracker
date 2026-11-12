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

Next.js App Router app for tracking the Jeff Nippard Intermediate 12-week bodybuilding program. Full-stack with Supabase (PostgreSQL + Auth).

### Route Structure

- `/(main)/` — Dashboard: shows next workout, session progress bar, week overview
- `/(main)/progress` — 3-tab analytics: exercise progression charts, volume, history table
- `/(main)/builder/[programId]` — Full CRUD program editor
- `/workout` — Active workout session (`?week=X&day=Y` query params)
- `/auth` — Email/password sign-in/sign-up

### State Layers

1. **`ProgramContext`** (`src/context/ProgramContext.tsx`) — Loads the full 12-week program structure, warmup protocols, and failure technique metadata once at app start. Available everywhere via `useProgram()`.
2. **Supabase** — Authoritative store for workout sessions (`workout_sessions`), set logs (`set_logs`), and user preferences (`user_preferences`).
3. **localStorage** (`src/lib/cache.ts`) — Short-lived cache for program data (`workout_cache_program-v1`), dashboard state, and user prefs to avoid redundant DB round-trips.

### Data Flow: Starting a Workout

Dashboard fetches next/incomplete session → user navigates to `/workout?week=X&day=Y` → page creates a new `workout_sessions` row → `ProgramContext` supplies exercise details → `SetLogger` writes each set to `set_logs` in real time → completion marks the session and redirects home.

### Key Files

| File | Purpose |
|---|---|
| `src/lib/types.ts` | All TypeScript interfaces |
| `src/lib/db/` | All Supabase queries, split by domain; every call goes through `unwrap()` (`db/result.ts`), which throws `DbError` on failure |
| `src/lib/supabase.ts` | Browser-safe Supabase client factory, typed with `Database` |
| `src/lib/database.types.ts` | Generated schema types — regenerate after every migration, never hand-edit |
| `src/lib/auth.ts` | `getSignedInUser()` — reads the local session (no Auth-server round trip) |
| `supabase/migrations/` | Source of truth for the schema; `supabase-schema.sql` is the original bootstrap only |
| `src/lib/program-data.ts` | 1RM calculation (Epley), session numbering helper |
| `src/lib/program-data-static.ts` | Hardcoded 12-week program structure |
| `src/lib/program-db.ts` | Loads program from DB into context |
| `scripts/seed-program.ts` | Seeds warmup protocols, exercises, failure techniques |

### Non-Obvious Conventions

- **Warmup sets use negative indices**: set index −3/−2/−1 are warmup; 0+ are working sets.
- **Weight is always stored in kg** internally; `SetLogger` converts to lbs on display when the user preference is `lbs` (Epley formula also works in kg).
- **Alternate exercises** are stored in `user_preferences.alternate_selections` and resolved at render time in `SetLogger`, not at the DB level.
- **Never hard-code program dimensions.** Builder-edited programs can have any number of weeks, days per week, and gaps. Next workout, session numbers and totals come from the loaded schedule via `nextWorkout()` / `getSessionNumber()` / `getTotalSessions()` in `program-data.ts`; the DB stores only the last completed position.
- **Saves are never silent**: use `useSaveError().attempt()` (or try/catch + `report`) for writes from UI handlers; sheets stay open with an inline error if `onSave` rejects.
- **Page components** are async Server Components; interactive leaf components use `"use client"`.
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
