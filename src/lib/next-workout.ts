import { getWorkoutOverview } from "./db";
import { programRun } from "./program-data";
import type { WorkoutPosition, WeekSchedule } from "./types";

/**
 * The workout to open next: the unfinished one if there is one, otherwise the
 * earliest day not yet done in this run through the program. Null while the
 * schedule hasn't loaded.
 */
export async function findNextWorkout(program: WeekSchedule[]): Promise<WorkoutPosition | null> {
  const { unfinished, completed } = await getWorkoutOverview();
  if (unfinished) return { week: unfinished.week, dayIndex: unfinished.dayIndex };
  return programRun(completed, program).next;
}
