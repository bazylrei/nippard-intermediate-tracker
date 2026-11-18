import type { Exercise, ExerciseRecord, SetLog, WorkoutSession } from "./types";
import { chooseExercise, type ExerciseChoices } from "./alternates";
import { clearActiveWorkout, saveActiveWorkout } from "./active-workout";

/** The exercises to do today: each slot's own exercise, or the alternate chosen for it. */
export function resolveExercises(exercises: Exercise[], choices: ExerciseChoices): Exercise[] {
  return exercises.map((ex) => chooseExercise(ex, choices));
}

export function totalSetsForExercise(ex: Exercise): number {
  return ex.earlySetCount + ex.lastSetCount;
}

export function loggedWorkingSets(sets: SetLog[], exerciseId: string): SetLog[] {
  return sets.filter((s) => s.exerciseId === exerciseId && s.setIndex >= 0);
}

export function isExerciseComplete(ex: Exercise, sets: SetLog[]): boolean {
  return loggedWorkingSets(sets, ex.id).length >= totalSetsForExercise(ex);
}

export type WorkoutPhase = "overview" | "warmup" | "sets";

/** The active-workout phase for a set position: -1 is the warm-up, 0+ are working sets. */
export function phaseAt(setIndex: number): WorkoutPhase {
  return setIndex === -1 ? "warmup" : "sets";
}

/**
 * Where to pick an exercise back up: its first unlogged set once it's started
 * (the warm-up is done), otherwise its warm-up (set index -1). A finished
 * exercise has no unlogged set, so it opens at the warm-up position too.
 */
export function resumeSetIndex(ex: Exercise, sets: SetLog[]): number {
  const logged = loggedWorkingSets(sets, ex.id).length;
  return logged > 0 && logged < totalSetsForExercise(ex) ? logged : -1;
}

export type NextStep =
  | { kind: "nextSet"; exerciseIndex: number; setIndex: number }
  /** Move to another exercise, where it was left off (see `resumeSetIndex`). */
  | { kind: "nextExercise"; exerciseIndex: number; setIndex: number }
  | { kind: "complete"; exerciseIndex: number; setIndex: number };

/**
 * Where the workout goes after a set is logged, given the session's sets
 * *including* the one just logged. Pure, so it can run before the save
 * completes (optimistic UI) and its result can be persisted in the same call.
 */
export function planAfterSet(
  exercises: Exercise[], setsAfterLog: SetLog[], exerciseIndex: number, setIndex: number,
): NextStep {
  const current = exercises[exerciseIndex];
  if (setIndex < totalSetsForExercise(current) - 1) {
    return { kind: "nextSet", exerciseIndex, setIndex: setIndex + 1 };
  }
  if (exercises.every((ex) => isExerciseComplete(ex, setsAfterLog))) {
    return { kind: "complete", exerciseIndex, setIndex };
  }
  const found = exercises.findIndex((ex, i) => i !== exerciseIndex && !isExerciseComplete(ex, setsAfterLog));
  const next = found !== -1 ? found : exerciseIndex + 1;
  return { kind: "nextExercise", exerciseIndex: next, setIndex: next < exercises.length ? resumeSetIndex(exercises[next], setsAfterLog) : -1 };
}

/** Records the workout in progress on this device (the tab bar's Workout tab reads it). */
export function saveWorkoutInProgress(exIdx: number, exercises: Exercise[], session: WorkoutSession): void {
  const ex = exercises[exIdx];
  if (!ex) return;
  saveActiveWorkout({
    week: session.week, dayIndex: session.dayIndex, dayType: session.dayType,
    exerciseName: ex.name,
    exerciseIndex: exIdx,
    exerciseTotal: exercises.length,
    startedAt: session.startedAt,
  });
}

export function clearWorkoutInProgress(): void {
  clearActiveWorkout();
}

/**
 * The all-time best set, shown on every set so you always know your top lift for the exercise —
 * except when it's the very set "Last time" already shows.
 */
export function bestSetToShow(bestSet: SetLog | undefined, lastSet: SetLog | undefined): SetLog | undefined {
  if (!bestSet || bestSet.id === lastSet?.id) return undefined;
  return bestSet;
}

const NO_RECORD: ExerciseRecord = { lastSets: [] };

/** The exercise's record, or an empty one (a stable reference) when it has no history. */
export function recordFor(records: Record<string, ExerciseRecord>, exercise: Exercise | undefined): ExerciseRecord {
  return (exercise && records[exercise.id]) || NO_RECORD;
}
