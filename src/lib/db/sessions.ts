import { createClient } from "../supabase";
import type { SetLog, WorkoutPosition, WorkoutSession } from "../types";
import { mapSession, mapSetLog } from "./mappers";
import { unwrap } from "./result";

/** The latest unfinished session together with its logged sets, in one round trip. */
export async function getIncompleteSessionWithSets(
  userId: string
): Promise<{ session: WorkoutSession; sets: SetLog[] } | null> {
  const sb = createClient();
  const data = unwrap("getIncompleteSessionWithSets", await sb
    .from("workout_sessions")
    .select("*, set_logs(*)")
    .eq("user_id", userId)
    .is("completed_at", null)
    .order("started_at", { ascending: false })
    .order("logged_at", { referencedTable: "set_logs" })
    .limit(1)
    .maybeSingle());
  if (!data) return null;
  const { set_logs, ...row } = data;
  return { session: mapSession(row), sets: (set_logs ?? []).map(mapSetLog) };
}

/**
 * Position of the most recently completed workout, or null if none.
 * What comes next depends on the program's schedule — see `nextWorkout()`.
 */
export async function createSession(
  userId: string,
  week: number,
  dayIndex: number,
  dayType: string,
  programId?: string | null
): Promise<WorkoutSession> {
  const sb = createClient();
  const data = unwrap("createSession", await sb
    .from("workout_sessions")
    // Start at the first exercise's warm-up (-1), so leaving before any set resumes there, not at set 1.
    .insert({ user_id: userId, week, day_index: dayIndex, day_type: dayType, program_id: programId ?? null, current_set_index: -1 })
    .select()
    .single());
  return mapSession(data);
}

export async function updateSessionProgress(
  sessionId: string,
  exerciseIndex: number,
  setIndex: number
): Promise<void> {
  const sb = createClient();
  unwrap("updateSessionProgress", await sb
    .from("workout_sessions")
    .update({
      current_exercise_index: exerciseIndex,
      current_set_index: setIndex,
    })
    .eq("id", sessionId));
}

/** Saves the alternates chosen for this workout only (the whole map, so a retry is safe). */
export async function saveExerciseSwaps(sessionId: string, swaps: Record<string, string>): Promise<void> {
  const sb = createClient();
  unwrap("saveExerciseSwaps", await sb.from("workout_sessions").update({ exercise_swaps: swaps }).eq("id", sessionId));
}

/** Marks a session finished, with whatever was logged. Safe to retry: an already-finished session keeps its time. */
export async function completeSession(sessionId: string): Promise<void> {
  const sb = createClient();
  unwrap("completeSession", await sb
    .from("workout_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("completed_at", null));
}

/** One completed or in-progress session with all its logged sets, in one round trip. Null if not found (or not yours — RLS). */
export async function getWorkoutDetail(
  sessionId: string
): Promise<{ session: WorkoutSession; sets: SetLog[] } | null> {
  const sb = createClient();
  const data = unwrap("getWorkoutDetail", await sb
    .from("workout_sessions")
    .select("*, set_logs(*)")
    .eq("id", sessionId)
    .order("logged_at", { referencedTable: "set_logs" })
    .maybeSingle());
  if (!data) return null;
  const { set_logs, ...row } = data;
  return { session: mapSession(row), sets: (set_logs ?? []).map(mapSetLog) };
}

export interface CompletedSlot extends WorkoutPosition {
  sessionId: string;
}

/** The workout left unfinished, with its working sets logged so far (warm-ups not counted). */
export interface UnfinishedSession extends WorkoutPosition {
  sessionId: string;
  dayType: string;
  setCount: number;
}

/** Where the user is in the program they follow: the unfinished workout, if any, and every completed one. */
export interface WorkoutOverview {
  unfinished: UnfinishedSession | null;
  /** Newest first. */
  completed: CompletedSlot[];
}

interface OverviewJson {
  unfinished: { id: string; week: number; day_index: number; day_type: string; set_count: number } | null;
  completed: { id: string; week: number; day_index: number }[];
}

/**
 * The program's unfinished workout and every completed slot in it, in one round
 * trip (`workout_overview`). Following no program, there's nothing to ask for.
 */
export async function getWorkoutOverview(programId: string | null): Promise<WorkoutOverview> {
  if (!programId) return { unfinished: null, completed: [] };
  const sb = createClient();
  const json = unwrap("getWorkoutOverview", await sb.rpc("workout_overview", { p_program_id: programId })) as unknown as OverviewJson;
  const u = json.unfinished;
  return {
    unfinished: u && { sessionId: u.id, week: u.week, dayIndex: u.day_index, dayType: u.day_type, setCount: u.set_count },
    completed: json.completed.map((c) => ({ sessionId: c.id, week: c.week, dayIndex: c.day_index })),
  };
}

export interface SessionSetRef {
  sessionId: string;
  exerciseId: string;
}

/**
 * Completed sessions (newest first) and their working sets (no warm-ups),
 * in one round trip via an embedded select. Omit `limit` for the full history.
 */
export async function getRecentWorkouts(
  userId: string,
  limit?: number
): Promise<{ sessions: WorkoutSession[]; sets: SessionSetRef[] }> {
  const sb = createClient();
  const query = sb
    .from("workout_sessions")
    .select("*, set_logs(exercise_id)")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .gte("set_logs.set_index", 0)
    .order("completed_at", { ascending: false });
  const data = unwrap("getRecentWorkouts", await (limit === undefined ? query : query.limit(limit)));

  const sessions: WorkoutSession[] = [];
  const sets: SessionSetRef[] = [];
  for (const { set_logs, ...row } of data ?? []) {
    sessions.push(mapSession(row));
    for (const log of set_logs ?? []) sets.push({ sessionId: row.id, exerciseId: log.exercise_id });
  }
  return { sessions, sets };
}
