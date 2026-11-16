import { createClient } from "../supabase";
import { unwrap } from "./result";
import { getBodyWeightLogs } from "./body-weight";
import { weeklyVolume, type LoadFlags, type SessionSet, type VolumeSet, type WeeklyVolume } from "../volume";

export async function getExerciseHistory(
  userId: string,
  exerciseId: string
): Promise<{ date: string; weight: number; reps: number; dayType: string }[]> {
  const sb = createClient();
  const data = unwrap("getExerciseHistory", await sb
    .from("set_logs")
    .select("weight_kg, reps, logged_at, workout_sessions(day_type)")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .eq("is_last_set", true)
    .gte("set_index", 0)
    .order("logged_at"));

  return (data ?? []).map((row) => ({
    date: row.logged_at.split("T")[0],
    weight: row.weight_kg,
    reps: row.reps,
    dayType: row.workout_sessions?.day_type ?? "",
  }));
}

/** Every working set the user has logged for these exercises, with the session each belongs to. */
export async function getExerciseWorkingSets(userId: string, exerciseIds: string[]): Promise<SessionSet[]> {
  const sb = createClient();
  const rows = unwrap("getExerciseWorkingSets", await sb
    .from("set_logs")
    .select("session_id, exercise_id, weight_kg, reps, logged_at")
    .eq("user_id", userId)
    .in("exercise_id", exerciseIds)
    .gte("set_index", 0));
  return (rows ?? []).map((s) => ({
    sessionId: s.session_id, exerciseId: s.exercise_id, weightKg: s.weight_kg, reps: s.reps, loggedAt: s.logged_at,
  }));
}

/** Per-side / bodyweight flags for every exercise, keyed by id (the catalogue is small). */
async function getExerciseLoadFlags(): Promise<Record<string, LoadFlags>> {
  const sb = createClient();
  const rows = unwrap("getExerciseLoadFlags", await sb.from("exercises").select("id, is_bodyweight, weight_per_side"));
  return Object.fromEntries((rows ?? []).map((r) => [r.id, { isBodyweight: r.is_bodyweight, weightPerSide: r.weight_per_side }]));
}

/** Working sets from completed sessions, with each one's program week and time. */
async function getCompletedWorkingSets(userId: string): Promise<VolumeSet[]> {
  const sb = createClient();
  const rows = unwrap("getWeeklyVolume", await sb
    .from("set_logs")
    .select("weight_kg, reps, exercise_id, logged_at, workout_sessions!inner(week, completed_at)")
    .eq("user_id", userId)
    .gte("set_index", 0)
    .not("workout_sessions.completed_at", "is", null));
  return (rows ?? []).map((s) => ({
    week: s.workout_sessions.week, exerciseId: s.exercise_id, weightKg: s.weight_kg, reps: s.reps, loggedAt: s.logged_at,
  }));
}

/**
 * Total working-set volume per program week (completed sessions only), counting
 * per-side weights twice and adding body weight to bodyweight exercises.
 * Sets, exercise flags and weigh-ins load in one parallel round trip.
 */
export async function getWeeklyVolume(userId: string): Promise<WeeklyVolume> {
  const [sets, flags, logs] = await Promise.all([
    getCompletedWorkingSets(userId),
    getExerciseLoadFlags(),
    getBodyWeightLogs(userId),
  ]);
  return weeklyVolume(sets, flags, logs);
}

/** Ids of every exercise the user has logged a working set for. */
export async function getLoggedExerciseIds(userId: string): Promise<string[]> {
  const sb = createClient();
  const data = unwrap("getLoggedExerciseIds", await sb
    .from("set_logs")
    .select("exercise_id")
    .eq("user_id", userId)
    .gte("set_index", 0));
  return Array.from(new Set((data ?? []).map((r) => r.exercise_id)));
}
