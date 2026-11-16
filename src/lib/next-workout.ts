import { getIncompleteSession, getLastCompletedWorkout } from "./db";
import { nextWorkout } from "./program-data";
import type { WorkoutPosition, WeekSchedule } from "./types";

/**
 * The workout to open next: the unfinished one if there is one, otherwise the
 * one after the last completed workout (wrapping to the start once the program
 * is finished). Null while the schedule hasn't loaded.
 */
export async function findNextWorkout(userId: string, program: WeekSchedule[]): Promise<WorkoutPosition | null> {
  const [incomplete, lastCompleted] = await Promise.all([
    getIncompleteSession(userId),
    getLastCompletedWorkout(userId),
  ]);
  if (incomplete) return { week: incomplete.week, dayIndex: incomplete.dayIndex };
  return nextWorkout(lastCompleted, program);
}
