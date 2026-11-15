import type { BodyWeightLog } from "./types";
import { cacheGet, cacheSet } from "./cache";
import { startOfWeek } from "./dates";

const SKIPPED_KEY = "weigh_in_skipped_week";

/**
 * The weekly weigh-in is due when nothing has been logged since this week
 * started (the user's chosen first day) and it wasn't skipped this week.
 */
export function isWeighInDue(latest: BodyWeightLog | null, now: Date, weekStartsOn: number): boolean {
  const weekStart = startOfWeek(now, weekStartsOn);
  if (cacheGet<string>(SKIPPED_KEY) === weekStart) return false;
  return !latest || latest.loggedOn < weekStart;
}

/** Hides the prompt until next week, on this device. */
export function skipWeighInThisWeek(now: Date, weekStartsOn: number): void {
  cacheSet(SKIPPED_KEY, startOfWeek(now, weekStartsOn));
}
