import { createClient } from "../supabase";
import type { SetLog } from "../types";
import { mapSetLog } from "./mappers";

export async function logSet(set: Omit<SetLog, "id" | "loggedAt">): Promise<void> {
  const sb = createClient();
  await sb.from("set_logs").insert({
    session_id: set.sessionId,
    user_id: set.userId ?? undefined,
    exercise_id: set.exerciseId,
    set_index: set.setIndex,
    is_last_set: set.isLastSet,
    weight_kg: set.weight,
    reps: set.reps,
    rpe: set.rpe,
    failure_hit: set.failureHit,
  });
}

export async function deleteSetLog(setId: string): Promise<void> {
  const sb = createClient();
  await sb.from("set_logs").delete().eq("id", setId);
}

export async function deleteExerciseSetsFromSession(sessionId: string, exerciseId: string): Promise<void> {
  const sb = createClient();
  await sb.from("set_logs").delete().eq("session_id", sessionId).eq("exercise_id", exerciseId);
}

export async function updateExerciseIdForSets(sessionId: string, oldExerciseId: string, newExerciseId: string): Promise<void> {
  const sb = createClient();
  await sb.from("set_logs").update({ exercise_id: newExerciseId }).eq("session_id", sessionId).eq("exercise_id", oldExerciseId);
}

export async function addSetsToSession(
  sessionId: string,
  exerciseId: string,
  userId: string,
  sets: { weight: number; reps: number }[]
): Promise<SetLog[]> {
  const sb = createClient();
  const rows = sets.map((s, i) => ({
    session_id: sessionId,
    exercise_id: exerciseId,
    user_id: userId,
    set_index: i,
    is_last_set: i === sets.length - 1,
    weight_kg: s.weight,
    reps: s.reps,
    rpe: null,
    failure_hit: false,
  }));
  const { data } = await sb.from("set_logs").insert(rows).select();
  return (data ?? []).map((r: Record<string, unknown>) => mapSetLog(r));
}

export async function deleteWorkoutSession(sessionId: string): Promise<void> {
  const sb = createClient();
  await sb.from("set_logs").delete().eq("session_id", sessionId);
  await sb.from("workout_sessions").delete().eq("id", sessionId);
}

export async function updateSetLog(setId: string, weight: number, reps: number, rpe: number | null): Promise<void> {
  const sb = createClient();
  await sb.from("set_logs").update({ weight_kg: weight, reps, rpe }).eq("id", setId);
}

export async function getSessionSets(sessionId: string): Promise<SetLog[]> {
  const sb = createClient();
  const { data } = await sb
    .from("set_logs")
    .select("*")
    .eq("session_id", sessionId)
    .order("logged_at");
  return (data ?? []).map((r: Record<string, unknown>) => mapSetLog(r));
}

export async function getLastSessionSetsForExercise(
  userId: string,
  exerciseId: string
): Promise<SetLog[]> {
  const sb = createClient();
  const { data: sessions } = await sb
    .from("workout_sessions")
    .select("id")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  for (const session of sessions ?? []) {
    const { data: sets } = await sb
      .from("set_logs")
      .select("*")
      .eq("session_id", session.id)
      .eq("exercise_id", exerciseId)
      .gte("set_index", 0)
      .order("set_index");
    if (sets && sets.length > 0) return sets.map((r: Record<string, unknown>) => mapSetLog(r));
  }
  return [];
}

export interface SessionSetRef {
  sessionId: string;
  exerciseId: string;
}

/** Working sets (no warm-ups) for many sessions in one round-trip. */
export async function getWorkingSetsForSessions(sessionIds: string[]): Promise<SessionSetRef[]> {
  if (sessionIds.length === 0) return [];
  const sb = createClient();
  const { data } = await sb
    .from("set_logs")
    .select("session_id, exercise_id")
    .in("session_id", sessionIds)
    .gte("set_index", 0);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    sessionId: r.session_id as string,
    exerciseId: r.exercise_id as string,
  }));
}
