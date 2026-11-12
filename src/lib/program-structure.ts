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
