import { createClient } from "../supabase";
import { unwrap } from "./result";

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

/** Total working-set volume (kg × reps) per program week, completed sessions only, weeks ascending. */
export async function getWeeklyVolume(userId: string): Promise<{ week: number; volume: number }[]> {
  const sb = createClient();
  const data = unwrap("getWeeklyVolume", await sb
    .from("set_logs")
    .select("weight_kg, reps, workout_sessions!inner(week, completed_at)")
    .eq("user_id", userId)
    .gte("set_index", 0)
    .not("workout_sessions.completed_at", "is", null));

  const byWeek = new Map<number, number>();
  for (const set of data ?? []) {
    const { week } = set.workout_sessions;
    byWeek.set(week, (byWeek.get(week) ?? 0) + set.weight_kg * set.reps);
  }
  return Array.from(byWeek, ([week, volume]) => ({ week, volume: Math.round(volume) }))
    .sort((a, b) => a.week - b.week);
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
