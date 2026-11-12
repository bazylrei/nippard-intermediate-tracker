import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useProgramContext } from "@/context/ProgramContext";
import type { WorkoutDay } from "@/lib/types";

/**
 * The day being trained, from `?week=&day=`. `workoutDay` is null for a
 * malformed URL or a day the program doesn't have — never a guessed default.
 */
export function useWorkoutRoute(): { week: number; dayIndex: number; workoutDay: WorkoutDay | null } {
  const searchParams = useSearchParams();
  const { getWorkoutDay } = useProgramContext();
  const week = Number(searchParams.get("week"));
  const dayIndex = Number(searchParams.get("day"));
  const workoutDay = useMemo(
    () => (Number.isInteger(week) && Number.isInteger(dayIndex) ? getWorkoutDay(week, dayIndex) : null),
    [week, dayIndex, getWorkoutDay],
  );
  return { week, dayIndex, workoutDay };
}
