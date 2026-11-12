import { createClient } from "../supabase";
import type { SetLog, WorkoutSession } from "../types";
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

export async function getNextSession(
  userId: string
): Promise<{ week: number; dayIndex: number }> {
  const sb = createClient();
  const data = unwrap("getNextSession", await sb
    .from("workout_sessions")
    .select("week, day_index")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle());

  if (!data) return { week: 1, dayIndex: 0 };
  const { week, day_index } = data;
  if (day_index < 4) return { week, dayIndex: day_index + 1 };
  if (week < 12) return { week: week + 1, dayIndex: 0 };
  return { week: 1, dayIndex: 0 };
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

export async function getCompletedSessions(userId: string): Promise<WorkoutSession[]> {
  const sb = createClient();
  const data = unwrap("getCompletedSessions", await sb
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false }));
  return (data ?? []).map(mapSession);
}

export async function getRecentCompletedSessions(
  userId: string,
  limit: number
): Promise<WorkoutSession[]> {
  const sb = createClient();
  const { data } = await sb
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: Record<string, unknown>) => mapSession(r));
}
