import { createClient } from "./supabase";
import type { SetLog, WorkoutSession, UserPreferences, ProgramRow, BuilderProgram, BuilderDay, BuilderExercise } from "./types";
import { estimateOneRm } from "./program-data";

function mapSession(row: Record<string, unknown>): WorkoutSession {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    programId: (row.program_id as string | null) ?? null,
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
  dayType: string,
  programId?: string | null
): Promise<WorkoutSession> {
  const sb = createClient();
  const { data, error } = await sb
    .from("workout_sessions")
    .insert({ user_id: userId, week, day_index: dayIndex, day_type: dayType, program_id: programId ?? null })
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

export async function deleteWorkoutSession(sessionId: string): Promise<void> {
  const sb = createClient();
  await sb.from("set_logs").delete().eq("session_id", sessionId);
  await sb.from("workout_sessions").delete().eq("id", sessionId);
}

export async function updateSetLog(setId: string, weight: number, reps: number): Promise<void> {
  const sb = createClient();
  await sb.from("set_logs").update({ weight_kg: weight, reps }).eq("id", setId);
}

export async function getCompletedSessions(userId: string): Promise<WorkoutSession[]> {
  const sb = createClient();
  const { data } = await sb
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });
  return (data ?? []).map((r: Record<string, unknown>) => mapSession(r));
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

// ─── Builder ──────────────────────────────────────────────────────────────────

export async function getPrograms(userId: string): Promise<ProgramRow[]> {
  const sb = createClient();
  const { data: programs } = await sb
    .from("programs")
    .select("id, name, description, category, total_weeks, created_by, is_public, created_at")
    .or(`is_public.eq.true,created_by.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (!programs?.length) return [];

  const { data: counts } = await sb
    .from("workout_sessions")
    .select("program_id, user_id")
    .in("program_id", programs.map((p: { id: string }) => p.id));

  const countMap: Record<string, Set<string>> = {};
  for (const row of counts ?? []) {
    const r = row as { program_id: string; user_id: string };
    if (!countMap[r.program_id]) countMap[r.program_id] = new Set();
    countMap[r.program_id].add(r.user_id);
  }

  return programs.map((p: Record<string, unknown>) => ({
    id: p.id as string,
    name: p.name as string,
    description: (p.description as string | null) ?? null,
    category: (p.category as string | null) ?? null,
    totalWeeks: p.total_weeks as number,
    createdBy: (p.created_by as string | null) ?? null,
    isPublic: p.is_public as boolean,
    createdAt: p.created_at as string,
    userCount: countMap[p.id as string]?.size ?? 0,
  }));
}

export async function toggleProgramPublic(programId: string, isPublic: boolean): Promise<void> {
  const sb = createClient();
  await sb.from("programs").update({ is_public: isPublic }).eq("id", programId);
}

export async function updateProgram(
  programId: string,
  fields: { name?: string; description?: string; category?: string }
): Promise<void> {
  const sb = createClient();
  await sb.from("programs").update(fields).eq("id", programId);
}

export async function updateProgramDayExercise(
  pdeId: string,
  fields: {
    repRangeMin?: number;
    repRangeMax?: number;
    earlySetCount?: number;
    lastSetCount?: number;
    earlySetRpeMin?: number;
    earlySetRpeMax?: number;
    lastSetTarget?: string;
  }
): Promise<void> {
  const sb = createClient();
  const dbFields: Record<string, unknown> = {};
  if (fields.repRangeMin !== undefined) dbFields.rep_range_min = fields.repRangeMin;
  if (fields.repRangeMax !== undefined) dbFields.rep_range_max = fields.repRangeMax;
  if (fields.earlySetCount !== undefined) dbFields.early_set_count = fields.earlySetCount;
  if (fields.lastSetCount !== undefined) dbFields.last_set_count = fields.lastSetCount;
  if (fields.earlySetRpeMin !== undefined) dbFields.early_set_rpe_min = fields.earlySetRpeMin;
  if (fields.earlySetRpeMax !== undefined) dbFields.early_set_rpe_max = fields.earlySetRpeMax;
  if (fields.lastSetTarget !== undefined) dbFields.last_set_target = fields.lastSetTarget;
  await sb.from("program_day_exercises").update(dbFields).eq("id", pdeId);
}

export async function getBuilderProgram(programId: string): Promise<BuilderProgram | null> {
  const sb = createClient();
  const { data, error } = await sb
    .from("programs")
    .select(`
      id, name, description, category, total_weeks, created_by, is_public,
      program_days(
        id, week, day_index, day_type,
        program_day_exercises(
          id, position, rep_range_min, rep_range_max, early_set_count, last_set_count,
          early_set_rpe_min, early_set_rpe_max, last_set_rpe_min, last_set_rpe_max, last_set_target,
          exercises(id, name, warmup_protocol)
        )
      )
    `)
    .eq("id", programId)
    .single();

  if (error || !data) return null;

  const { data: countData } = await sb
    .from("workout_sessions")
    .select("user_id")
    .eq("program_id", programId);

  const userCount = new Set((countData ?? []).map((r: { user_id: string }) => r.user_id)).size;

  type RawPDE = {
    id: string;
    position: number;
    rep_range_min: number;
    rep_range_max: number;
    early_set_count: number;
    last_set_count: number;
    early_set_rpe_min: number;
    early_set_rpe_max: number;
    last_set_rpe_min: number | null;
    last_set_rpe_max: number | null;
    last_set_target: string;
    exercises: { id: string; name: string; warmup_protocol: string };
  };

  type RawDay = {
    id: string;
    week: number;
    day_index: number;
    day_type: string;
    program_day_exercises: RawPDE[];
  };

  const days: BuilderDay[] = ((data.program_days as unknown as RawDay[]) ?? [])
    .map((day) => ({
      pdId: day.id,
      week: day.week,
      dayIndex: day.day_index,
      dayType: day.day_type,
      exercises: [...(day.program_day_exercises ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((pde): BuilderExercise => ({
          pdeId: pde.id,
          exerciseId: pde.exercises.id,
          name: pde.exercises.name,
          position: pde.position,
          repRangeMin: pde.rep_range_min,
          repRangeMax: pde.rep_range_max,
          earlySetCount: pde.early_set_count,
          lastSetCount: pde.last_set_count,
          earlySetRpeMin: pde.early_set_rpe_min,
          earlySetRpeMax: pde.early_set_rpe_max,
          lastSetRpeMin: pde.last_set_rpe_min,
          lastSetRpeMax: pde.last_set_rpe_max,
          lastSetTarget: pde.last_set_target,
          warmupProtocol: pde.exercises.warmup_protocol,
        })),
    }))
    .sort((a, b) => a.week !== b.week ? a.week - b.week : a.dayIndex - b.dayIndex);

  const p = data as Record<string, unknown>;
  return {
    id: p.id as string,
    name: p.name as string,
    description: (p.description as string | null) ?? null,
    category: (p.category as string | null) ?? null,
    isPublic: p.is_public as boolean,
    createdBy: (p.created_by as string | null) ?? null,
    totalWeeks: p.total_weeks as number,
    days,
    userCount,
  };
}
