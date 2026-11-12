import { createClient } from "../supabase";
import type { SetLog } from "../types";
import { mapSetLog } from "./mappers";
import { unwrap } from "./result";

export interface LogSetInput {
  /** Client-generated UUID; doubles as an idempotency key so retries never duplicate a set. */
  id: string;
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  isLastSet: boolean;
  weight: number;
  reps: number;
  rpe: number | null;
  failureHit: boolean | null;
  /** Session progress to store in the same transaction. */
  nextExerciseIndex: number;
  nextSetIndex: number;
  completeSession: boolean;
}

/** Insert a set and advance (or complete) the session atomically, in one round trip. */
export async function logSetAndAdvance(input: LogSetInput): Promise<SetLog> {
  const sb = createClient();
  const row = unwrap("logSetAndAdvance", await sb.rpc("log_set", {
    p_id: input.id,
    p_session_id: input.sessionId,
    p_exercise_id: input.exerciseId,
    p_set_index: input.setIndex,
    p_is_last_set: input.isLastSet,
    p_weight_kg: input.weight,
    p_reps: input.reps,
    // The type generator marks every function argument non-null; SQL accepts NULL here.
    p_rpe: input.rpe as number,
    p_failure_hit: input.failureHit as boolean,
    p_next_exercise_index: input.nextExerciseIndex,
    p_next_set_index: input.nextSetIndex,
    p_complete: input.completeSession,
  }));
  return mapSetLog(row);
}

export async function deleteSetLog(setId: string): Promise<void> {
  const sb = createClient();
  unwrap("deleteSetLog", await sb.from("set_logs").delete().eq("id", setId));
}

export async function deleteExerciseSetsFromSession(sessionId: string, exerciseId: string): Promise<void> {
  const sb = createClient();
  unwrap("deleteExerciseSetsFromSession", await sb.from("set_logs").delete().eq("session_id", sessionId).eq("exercise_id", exerciseId));
}

export async function updateExerciseIdForSets(sessionId: string, oldExerciseId: string, newExerciseId: string): Promise<void> {
  const sb = createClient();
  unwrap("updateExerciseIdForSets", await sb.from("set_logs").update({ exercise_id: newExerciseId }).eq("session_id", sessionId).eq("exercise_id", oldExerciseId));
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
  const data = unwrap("addSetsToSession", await sb.from("set_logs").insert(rows).select());
  return (data ?? []).map(mapSetLog);
}

/** Set logs are removed by ON DELETE CASCADE. */
export async function deleteWorkoutSession(sessionId: string): Promise<void> {
  const sb = createClient();
  unwrap("deleteWorkoutSession", await sb.from("workout_sessions").delete().eq("id", sessionId));
}

export async function updateSetLog(setId: string, weight: number, reps: number, rpe: number | null): Promise<void> {
  const sb = createClient();
  unwrap("updateSetLog", await sb.from("set_logs").update({ weight_kg: weight, reps, rpe }).eq("id", setId));
}

export async function getSessionSets(sessionId: string): Promise<SetLog[]> {
  const sb = createClient();
  const data = unwrap("getSessionSets", await sb
    .from("set_logs")
    .select("*")
    .eq("session_id", sessionId)
    .order("logged_at"));
  return (data ?? []).map(mapSetLog);
}

/**
 * For each exercise, the working sets from the most recent completed session
 * that included it — every exercise in one round trip.
 */
export async function getLastSetsForExercises(exerciseIds: string[]): Promise<Record<string, SetLog[]>> {
  if (exerciseIds.length === 0) return {};
  const sb = createClient();
  const data = unwrap("getLastSetsForExercises", await sb.rpc("last_sets_for_exercises", { p_exercise_ids: exerciseIds }));

  const byExercise: Record<string, SetLog[]> = {};
  for (const row of data ?? []) {
    (byExercise[row.exercise_id] ??= []).push(mapSetLog(row));
  }
  return byExercise;
}

export interface SessionSetRef {
  sessionId: string;
  exerciseId: string;
}

/** Working sets (no warm-ups) for many sessions in one round-trip. */
export async function getWorkingSetsForSessions(sessionIds: string[]): Promise<SessionSetRef[]> {
  if (sessionIds.length === 0) return [];
  const sb = createClient();
  const data = unwrap("getWorkingSetsForSessions", await sb
    .from("set_logs")
    .select("session_id, exercise_id")
    .in("session_id", sessionIds)
    .gte("set_index", 0));
  return (data ?? []).map((r) => ({ sessionId: r.session_id, exerciseId: r.exercise_id }));
}
