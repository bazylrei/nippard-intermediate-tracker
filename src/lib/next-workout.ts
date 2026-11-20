import { getWorkoutOverview } from "./db";
import { programRun } from "./program-data";
import type { WorkoutPosition, WeekSchedule } from "./types";

/**
 * The workout to open next in the program the user follows: its unfinished one
 * if there is one, otherwise the earliest day not yet done in this run through
 * it. Null while the schedule hasn't loaded, or following no program.
 */
export async function findNextWorkout(program: WeekSchedule[], programId: string | null): Promise<WorkoutPosition | null> {
  const { unfinished, completed } = await getWorkoutOverview(programId);
  if (unfinished) return { week: unfinished.week, dayIndex: unfinished.dayIndex };
  return programRun(completed, program).next;
}
