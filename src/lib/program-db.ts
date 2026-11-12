import type { SupabaseClient } from "@supabase/supabase-js";
import type { Exercise, WeekSchedule, WorkoutDay } from "./types";

type WarmupProtocolRow = { id: string; steps: string[] };
type FailureTechniqueRow = { id: string; label: string; description: string };

type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: string;
  alternate_1: string | null;
  alternate_2: string | null;
  rest_min: number;
  rest_max: number;
  warmup_protocol: string;
  form_note: string | null;
  youtube_url: string | null;
  instructions: string | null;
  equipment: string | null;
};

type ProgramDayExerciseRow = {
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
  exercises: ExerciseRow;
};

type ProgramDayRow = {
  week: number;
  day_index: number;
  day_type: string;
  program_day_exercises: ProgramDayExerciseRow[];
};

function mapToExercise(pde: ProgramDayExerciseRow): Exercise {
  const ex = pde.exercises;
  return {
    id: ex.id,
    name: ex.name,
    muscleGroup: ex.muscle_group as Exercise["muscleGroup"],
    alternates: [ex.alternate_1 ?? "", ex.alternate_2 ?? ""],
    restSeconds: [ex.rest_min, ex.rest_max],
    warmupProtocol: ex.warmup_protocol as Exercise["warmupProtocol"],
    repRange: [pde.rep_range_min, pde.rep_range_max],
    earlySetRpe: [pde.early_set_rpe_min, pde.early_set_rpe_max],
    lastSetTarget: pde.last_set_target as Exercise["lastSetTarget"],
    lastSetRpe:
      pde.last_set_rpe_min != null && pde.last_set_rpe_max != null
        ? [pde.last_set_rpe_min, pde.last_set_rpe_max]
        : undefined,
    earlySetCount: pde.early_set_count,
    lastSetCount: pde.last_set_count,
    formNote: ex.form_note ?? "",
    youtubeUrl: ex.youtube_url ?? null,
    instructions: ex.instructions ?? null,
    equipment: ex.equipment ?? null,
  };
}

export async function loadFullProgram(sb: SupabaseClient): Promise<{
  program: WeekSchedule[];
  warmupSteps: Record<string, string[]>;
  failureTechniques: Record<string, { label: string; description: string }>;
  programId: string | null;
} | null> {
  const [programResult, warmupResult, techniqueResult] = await Promise.all([
    sb
      .from("programs")
      .select(
        `id, program_days(week, day_index, day_type, program_day_exercises(position, rep_range_min, rep_range_max, early_set_count, last_set_count, early_set_rpe_min, early_set_rpe_max, last_set_rpe_min, last_set_rpe_max, last_set_target, exercises(id, name, muscle_group, alternate_1, alternate_2, rest_min, rest_max, warmup_protocol, form_note, youtube_url, instructions, equipment)))`
      )
      .eq("name", "Nippard Intermediate")
      .single(),
    sb.from("warmup_protocols").select("id, steps"),
    sb.from("failure_techniques").select("id, label, description"),
  ]);

  if (programResult.error || !programResult.data) return null;

  const warmupSteps: Record<string, string[]> = {};
  if (!warmupResult.error && warmupResult.data) {
    for (const row of (warmupResult.data as WarmupProtocolRow[])) {
      warmupSteps[row.id] = row.steps;
    }
  }

  const failureTechniques: Record<string, { label: string; description: string }> = {};
  if (!techniqueResult.error && techniqueResult.data) {
    for (const row of (techniqueResult.data as FailureTechniqueRow[])) {
      failureTechniques[row.id] = { label: row.label, description: row.description };
    }
  }

  const programDays = programResult.data.program_days as unknown as ProgramDayRow[];

  // Group days by week
  const weekMap = new Map<number, WorkoutDay[]>();
  for (const day of programDays) {
    const existing = weekMap.get(day.week);
    if (!existing) {
      weekMap.set(day.week, []);
    }
    weekMap.get(day.week)![day.day_index] = {
      dayType: day.day_type as WorkoutDay["dayType"],
      exercises: [...day.program_day_exercises]
        .sort((a, b) => a.position - b.position)
        .map(mapToExercise),
    };
  }

  const program: WeekSchedule[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([week, days]) => ({ week, days }));

  return { program, warmupSteps, failureTechniques, programId: programResult.data.id as string };
}
