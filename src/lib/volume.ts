import type { BodyWeightLog } from "./types";
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

/**
 * Working sets summed per program week, exercise and day (the database does the adding).
 * The day matters because bodyweight exercises add the body weight logged by then.
 */
export interface VolumeGroup {
  week: number;
  exerciseId: string;
  /** Local calendar day, YYYY-MM-DD. */
  loggedOn: string;
  /** Σ logged weight (kg) × reps over the group's sets. */
  weightRepsKg: number;
  /** Σ reps over the group's sets. */
  reps: number;
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
export function weeklyVolume(groups: VolumeGroup[], exercisesById: Record<string, VolumeExercise>, logs: BodyWeightLog[]): WeeklyVolume {
  const byWeek = new Map<number, RegionVolumes>();
  let missingBodyWeight = false;
  for (const group of groups) {
    const exercise = exercisesById[group.exerciseId] ?? UNKNOWN_EXERCISE;
    const bodyWeight = exercise.isBodyweight ? bodyWeightOn(logs, group.loggedOn) : null;
    if (exercise.isBodyweight && bodyWeight === null) missingBodyWeight = true;
    const regions = byWeek.get(group.week) ?? emptyRegions();
    // Same as summing setLoadKg(weight) × reps over the sets: the load is linear in weight.
    regions[regionOf(exercise.muscleGroup)] +=
      group.weightRepsKg * (exercise.weightPerSide ? 2 : 1) + (bodyWeight ?? 0) * group.reps;
    byWeek.set(group.week, regions);
  }
  const weeks = Array.from(byWeek, ([week, raw]) => {
    const byRegion = Object.fromEntries(Object.entries(raw).map(([id, v]) => [id, Math.round(v)])) as RegionVolumes;
    return { week, volume: Object.values(byRegion).reduce((a, b) => a + b, 0), byRegion };
  }).sort((a, b) => a.week - b.week);
  return { weeks, missingBodyWeight };
}
