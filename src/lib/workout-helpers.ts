import type { Exercise, SetLog } from "./types";
import type { ActiveWorkoutInfo } from "@/components/ActiveWorkoutBanner";
import { cacheSet, cacheDelete } from "./cache";

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

export function writeBanner(exIdx: number, exercises: Exercise[], wk: number, dIdx: number, dType: string): void {
  const ex = exercises[exIdx];
  if (!ex) return;
  const info: ActiveWorkoutInfo = {
    week: wk, dayIndex: dIdx, dayType: dType,
    exerciseName: ex.name,
    exerciseIndex: exIdx,
    exerciseTotal: exercises.length,
  };
  cacheSet("active_workout", info);
  window.dispatchEvent(new Event("active_workout_changed"));
}

export function clearBanner(): void {
  cacheDelete("active_workout");
  window.dispatchEvent(new Event("active_workout_changed"));
}
