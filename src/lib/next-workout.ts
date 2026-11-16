import { getCompletedSlots, getIncompleteSession } from "./db";
import { programRun } from "./program-data";
import type { WorkoutPosition, WeekSchedule } from "./types";

/**
 * The workout to open next: the unfinished one if there is one, otherwise the
 * earliest day not yet done in this run through the program. Null while the
 * schedule hasn't loaded.
 */
export async function findNextWorkout(userId: string, program: WeekSchedule[]): Promise<WorkoutPosition | null> {
  const [incomplete, completed] = await Promise.all([
    getIncompleteSession(userId),
    getCompletedSlots(userId),
  ]);
  if (incomplete) return { week: incomplete.week, dayIndex: incomplete.dayIndex };
  return programRun(completed, program).next;
}
