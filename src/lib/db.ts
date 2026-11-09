import { createClient } from "./supabase";
import type { SetLog, WorkoutSession, UserPreferences } from "./types";
import { estimateOneRm } from "./program-data";

function mapSession(row: Record<string, unknown>): WorkoutSession {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    week: row.week as number,
    dayIndex: row.day_index as number,
    dayType: row.day_type as WorkoutSession["dayType"],
    startedAt: row.started_at as string,
    completedAt: row.completed_at as string | null,
    currentExerciseIndex: (row.current_exercise_index as number) ?? 0,
    currentSetIndex: (row.current_set_index as number) ?? 0,
  };
}

function mapSetLog(row: Record<string, unknown>): SetLog {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    userId: row.user_id as string,
    exerciseId: row.exercise_id as string,
    setIndex: row.set_index as number,
    isLastSet: row.is_last_set as boolean,
    weight: row.weight_kg as number,
    reps: row.reps as number,
    rpe: row.rpe as number | null,
    failureHit: row.failure_hit as boolean | null,
    loggedAt: row.logged_at as string,
  };
}

// ─── Preferences ──────────────────────────────────────────────────────────────

export async function getPreferences(userId: string): Promise<UserPreferences> {
  const sb = createClient();
  const { data } = await sb
    .from("user_preferences")
    .select("unit, alternate_selections")
    .eq("user_id", userId)
    .single();
  return {
    unit: data?.unit ?? "kg",
    alternateSelections: data?.alternate_selections ?? {},
  };
}

export async function upsertPreferences(
  userId: string,
  prefs: Partial<UserPreferences>
): Promise<void> {
  const sb = createClient();
  await sb.from("user_preferences").upsert(
    { user_id: userId, ...prefs },
    { onConflict: "user_id" }
  );
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function getIncompleteSession(
  userId: string
): Promise<WorkoutSession | null> {
  const sb = createClient();
  const { data } = await sb
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("completed_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .single();
  return data ? mapSession(data as Record<string, unknown>) : null;
}

export async function getNextSession(
  userId: string
): Promise<{ week: number; dayIndex: number }> {
  const sb = createClient();
  const { data } = await sb
    .from("workout_sessions")
    .select("week, day_index")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return { week: 1, dayIndex: 0 };
  const { week, day_index } = data as { week: number; day_index: number };
  if (day_index < 4) return { week, dayIndex: day_index + 1 };
  if (week < 12) return { week: week + 1, dayIndex: 0 };
  return { week: 1, dayIndex: 0 }; // restart
}

export async function createSession(
  userId: string,
  week: number,
  dayIndex: number,
  dayType: string
): Promise<WorkoutSession> {
  const sb = createClient();
  const { data, error } = await sb
    .from("workout_sessions")
    .insert({ user_id: userId, week, day_index: dayIndex, day_type: dayType })
    .select()
    .single();
  if (error) throw error;
  return mapSession(data as Record<string, unknown>);
}

export async function updateSessionProgress(
  sessionId: string,
  exerciseIndex: number,
  setIndex: number
): Promise<void> {
  const sb = createClient();
  await sb
    .from("workout_sessions")
    .update({
      current_exercise_index: exerciseIndex,
      current_set_index: setIndex,
    })
    .eq("id", sessionId);
}

export async function completeSession(sessionId: string): Promise<void> {
  const sb = createClient();
  await sb
    .from("workout_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId);
}

// ─── Set logs ─────────────────────────────────────────────────────────────────

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
  // Find most recent completed session that includes this exercise
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

// ─── Progress analysis ────────────────────────────────────────────────────────

export async function getExerciseHistory(
  userId: string,
  exerciseId: string
): Promise<{ date: string; weight: number; reps: number; estimatedOneRm: number }[]> {
  const sb = createClient();
  const { data } = await sb
    .from("set_logs")
    .select("weight_kg, reps, logged_at, session_id")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .eq("is_last_set", true)
    .gte("set_index", 0)
    .order("logged_at");

  return (data ?? []).map((row: { weight_kg: number; reps: number; logged_at: string }) => ({
    date: row.logged_at.split("T")[0],
    weight: row.weight_kg,
    reps: row.reps,
    estimatedOneRm: estimateOneRm(row.weight_kg, row.reps),
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
    const key = `${week}`;
    volumeMap[key] = (volumeMap[key] ?? 0) + s.weight_kg * s.reps;
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
