import type { BuilderDay } from "./types";

/**
 * Highest week number in use: the declared total, or a later week that has days.
 * (They can differ after weeks are added/duplicated/deleted.)
 */
export function lastWeek(program: { totalWeeks: number; days: Pick<BuilderDay, "week">[] }): number {
  return Math.max(program.totalWeeks, 0, ...program.days.map((d) => d.week));
}

/**
 * Index for a new day appended to `week`. One past the highest index in use —
 * not the day count, which would collide with an existing day after a deletion.
 */
export function nextDayIndex(days: Pick<BuilderDay, "week" | "dayIndex">[], week: number): number {
  return Math.max(-1, ...days.filter((d) => d.week === week).map((d) => d.dayIndex)) + 1;
}

/**
 * The declared week count once `week` is deleted: deleting the last week shrinks the
 * program (but never below the last week that still has days); any other week leaves it.
 */
export function totalWeeksAfterDeletingWeek(program: { totalWeeks: number; days: Pick<BuilderDay, "week">[] }, week: number): number {
  if (week !== program.totalWeeks) return program.totalWeeks;
  const remaining = program.days.filter((d) => d.week !== week);
  return Math.max(week - 1, ...remaining.map((d) => d.week), 0);
}
