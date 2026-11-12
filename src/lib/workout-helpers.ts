import type { Exercise, SetLog } from "./types";
import { clearActiveWorkout, saveActiveWorkout } from "./active-workout";

export function resolveExercises(exercises: Exercise[], selections: Record<string, number>): Exercise[] {
  return exercises.map((ex) => {
    const idx = selections[ex.id] ?? 0;
    if (idx === 1) return { ...ex, name: ex.alternates[0] };
    if (idx === 2) return { ...ex, name: ex.alternates[1] };
    return ex;
  });
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

export type NextStep =
  | { kind: "nextSet"; exerciseIndex: number; setIndex: number }
  /** Move to another exercise, starting at its warm-up (set index -1). */
  | { kind: "nextExercise"; exerciseIndex: number; setIndex: -1 }
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
  const next = exercises.findIndex((ex, i) => i !== exerciseIndex && !isExerciseComplete(ex, setsAfterLog));
  return { kind: "nextExercise", exerciseIndex: next !== -1 ? next : exerciseIndex + 1, setIndex: -1 };
}

export function writeBanner(exIdx: number, exercises: Exercise[], wk: number, dIdx: number, dType: string): void {
  const ex = exercises[exIdx];
  if (!ex) return;
  saveActiveWorkout({
    week: wk, dayIndex: dIdx, dayType: dType,
    exerciseName: ex.name,
    exerciseIndex: exIdx,
    exerciseTotal: exercises.length,
  });
}

export function clearBanner(): void {
  clearActiveWorkout();
}
