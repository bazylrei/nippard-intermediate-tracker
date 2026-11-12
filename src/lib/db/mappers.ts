import type { Tables } from "../database.types";
import type { SetLog, WorkoutSession } from "../types";

export function mapSession(row: Tables<"workout_sessions">): WorkoutSession {
  return {
    id: row.id,
    userId: row.user_id,
    programId: row.program_id ?? null,
    week: row.week,
    dayIndex: row.day_index,
    dayType: row.day_type,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    currentExerciseIndex: row.current_exercise_index ?? 0,
    currentSetIndex: row.current_set_index ?? 0,
  };
}

export function mapSetLog(row: Tables<"set_logs">): SetLog {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    exerciseId: row.exercise_id,
    setIndex: row.set_index,
    isLastSet: row.is_last_set,
    weight: row.weight_kg,
    reps: row.reps,
    rpe: row.rpe,
    failureHit: row.failure_hit,
    loggedAt: row.logged_at,
  };
}
