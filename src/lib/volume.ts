import type { BodyWeightLog } from "./types";
import { localYmd } from "./dates";

/** What decides how much weight a set really moves. */
export interface LoadFlags {
  /** The logged weight is per hand/side (dumbbells): the load is double. */
  weightPerSide: boolean;
  /** The logged weight is added to your body (pull-ups, dips): the load includes body weight. */
  isBodyweight: boolean;
}

/** Weight moved per rep, in kg. Body weight counts only when known (null leaves it out). */
export function setLoadKg(weightKg: number, flags: LoadFlags, bodyWeightKg: number | null): number {
  const added = weightKg * (flags.weightPerSide ? 2 : 1);
  return flags.isBodyweight ? added + (bodyWeightKg ?? 0) : added;
}

/**
 * Body weight on a date (logs sorted oldest first): the latest weigh-in on or
 * before it, else the first weigh-in after (closest known), or null with none.
 */
export function bodyWeightOn(logs: BodyWeightLog[], ymd: string): number | null {
  if (logs.length === 0) return null;
  let found = logs[0].weightKg;
  for (const log of logs) {
    if (log.loggedOn > ymd) break;
    found = log.weightKg;
  }
  return found;
}

export interface VolumeSet {
  week: number;
  exerciseId: string;
  weightKg: number;
  reps: number;
  loggedAt: string;
}

export interface WeeklyVolume {
  /** Volume (kg × reps) per program week, weeks ascending. */
  weeks: { week: number; volume: number }[];
  /** Bodyweight sets were counted without a body weight (none logged yet), so they're understated. */
  missingBodyWeight: boolean;
}

/** Total volume per program week, with per-side and bodyweight loads applied. */
export function weeklyVolume(sets: VolumeSet[], flagsById: Record<string, LoadFlags>, logs: BodyWeightLog[]): WeeklyVolume {
  const byWeek = new Map<number, number>();
  let missingBodyWeight = false;
  for (const set of sets) {
    const flags = flagsById[set.exerciseId] ?? { weightPerSide: false, isBodyweight: false };
    const bodyWeight = flags.isBodyweight ? bodyWeightOn(logs, localYmd(new Date(set.loggedAt))) : null;
    if (flags.isBodyweight && bodyWeight === null) missingBodyWeight = true;
    const volume = setLoadKg(set.weightKg, flags, bodyWeight) * set.reps;
    byWeek.set(set.week, (byWeek.get(set.week) ?? 0) + volume);
  }
  const weeks = Array.from(byWeek, ([week, volume]) => ({ week, volume: Math.round(volume) })).sort((a, b) => a.week - b.week);
  return { weeks, missingBodyWeight };
}
