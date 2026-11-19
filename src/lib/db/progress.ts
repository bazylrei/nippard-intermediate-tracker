import { createClient } from "../supabase";
import { unwrap } from "./result";
import { getBodyWeightLogs } from "./body-weight";
import type { ExerciseHistoryPoint } from "../types";
import { weeklyVolume, type VolumeExercise, type VolumeSet, type WeeklyVolume } from "../volume";

/** The last working set of each session for several exercises, oldest first, in one round trip. */
export async function getExerciseHistories(
  userId: string,
  exerciseIds: string[]
): Promise<Record<string, ExerciseHistoryPoint[]>> {
  if (exerciseIds.length === 0) return {};
  const sb = createClient();
  const data = unwrap("getExerciseHistories", await sb
    .from("set_logs")
    .select("exercise_id, weight_kg, reps, logged_at, workout_sessions(day_type)")
    .eq("user_id", userId)
    .in("exercise_id", exerciseIds)
    .eq("is_last_set", true)
    .gte("set_index", 0)
    .order("logged_at"));

  const byExercise: Record<string, ExerciseHistoryPoint[]> = {};
  for (const row of data ?? []) {
    (byExercise[row.exercise_id] ??= []).push({
      date: row.logged_at.split("T")[0],
      weight: row.weight_kg,
      reps: row.reps,
      dayType: row.workout_sessions?.day_type ?? "",
    });
  }
  return byExercise;
}

export async function getExerciseHistory(userId: string, exerciseId: string): Promise<ExerciseHistoryPoint[]> {
  return (await getExerciseHistories(userId, [exerciseId]))[exerciseId] ?? [];
}

/** Load flags and muscle group for every exercise, keyed by id (the catalogue is small). */
async function getVolumeExercises(): Promise<Record<string, VolumeExercise>> {
  const sb = createClient();
  const rows = unwrap("getVolumeExercises", await sb.from("exercises").select("id, is_bodyweight, weight_per_side, muscle_group"));
  return Object.fromEntries((rows ?? []).map((r) => [
    r.id, { isBodyweight: r.is_bodyweight, weightPerSide: r.weight_per_side, muscleGroup: r.muscle_group },
  ]));
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
 * Working-set volume per program week and body region (completed sessions only), counting
 * per-side weights twice and adding body weight to bodyweight exercises.
 * Sets, exercises and weigh-ins load in one parallel round trip.
 */
export async function getWeeklyVolume(userId: string): Promise<WeeklyVolume> {
  const [sets, exercises, logs] = await Promise.all([
    getCompletedWorkingSets(userId),
    getVolumeExercises(),
    getBodyWeightLogs(userId),
  ]);
  return weeklyVolume(sets, exercises, logs);
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
