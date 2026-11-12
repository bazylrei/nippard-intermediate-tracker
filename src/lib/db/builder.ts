import { createClient } from "../supabase";
import type { TablesUpdate } from "../database.types";
import type { ProgramRow, BuilderProgram, BuilderDay, BuilderExercise } from "../types";
import { unwrap } from "./result";

/** Distinct users per program, counted server-side (RLS hides other users' sessions from the client). */
async function getProgramUserCounts(programIds: string[]): Promise<Record<string, number>> {
  const sb = createClient();
  const data = unwrap("getProgramUserCounts", await sb.rpc("program_user_counts", { p_program_ids: programIds }));
  return Object.fromEntries((data ?? []).map((r) => [r.program_id, r.user_count]));
}

export async function getPrograms(userId: string): Promise<ProgramRow[]> {
  const sb = createClient();
  const programs = unwrap("getPrograms", await sb
    .from("programs")
    .select("id, name, description, category, total_weeks, created_by, is_public, created_at")
    .or(`is_public.eq.true,created_by.eq.${userId}`)
    .order("created_at", { ascending: false }));

  if (!programs?.length) return [];

  const counts = await getProgramUserCounts(programs.map((p) => p.id));

  return programs.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    category: p.category ?? null,
    totalWeeks: p.total_weeks,
    createdBy: p.created_by ?? null,
    isPublic: p.is_public,
    createdAt: p.created_at,
    userCount: counts[p.id] ?? 0,
  }));
}

export async function toggleProgramPublic(programId: string, isPublic: boolean): Promise<void> {
  const sb = createClient();
  unwrap("toggleProgramPublic", await sb.from("programs").update({ is_public: isPublic }).eq("id", programId));
}

export async function updateProgram(
  programId: string,
  fields: { name?: string; description?: string; category?: string }
): Promise<void> {
  const sb = createClient();
  unwrap("updateProgram", await sb.from("programs").update(fields).eq("id", programId));
}

export async function getAllExercises(): Promise<{ id: string; name: string; muscleGroup: string; warmupProtocol: string }[]> {
  const sb = createClient();
  const data = unwrap("getAllExercises", await sb
    .from("exercises")
    .select("id, name, muscle_group, warmup_protocol")
    .order("muscle_group")
    .order("name"));
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    muscleGroup: r.muscle_group,
    warmupProtocol: r.warmup_protocol,
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
  const dbFields: TablesUpdate<"program_day_exercises"> = {};
  if (fields.exerciseId !== undefined) dbFields.exercise_id = fields.exerciseId;
  if (fields.repRangeMin !== undefined) dbFields.rep_range_min = fields.repRangeMin;
  if (fields.repRangeMax !== undefined) dbFields.rep_range_max = fields.repRangeMax;
  if (fields.earlySetCount !== undefined) dbFields.early_set_count = fields.earlySetCount;
  if (fields.lastSetCount !== undefined) dbFields.last_set_count = fields.lastSetCount;
  if (fields.earlySetRpeMin !== undefined) dbFields.early_set_rpe_min = fields.earlySetRpeMin;
  if (fields.earlySetRpeMax !== undefined) dbFields.early_set_rpe_max = fields.earlySetRpeMax;
  if (fields.lastSetTarget !== undefined) dbFields.last_set_target = fields.lastSetTarget;
  unwrap("updateProgramDayExercise", await sb.from("program_day_exercises").update(dbFields).eq("id", pdeId));
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

export type RawDay = {
  id: string;
  week: number;
  day_index: number;
  day_type: string;
  program_day_exercises: RawPDE[];
};

/** Columns needed to build a BuilderDay; select from `program_days`. */
export const BUILDER_DAY_SELECT = `
  id, week, day_index, day_type,
  program_day_exercises(
    id, position, rep_range_min, rep_range_max, early_set_count, last_set_count,
    early_set_rpe_min, early_set_rpe_max, last_set_rpe_min, last_set_rpe_max, last_set_target,
    exercises(id, name, warmup_protocol)
  )
` as const;

export function mapRawDay(day: RawDay): BuilderDay {
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

export function sortDays(days: BuilderDay[]): BuilderDay[] {
  return days.sort((a, b) => a.week !== b.week ? a.week - b.week : a.dayIndex - b.dayIndex);
}

export async function getBuilderProgram(programId: string): Promise<BuilderProgram | null> {
  const sb = createClient();
  // Program, its days and its user count are independent — fetch them in parallel.
  const [programRes, daysRes, counts] = await Promise.all([
    sb.from("programs")
      .select("id, name, description, category, total_weeks, created_by, is_public")
      .eq("id", programId)
      .maybeSingle(),
    sb.from("program_days").select(BUILDER_DAY_SELECT).eq("program_id", programId),
    getProgramUserCounts([programId]),
  ]);

  const p = unwrap("getBuilderProgram", programRes);
  if (!p) return null;
  const days = unwrap("getBuilderProgram days", daysRes);

  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    category: p.category ?? null,
    isPublic: p.is_public,
    createdBy: p.created_by ?? null,
    totalWeeks: p.total_weeks,
    days: sortDays((days ?? []).map(mapRawDay)),
    userCount: counts[programId] ?? 0,
  };
}

export async function addProgramWeek(programId: string, totalWeeks: number): Promise<void> {
  const sb = createClient();
  unwrap("addProgramWeek", await sb.from("programs").update({ total_weeks: totalWeeks }).eq("id", programId));
}

export async function addProgramDay(
  programId: string, week: number, dayIndex: number, dayType: string
): Promise<BuilderDay> {
  const sb = createClient();
  const data = unwrap("addProgramDay", await sb
    .from("program_days")
    .insert({ program_id: programId, week, day_index: dayIndex, day_type: dayType })
    .select("id, week, day_index, day_type")
    .single());
  return { pdId: data.id, week: data.week, dayIndex: data.day_index, dayType: data.day_type, exercises: [] };
}

export async function addExerciseToDay(
  pdId: string, exerciseId: string, exerciseName: string, warmupProtocol: string, position: number
): Promise<BuilderExercise> {
  const sb = createClient();
  const r = unwrap("addExerciseToDay", await sb
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
    .single());
  return {
    pdeId: r.id,
    exerciseId,
    name: exerciseName,
    position: r.position,
    repRangeMin: r.rep_range_min,
    repRangeMax: r.rep_range_max,
    earlySetCount: r.early_set_count,
    lastSetCount: r.last_set_count,
    earlySetRpeMin: r.early_set_rpe_min,
    earlySetRpeMax: r.early_set_rpe_max,
    lastSetRpeMin: r.last_set_rpe_min,
    lastSetRpeMax: r.last_set_rpe_max,
    lastSetTarget: r.last_set_target,
    warmupProtocol,
  };
}

export async function deleteProgramDayExercise(pdeId: string): Promise<void> {
  const sb = createClient();
  unwrap("deleteProgramDayExercise", await sb.from("program_day_exercises").delete().eq("id", pdeId));
}

/** Exercises are removed by ON DELETE CASCADE. */
export async function deleteProgramDay(pdId: string): Promise<void> {
  const sb = createClient();
  unwrap("deleteProgramDay", await sb.from("program_days").delete().eq("id", pdId));
}

/** Exercises are removed by ON DELETE CASCADE. */
export async function deleteProgramWeek(programId: string, week: number): Promise<void> {
  const sb = createClient();
  unwrap("deleteProgramWeek", await sb.from("program_days").delete().eq("program_id", programId).eq("week", week));
}
