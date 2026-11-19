import type { MuscleRegion } from "@/lib/muscle-regions";

/** One week of the stacked volume chart: its week number, volume per region, and the region on top. */
export type VolumeRow = { week: number; top: MuscleRegion | undefined } & Partial<Record<MuscleRegion, number>>;

/** The week under a chart click, or null when it landed outside the bars. */
export function weekOf(label: string | number | undefined): number | null {
  const week = Number(label);
  return label === undefined || Number.isNaN(week) ? null : week;
}
