import type { SetLog, WorkoutSession } from "../types";

export function mapSession(row: Record<string, unknown>): WorkoutSession {
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

export function mapSetLog(row: Record<string, unknown>): SetLog {
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
