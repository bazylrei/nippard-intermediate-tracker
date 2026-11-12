import type { WeekSchedule, WorkoutPosition } from "./types";

// ─── Schedule navigation ──────────────────────────────────────────────────────
// Derived from the loaded program, never from hard-coded week/day counts:
// programs edited in the builder can have any number of weeks, days per week,
// and gaps where a day was deleted.

/** Every scheduled day in order — weeks ascending, then days ascending, skipping gaps. */
export function orderedPositions(schedule: WeekSchedule[]): WorkoutPosition[] {
  const positions: WorkoutPosition[] = [];
  for (const { week, days } of [...schedule].sort((a, b) => a.week - b.week)) {
    days.forEach((day, dayIndex) => { if (day) positions.push({ week, dayIndex }); });
  }
  return positions;
}

function isAfter(a: WorkoutPosition, b: WorkoutPosition): boolean {
  return a.week > b.week || (a.week === b.week && a.dayIndex > b.dayIndex);
}

/**
 * The workout after the last completed one; wraps to the start once the
 * program is finished. Null while the schedule hasn't loaded.
 */
export function nextWorkout(last: WorkoutPosition | null, schedule: WeekSchedule[]): WorkoutPosition | null {
  const positions = orderedPositions(schedule);
  if (positions.length === 0) return null;
  if (!last) return positions[0];
  return positions.find((p) => isAfter(p, last)) ?? positions[0];
}

/** 1-based session number of a position within the program (0 if it isn't scheduled). */
export function getSessionNumber(position: WorkoutPosition, schedule: WeekSchedule[]): number {
  return orderedPositions(schedule).findIndex((p) => p.week === position.week && p.dayIndex === position.dayIndex) + 1;
}

export function getTotalSessions(schedule: WeekSchedule[]): number {
  return orderedPositions(schedule).length;
}
