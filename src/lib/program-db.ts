import type { SupabaseClient } from "@supabase/supabase-js";
import type { Exercise, WeekSchedule, WorkoutDay } from "./types";

/** Columns read for a slot's exercise and for each of its alternates. */
const EXERCISE_COLUMNS =
  "id, name, muscle_group, rest_min, rest_max, warmup_protocol, form_note, youtube_url, instructions, is_bodyweight, weight_per_side";

type WarmupProtocolRow = { id: string; steps: string[] };
type FailureTechniqueRow = { id: string; label: string; description: string };

type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: string;
  rest_min: number;
  rest_max: number;
  warmup_protocol: string;
  form_note: string | null;
  youtube_url: string | null;
  instructions: string | null;
  is_bodyweight: boolean;
  weight_per_side: boolean;
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
  alternate_1: ExerciseRow | null;
  alternate_2: ExerciseRow | null;
};

type ProgramDayRow = {
  week: number;
  day_index: number;
  day_type: string;
  program_day_exercises: ProgramDayExerciseRow[];
};

/** An exercise as prescribed in a slot: the exercise's own data plus the slot's sets, reps and RPE. */
function toExercise(ex: ExerciseRow, pde: ProgramDayExerciseRow, alternates: Exercise[]): Exercise {
  return {
    id: ex.id,
    name: ex.name,
    muscleGroup: ex.muscle_group as Exercise["muscleGroup"],
    alternates,
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
    isBodyweight: ex.is_bodyweight ?? false,
    weightPerSide: ex.weight_per_side ?? false,
  };
}

/** The slot's exercise; its alternates get the same prescription under their own ids. */
function mapToExercise(pde: ProgramDayExerciseRow): Exercise {
  const alternates = [pde.alternate_1, pde.alternate_2]
    .filter((alternate): alternate is ExerciseRow => alternate != null)
    .map((alternate) => toExercise(alternate, pde, []));
  return toExercise(pde.exercises, pde, alternates);
}

/** Everything a screen needs about the program the user follows. `programId` is null when they follow none. */
export interface LoadedProgram {
  program: WeekSchedule[];
  warmupSteps: Record<string, string[]>;
  failureTechniques: Record<string, { label: string; description: string }>;
  programId: string | null;
  programName: string | null;
}

type ActiveProgramRow = { id: string; name: string; program_days: ProgramDayRow[] };

const PROGRAM_COLUMNS = `id, name, program_days(week, day_index, day_type, program_day_exercises(position, rep_range_min, rep_range_max, early_set_count, last_set_count, early_set_rpe_min, early_set_rpe_max, last_set_rpe_min, last_set_rpe_max, last_set_target, exercises!program_day_exercises_exercise_id_fkey(${EXERCISE_COLUMNS}), alternate_1:exercises!program_day_exercises_alternate_1_exercise_id_fkey(${EXERCISE_COLUMNS}), alternate_2:exercises!program_day_exercises_alternate_2_exercise_id_fkey(${EXERCISE_COLUMNS})))`;

/** Days grouped into weeks, each day's exercises in slot order. */
function toSchedule(programDays: ProgramDayRow[]): WeekSchedule[] {
  const weekMap = new Map<number, WorkoutDay[]>();
  for (const day of programDays) {
    if (!weekMap.has(day.week)) weekMap.set(day.week, []);
    weekMap.get(day.week)![day.day_index] = {
      dayType: day.day_type,
      exercises: [...day.program_day_exercises]
        .sort((a, b) => a.position - b.position)
        .map(mapToExercise),
    };
  }
  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([week, days]) => ({ week, days }));
}

/**
 * The program `userId` follows (from their preferences, in the same round trip)
 * with warm-ups and failure techniques. Following none is not an error: the
 * schedule is empty and `programId` null. Null only when loading failed.
 */
export async function loadFullProgram(sb: SupabaseClient, userId: string): Promise<LoadedProgram | null> {
  const [prefsResult, warmupResult, techniqueResult] = await Promise.all([
    sb
      .from("user_preferences")
      .select(`program:programs!user_preferences_active_program_id_fkey(${PROGRAM_COLUMNS})`)
      .eq("user_id", userId)
      .maybeSingle(),
    sb.from("warmup_protocols").select("id, steps"),
    sb.from("failure_techniques").select("id, label, description"),
  ]);

  if (prefsResult.error) return null;

  const warmupSteps: Record<string, string[]> = {};
  for (const row of (warmupResult.data ?? []) as WarmupProtocolRow[]) warmupSteps[row.id] = row.steps;

  const failureTechniques: Record<string, { label: string; description: string }> = {};
  for (const row of (techniqueResult.data ?? []) as FailureTechniqueRow[]) {
    failureTechniques[row.id] = { label: row.label, description: row.description };
  }

  const active = (prefsResult.data as { program: ActiveProgramRow | null } | null)?.program ?? null;
  return {
    program: active ? toSchedule(active.program_days) : [],
    warmupSteps,
    failureTechniques,
    programId: active?.id ?? null,
    programName: active?.name ?? null,
  };
}
