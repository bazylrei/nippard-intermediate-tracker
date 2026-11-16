import type { BodyWeightLog } from "./types";
import { localYmd } from "./dates";
import { MUSCLE_REGIONS, regionOf, type RegionVolumes } from "./muscle-regions";

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

/** What weekly volume needs to know about an exercise: how to load its sets and which muscle group it trains. */
export interface VolumeExercise extends LoadFlags {
  muscleGroup: string;
}

export interface WeekVolume {
  week: number;
  /** Volume (kg × reps): the sum of `byRegion`. */
  volume: number;
  /** The week's volume per body region, each rounded; zero for a region not trained. */
  byRegion: RegionVolumes;
}

export interface WeeklyVolume {
  /** Weeks ascending. */
  weeks: WeekVolume[];
  /** Bodyweight sets were counted without a body weight (none logged yet), so they're understated. */
  missingBodyWeight: boolean;
}

const UNKNOWN_EXERCISE: VolumeExercise = { weightPerSide: false, isBodyweight: false, muscleGroup: "" };

function emptyRegions(): RegionVolumes {
  return Object.fromEntries(MUSCLE_REGIONS.map(({ id }) => [id, 0])) as RegionVolumes;
}

/** Volume per program week and body region, with per-side and bodyweight loads applied. */
export function weeklyVolume(sets: VolumeSet[], exercisesById: Record<string, VolumeExercise>, logs: BodyWeightLog[]): WeeklyVolume {
  const byWeek = new Map<number, RegionVolumes>();
  let missingBodyWeight = false;
  for (const set of sets) {
    const exercise = exercisesById[set.exerciseId] ?? UNKNOWN_EXERCISE;
    const bodyWeight = exercise.isBodyweight ? bodyWeightOn(logs, localYmd(new Date(set.loggedAt))) : null;
    if (exercise.isBodyweight && bodyWeight === null) missingBodyWeight = true;
    const regions = byWeek.get(set.week) ?? emptyRegions();
    regions[regionOf(exercise.muscleGroup)] += setLoadKg(set.weightKg, exercise, bodyWeight) * set.reps;
    byWeek.set(set.week, regions);
  }
  const weeks = Array.from(byWeek, ([week, raw]) => {
    const byRegion = Object.fromEntries(Object.entries(raw).map(([id, v]) => [id, Math.round(v)])) as RegionVolumes;
    return { week, volume: Object.values(byRegion).reduce((a, b) => a + b, 0), byRegion };
  }).sort((a, b) => a.week - b.week);
  return { weeks, missingBodyWeight };
}

/** One logged working set, with the session it belongs to. */
export interface SessionSet {
  sessionId: string;
  exerciseId: string;
  weightKg: number;
  reps: number;
  loggedAt: string;
}

export interface SessionVolume {
  /** Calendar date (UTC, like the weight history) of the session's last set for the exercise. */
  date: string;
  /** Volume (kg × reps) the exercise moved in that one session. */
  volume: number;
}

/**
 * Each exercise's volume per session, oldest first, with per-side and bodyweight
 * loads applied (body weight as of each set, like `weeklyVolume`).
 */
export function sessionVolumes(
  sets: SessionSet[],
  flagsById: Record<string, LoadFlags>,
  logs: BodyWeightLog[],
): Record<string, SessionVolume[]> {
  const bySession = new Map<string, { exerciseId: string; volume: number; lastAt: string }>();
  for (const set of sets) {
    const flags = flagsById[set.exerciseId] ?? { weightPerSide: false, isBodyweight: false };
    const bodyWeight = flags.isBodyweight ? bodyWeightOn(logs, localYmd(new Date(set.loggedAt))) : null;
    const key = `${set.exerciseId}:${set.sessionId}`;
    const entry = bySession.get(key) ?? { exerciseId: set.exerciseId, volume: 0, lastAt: set.loggedAt };
    entry.volume += setLoadKg(set.weightKg, flags, bodyWeight) * set.reps;
    if (set.loggedAt > entry.lastAt) entry.lastAt = set.loggedAt;
    bySession.set(key, entry);
  }
  const result: Record<string, { at: string; point: SessionVolume }[]> = {};
  for (const { exerciseId, volume, lastAt } of bySession.values()) {
    (result[exerciseId] ??= []).push({ at: lastAt, point: { date: lastAt.split("T")[0], volume: Math.round(volume) } });
  }
  return Object.fromEntries(
    Object.entries(result).map(([id, rows]) => [id, rows.sort((a, b) => a.at.localeCompare(b.at)).map((r) => r.point)]),
  );
}

/** Percent change in volume from the previous session to the latest; null with fewer than two sessions or no previous volume. */
export function volumeChangePercent(series: SessionVolume[]): number | null {
  if (series.length < 2) return null;
  const previous = series[series.length - 2].volume;
  if (previous <= 0) return null;
  return Math.round(((series[series.length - 1].volume - previous) / previous) * 100);
}
