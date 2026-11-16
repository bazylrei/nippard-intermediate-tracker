import type { MuscleGroup } from "./types";

/**
 * The body regions volume is split by. The program's eleven muscle groups are
 * more series than colours can keep apart in a stacked chart, so each folds
 * into one region; "other" catches a muscle group this table doesn't know.
 */
export type MuscleRegion = "chest" | "back" | "shoulders" | "arms" | "legs" | "core" | "other";

/** Fixed order: stack order (first at the bottom), legend order and colour slot, so a region always keeps its colour. */
export const MUSCLE_REGIONS: { id: MuscleRegion; label: string }[] = [
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
  { id: "shoulders", label: "Shoulders" },
  { id: "arms", label: "Arms" },
  { id: "legs", label: "Legs" },
  { id: "core", label: "Core" },
  { id: "other", label: "Other" },
];

const REGION_OF: Record<MuscleGroup, MuscleRegion> = {
  chest: "chest",
  back: "back",
  shoulders: "shoulders",
  biceps: "arms",
  triceps: "arms",
  quads: "legs",
  hamstrings: "legs",
  glutes: "legs",
  calves: "legs",
  hips: "legs",
  abs: "core",
};

export function regionOf(muscleGroup: string | undefined): MuscleRegion {
  return REGION_OF[muscleGroup as MuscleGroup] ?? "other";
}

export type RegionVolumes = Record<MuscleRegion, number>;
