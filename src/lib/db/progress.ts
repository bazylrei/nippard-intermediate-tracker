import { createClient } from "../supabase";
import { localTimeZone } from "../dates";
import { unwrap } from "./result";
import { getBodyWeightLogs } from "./body-weight";
import type { ExerciseHistoryPoint } from "../types";
import { weeklyVolume, type VolumeExercise, type VolumeGroup, type WeeklyVolume } from "../volume";

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

/**
 * Working sets of completed sessions, summed per program week, exercise and day
 * (in the device's time zone) by the database, so history size doesn't matter.
 */
async function getVolumeGroups(): Promise<VolumeGroup[]> {
  const sb = createClient();
  const rows = unwrap("getWeeklyVolume", await sb.rpc("weekly_volume_groups", { p_tz: localTimeZone() }));
  return (rows ?? []).map((r) => ({
    week: r.week, exerciseId: r.exercise_id, loggedOn: r.logged_on, weightRepsKg: r.weight_reps, reps: r.reps,
  }));
}

/**
 * Working-set volume per program week and body region (completed sessions only), counting
 * per-side weights twice and adding body weight to bodyweight exercises.
 * Sets, exercises and weigh-ins load in one parallel round trip.
 */
export async function getWeeklyVolume(userId: string): Promise<WeeklyVolume> {
  const [groups, exercises, logs] = await Promise.all([
    getVolumeGroups(),
    getVolumeExercises(),
    getBodyWeightLogs(userId),
  ]);
  return weeklyVolume(groups, exercises, logs);
}

/** Ids of every exercise the user has logged a working set for. */
export async function getLoggedExerciseIds(): Promise<string[]> {
  const sb = createClient();
  return unwrap("getLoggedExerciseIds", await sb.rpc("logged_exercise_ids")) ?? [];
}
