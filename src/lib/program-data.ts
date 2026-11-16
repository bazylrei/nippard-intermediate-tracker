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

/** Identifies one scheduled day, e.g. for keying maps by position. */
export function slotKey({ week, dayIndex }: WorkoutPosition): string {
  return `${week}:${dayIndex}`;
}

/** Where the user is in the program, from the days they've actually completed (done in any order). */
export interface ProgramRun {
  /** Whether a day is done in the current run through the program. */
  isDone: (position: WorkoutPosition) => boolean;
  /** How many scheduled days are done in the current run. */
  doneCount: number;
  /** The earliest day not yet done; null while the schedule hasn't loaded. */
  next: WorkoutPosition | null;
}

/**
 * The current run through the program. Days can be done in any order, so a day
 * counts as done from its completed sessions, not from its position. Once every
 * day has been done, a fresh run starts: the run is the lowest completion count
 * across the schedule, and a day is done when it's been completed more times
 * than that. Sessions for days no longer scheduled are ignored.
 */
export function programRun(completed: WorkoutPosition[], schedule: WeekSchedule[]): ProgramRun {
  const positions = orderedPositions(schedule);
  const counts = new Map<string, number>();
  for (const position of completed) counts.set(slotKey(position), (counts.get(slotKey(position)) ?? 0) + 1);
  const countOf = (position: WorkoutPosition) => counts.get(slotKey(position)) ?? 0;

  const run = positions.length ? Math.min(...positions.map(countOf)) : 0;
  const isDone = (position: WorkoutPosition) => countOf(position) > run;
  return {
    isDone,
    doneCount: positions.filter(isDone).length,
    next: positions.find((p) => !isDone(p)) ?? null,
  };
}

/** 1-based session number of a position within the program (0 if it isn't scheduled). */
export function getSessionNumber(position: WorkoutPosition, schedule: WeekSchedule[]): number {
  return orderedPositions(schedule).findIndex((p) => p.week === position.week && p.dayIndex === position.dayIndex) + 1;
}

export function getTotalSessions(schedule: WeekSchedule[]): number {
  return orderedPositions(schedule).length;
}
