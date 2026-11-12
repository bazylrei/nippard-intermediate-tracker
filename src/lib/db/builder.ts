import { createClient } from "../supabase";
import type { ProgramRow, BuilderProgram, BuilderDay, BuilderExercise } from "../types";

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

export async function getAllExercises(): Promise<{ id: string; name: string; muscleGroup: string; warmupProtocol: string }[]> {
  const sb = createClient();
  const { data } = await sb
    .from("exercises")
    .select("id, name, muscle_group, warmup_protocol")
    .order("muscle_group")
    .order("name");
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    muscleGroup: r.muscle_group as string,
    warmupProtocol: r.warmup_protocol as string,
  }));
}

export async function updateProgramDayExercise(
  pdeId: string,
  fields: {
    exerciseId?: string;
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
  if (fields.exerciseId !== undefined) dbFields.exercise_id = fields.exerciseId;
  if (fields.repRangeMin !== undefined) dbFields.rep_range_min = fields.repRangeMin;
  if (fields.repRangeMax !== undefined) dbFields.rep_range_max = fields.repRangeMax;
  if (fields.earlySetCount !== undefined) dbFields.early_set_count = fields.earlySetCount;
  if (fields.lastSetCount !== undefined) dbFields.last_set_count = fields.lastSetCount;
  if (fields.earlySetRpeMin !== undefined) dbFields.early_set_rpe_min = fields.earlySetRpeMin;
  if (fields.earlySetRpeMax !== undefined) dbFields.early_set_rpe_max = fields.earlySetRpeMax;
  if (fields.lastSetTarget !== undefined) dbFields.last_set_target = fields.lastSetTarget;
  await sb.from("program_day_exercises").update(dbFields).eq("id", pdeId);
}

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

function mapRawDay(day: RawDay): BuilderDay {
  return {
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
  };
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
  const days = ((data.program_days as unknown as RawDay[]) ?? [])
    .map(mapRawDay)
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

export async function addProgramWeek(programId: string, totalWeeks: number): Promise<void> {
  const sb = createClient();
  await sb.from("programs").update({ total_weeks: totalWeeks }).eq("id", programId);
}

export async function addProgramDay(
  programId: string, week: number, dayIndex: number, dayType: string
): Promise<BuilderDay> {
  const sb = createClient();
  const { data, error } = await sb
    .from("program_days")
    .insert({ program_id: programId, week, day_index: dayIndex, day_type: dayType })
    .select("id, week, day_index, day_type")
    .single();
  if (error) throw error;
  return { pdId: data.id, week: data.week, dayIndex: data.day_index, dayType: data.day_type, exercises: [] };
}

export async function addExerciseToDay(
  pdId: string, exerciseId: string, exerciseName: string, warmupProtocol: string, position: number
): Promise<BuilderExercise> {
  const sb = createClient();
  const { data, error } = await sb
    .from("program_day_exercises")
    .insert({
      program_day_id: pdId,
      exercise_id: exerciseId,
      position,
      rep_range_min: 8,
      rep_range_max: 12,
      early_set_count: 3,
      last_set_count: 1,
      early_set_rpe_min: 7,
      early_set_rpe_max: 8,
      last_set_rpe_min: null,
      last_set_rpe_max: null,
      last_set_target: "failure",
    })
    .select("id, position, rep_range_min, rep_range_max, early_set_count, last_set_count, early_set_rpe_min, early_set_rpe_max, last_set_rpe_min, last_set_rpe_max, last_set_target")
    .single();
  if (error) throw error;
  const r = data as Record<string, unknown>;
  return {
    pdeId: r.id as string,
    exerciseId,
    name: exerciseName,
    position: r.position as number,
    repRangeMin: r.rep_range_min as number,
    repRangeMax: r.rep_range_max as number,
    earlySetCount: r.early_set_count as number,
    lastSetCount: r.last_set_count as number,
    earlySetRpeMin: r.early_set_rpe_min as number,
    earlySetRpeMax: r.early_set_rpe_max as number,
    lastSetRpeMin: r.last_set_rpe_min as number | null,
    lastSetRpeMax: r.last_set_rpe_max as number | null,
    lastSetTarget: r.last_set_target as string,
    warmupProtocol,
  };
}

export async function deleteProgramDayExercise(pdeId: string): Promise<void> {
  const sb = createClient();
  await sb.from("program_day_exercises").delete().eq("id", pdeId);
}

export async function deleteProgramDay(pdId: string): Promise<void> {
  const sb = createClient();
  await sb.from("program_day_exercises").delete().eq("program_day_id", pdId);
  await sb.from("program_days").delete().eq("id", pdId);
}

export async function deleteProgramWeek(programId: string, week: number): Promise<void> {
  const sb = createClient();
  const { data: days } = await sb.from("program_days").select("id").eq("program_id", programId).eq("week", week);
  if (days?.length) {
    const ids = (days as { id: string }[]).map((d) => d.id);
    await sb.from("program_day_exercises").delete().in("program_day_id", ids);
    await sb.from("program_days").delete().in("id", ids);
  }
}
