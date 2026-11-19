import { kgToDisplay, type WeightUnit } from "@/lib/units";
import type { MuscleRegion } from "@/lib/muscle-regions";
import type { WeekVolume } from "@/lib/volume";

interface Props {
  /** The week whose numbers are listed (the one picked in the chart, else the latest). */
  week: WeekVolume;
  /** Regions shown in the chart, in their fixed order. */
  regions: { id: MuscleRegion; label: string }[];
  unit: WeightUnit;
}

/**
 * The chart's legend, with each region's volume for one week beside it, so
 * every colour is named and the numbers are readable without hovering.
 */
export default function RegionLegend({ week, regions, unit }: Props) {
  const format = (kg: number) => `${Math.round(kgToDisplay(kg, unit)).toLocaleString()} ${unit}`;
  return (
    <section aria-label={`Week ${week.week} volume by body region`} className="bg-surface border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="font-display font-bold text-fg">Week {week.week}</p>
        <p className="text-sm text-muted tabular-nums">{format(week.volume)}</p>
      </div>
      <ul className="space-y-2">
        {regions.map(({ id, label }) => (
          <li key={id} className="flex items-center gap-2 text-sm">
            <span aria-hidden className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: regionColor(id) }} />
            <span className="flex-1 text-muted">{label}</span>
            <span className="text-fg font-semibold tabular-nums">{format(week.byRegion[id])}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A region's series colour (theme tokens in globals.css). */
export function regionColor(id: MuscleRegion): string {
  return `var(--region-${id})`;
}
