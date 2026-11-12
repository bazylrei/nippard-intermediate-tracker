import { createClient } from "../supabase";
import type { BuilderDay, BuilderExercise } from "../types";

type RawSourcePDE = {
  exercise_id: string; position: number; rep_range_min: number; rep_range_max: number;
  early_set_count: number; last_set_count: number; early_set_rpe_min: number; early_set_rpe_max: number;
  last_set_rpe_min: number | null; last_set_rpe_max: number | null; last_set_target: string;
  exercises: { id: string; name: string; warmup_protocol: string };
};

type RawSourceDay = { id: string; day_index: number; day_type: string; program_day_exercises: RawSourcePDE[] };

async function insertDuplicatedDay(
  sb: ReturnType<typeof createClient>,
  programId: string,
  targetWeek: number,
  sourceDay: RawSourceDay,
): Promise<BuilderDay | null> {
  const { data: newDay, error: dayError } = await sb
    .from("program_days")
    .insert({ program_id: programId, week: targetWeek, day_index: sourceDay.day_index, day_type: sourceDay.day_type })
    .select("id")
    .single();
  if (dayError || !newDay) return null;

  const pdes = sourceDay.program_day_exercises ?? [];
  let newExercises: BuilderExercise[] = [];

  if (pdes.length > 0) {
    const { data: newPdes } = await sb
      .from("program_day_exercises")
      .insert(pdes.map((e) => ({
        program_day_id: (newDay as Record<string, unknown>).id,
        exercise_id: e.exercise_id,
        position: e.position,
        rep_range_min: e.rep_range_min, rep_range_max: e.rep_range_max,
        early_set_count: e.early_set_count, last_set_count: e.last_set_count,
        early_set_rpe_min: e.early_set_rpe_min, early_set_rpe_max: e.early_set_rpe_max,
        last_set_rpe_min: e.last_set_rpe_min, last_set_rpe_max: e.last_set_rpe_max,
        last_set_target: e.last_set_target,
      })))
      .select("id, exercise_id, position, rep_range_min, rep_range_max, early_set_count, last_set_count, early_set_rpe_min, early_set_rpe_max, last_set_rpe_min, last_set_rpe_max, last_set_target");

    newExercises = ((newPdes ?? []) as unknown as Array<Record<string, unknown>>).map((pde) => {
      const src = pdes.find((e) => e.exercise_id === pde.exercise_id);
      return {
        pdeId: pde.id as string,
        exerciseId: pde.exercise_id as string,
        name: src?.exercises.name ?? (pde.exercise_id as string),
        position: pde.position as number,
        repRangeMin: pde.rep_range_min as number, repRangeMax: pde.rep_range_max as number,
        earlySetCount: pde.early_set_count as number, lastSetCount: pde.last_set_count as number,
        earlySetRpeMin: pde.early_set_rpe_min as number, earlySetRpeMax: pde.early_set_rpe_max as number,
        lastSetRpeMin: pde.last_set_rpe_min as number | null, lastSetRpeMax: pde.last_set_rpe_max as number | null,
        lastSetTarget: pde.last_set_target as string,
        warmupProtocol: src?.exercises.warmup_protocol ?? "2-set",
      };
    }).sort((a, b) => a.position - b.position);
  }

  return {
    pdId: (newDay as Record<string, unknown>).id as string,
    week: targetWeek,
    dayIndex: sourceDay.day_index,
    dayType: sourceDay.day_type,
    exercises: newExercises,
  };
}

export async function duplicateProgramWeek(
  programId: string, sourceWeek: number, targetWeek: number, newTotalWeeks: number
): Promise<BuilderDay[]> {
  const sb = createClient();

  const { data: sourceDays } = await sb
    .from("program_days")
    .select(`
      id, day_index, day_type,
      program_day_exercises(
        exercise_id, position, rep_range_min, rep_range_max,
        early_set_count, last_set_count, early_set_rpe_min, early_set_rpe_max,
        last_set_rpe_min, last_set_rpe_max, last_set_target,
        exercises(id, name, warmup_protocol)
      )
    `)
    .eq("program_id", programId)
    .eq("week", sourceWeek);

  if (!sourceDays?.length) return [];

  await sb.from("programs").update({ total_weeks: newTotalWeeks }).eq("id", programId);

  const results = await Promise.all(
    (sourceDays as unknown as RawSourceDay[]).map((day) => insertDuplicatedDay(sb, programId, targetWeek, day))
  );
  return results.filter((d): d is BuilderDay => d !== null).sort((a, b) => a.dayIndex - b.dayIndex);
}
