import { cacheDelete, cacheGet, cacheSet } from "./cache";

/** What the "workout in progress" banner shows; kept on the device while a workout is open. */
export interface ActiveWorkoutInfo {
  week: number;
  dayIndex: number;
  dayType: string;
  exerciseName: string;
  exerciseIndex: number;
  exerciseTotal: number;
}

const KEY = "active_workout";
/** Fired in this tab whenever the active workout changes (other tabs get a `storage` event). */
export const ACTIVE_WORKOUT_EVENT = "active_workout_changed";

export function readActiveWorkout(): ActiveWorkoutInfo | null {
  return cacheGet<ActiveWorkoutInfo>(KEY);
}

export function saveActiveWorkout(info: ActiveWorkoutInfo): void {
  cacheSet(KEY, info);
  window.dispatchEvent(new Event(ACTIVE_WORKOUT_EVENT));
}

export function clearActiveWorkout(): void {
  cacheDelete(KEY);
  window.dispatchEvent(new Event(ACTIVE_WORKOUT_EVENT));
}
