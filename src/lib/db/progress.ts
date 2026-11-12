import { createClient } from "../supabase";
import { estimateOneRm } from "../program-data";

export async function getExerciseHistory(
  userId: string,
  exerciseId: string
): Promise<{ date: string; weight: number; reps: number; dayType: string }[]> {
  const sb = createClient();
  const { data } = await sb
    .from("set_logs")
    .select("weight_kg, reps, logged_at, session_id")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .eq("is_last_set", true)
    .gte("set_index", 0)
    .order("logged_at");

  if (!data?.length) return [];

  const sessionIds = [...new Set(data.map((r: { session_id: string }) => r.session_id))];
  const { data: sessions } = await sb
    .from("workout_sessions")
    .select("id, day_type")
    .in("id", sessionIds);

  const sessionDayMap = Object.fromEntries(
    (sessions ?? []).map((s: { id: string; day_type: string }) => [s.id, s.day_type])
  );

  return data.map((row: { weight_kg: number; reps: number; logged_at: string; session_id: string }) => ({
    date: row.logged_at.split("T")[0],
    weight: row.weight_kg,
    reps: row.reps,
    dayType: sessionDayMap[row.session_id] ?? "",
  }));
}

export async function getWeeklyVolume(
  userId: string
): Promise<{ week: number; muscleGroup: string; volume: number }[]> {
  const sb = createClient();
  const { data: sessions } = await sb
    .from("workout_sessions")
    .select("id, week")
    .eq("user_id", userId)
    .not("completed_at", "is", null);

  if (!sessions?.length) return [];

  const { data: sets } = await sb
    .from("set_logs")
    .select("session_id, weight_kg, reps")
    .in("session_id", sessions.map((s: { id: string }) => s.id))
    .gte("set_index", 0);

  const sessionWeekMap = Object.fromEntries(
    sessions.map((s: { id: string; week: number }) => [s.id, s.week])
  );

  const volumeMap: Record<string, number> = {};
  for (const set of sets ?? []) {
    const s = set as { session_id: string; weight_kg: number; reps: number };
    const week = sessionWeekMap[s.session_id];
    if (!week) continue;
    volumeMap[`${week}`] = (volumeMap[`${week}`] ?? 0) + s.weight_kg * s.reps;
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
  const { data } = await sb
    .from("set_logs")
    .select("exercise_id, weight_kg, reps, logged_at")
    .eq("user_id", userId)
    .gte("set_index", 0)
    .order("logged_at");

  const prMap: Record<string, { weight: number; reps: number; estimatedOneRm: number; date: string }> = {};
  for (const row of data ?? []) {
    const r = row as { exercise_id: string; weight_kg: number; reps: number; logged_at: string };
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
