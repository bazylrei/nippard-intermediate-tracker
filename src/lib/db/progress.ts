import { createClient } from "../supabase";
import { estimateOneRm } from "../program-data";
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

export async function getWeeklyVolume(
  userId: string
): Promise<{ week: number; muscleGroup: string; volume: number }[]> {
  const sb = createClient();
  const data = unwrap("getWeeklyVolume", await sb
    .from("set_logs")
    .select("weight_kg, reps, workout_sessions!inner(week, completed_at)")
    .eq("user_id", userId)
    .gte("set_index", 0)
    .not("workout_sessions.completed_at", "is", null));

  const volumeMap: Record<string, number> = {};
  for (const set of data ?? []) {
    const week = set.workout_sessions.week;
    if (!week) continue;
    volumeMap[`${week}`] = (volumeMap[`${week}`] ?? 0) + set.weight_kg * set.reps;
  }

  return Object.entries(volumeMap).map(([week, volume]) => ({
    week: parseInt(week),
    muscleGroup: "total",
    volume: Math.round(volume),
  }));
}

export async function getPersonalRecords(
  userId: string
): Promise<{ exerciseId: string; weight: number; reps: number; estimatedOneRm: number; date: string }[]> {
  const sb = createClient();
  const data = unwrap("getPersonalRecords", await sb
    .from("set_logs")
    .select("exercise_id, weight_kg, reps, logged_at")
    .eq("user_id", userId)
    .gte("set_index", 0)
    .order("logged_at"));

  const prMap: Record<string, { weight: number; reps: number; estimatedOneRm: number; date: string }> = {};
  for (const r of data ?? []) {
    const e1rm = estimateOneRm(r.weight_kg, r.reps);
    const existing = prMap[r.exercise_id];
    if (!existing || e1rm > existing.estimatedOneRm) {
      prMap[r.exercise_id] = {
        weight: r.weight_kg,
        reps: r.reps,
        estimatedOneRm: e1rm,
        date: r.logged_at.split("T")[0],
      };
    }
  }

  return Object.entries(prMap).map(([exerciseId, pr]) => ({ exerciseId, ...pr }));
}
