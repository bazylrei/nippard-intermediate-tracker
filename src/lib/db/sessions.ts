import { createClient } from "../supabase";
import type { SetLog, WorkoutPosition, WorkoutSession } from "../types";
import { mapSession, mapSetLog } from "./mappers";
import { unwrap } from "./result";

export async function getIncompleteSession(
  userId: string
): Promise<WorkoutSession | null> {
  const sb = createClient();
  const data = unwrap("getIncompleteSession", await sb
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("completed_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle());
  return data ? mapSession(data) : null;
}

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
export async function getLastCompletedWorkout(userId: string): Promise<WorkoutPosition | null> {
  const sb = createClient();
  const data = unwrap("getLastCompletedWorkout", await sb
    .from("workout_sessions")
    .select("week, day_index")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle());
  return data ? { week: data.week, dayIndex: data.day_index } : null;
}

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
    .insert({ user_id: userId, week, day_index: dayIndex, day_type: dayType, program_id: programId ?? null })
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

export async function completeSession(sessionId: string): Promise<void> {
  const sb = createClient();
  unwrap("completeSession", await sb
    .from("workout_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId));
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

/** Where every completed session sits in the program, newest first. Lightweight: no set data. */
export async function getCompletedSlots(userId: string): Promise<CompletedSlot[]> {
  const sb = createClient();
  const data = unwrap("getCompletedSlots", await sb
    .from("workout_sessions")
    .select("id, week, day_index")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false }));
  return (data ?? []).map((r) => ({ sessionId: r.id, week: r.week, dayIndex: r.day_index }));
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
