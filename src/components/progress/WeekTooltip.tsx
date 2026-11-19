import type { TooltipContentProps } from "recharts";
import type { MuscleRegion } from "@/lib/muscle-regions";
import type { WeightUnit } from "@/lib/units";
import { CHART_TOOLTIP_STYLE } from "./chart-style";
import { regionColor } from "./RegionLegend";
import type { VolumeRow } from "./volume-chart";

/** One week's readout: every region trained that week, values first, top of the stack first. */
export default function WeekTooltip({ active, payload, label, regions, unit }: TooltipContentProps & { regions: { id: MuscleRegion; label: string }[]; unit: WeightUnit }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as VolumeRow;
  const trained = regions.filter(({ id }) => (row[id] ?? 0) > 0).reverse();
  const total = trained.reduce((sum, { id }) => sum + (row[id] ?? 0), 0);
  return (
    <div style={CHART_TOOLTIP_STYLE} className="px-3 py-2 text-xs space-y-1">
      <p className="font-display font-semibold">Week {label} · {total.toLocaleString()} {unit}</p>
      {trained.map(({ id, label: name }) => (
        <p key={id} className="flex items-center gap-2">
          <span aria-hidden className="w-3 h-0.5 rounded-full" style={{ background: regionColor(id) }} />
          <span className="font-semibold tabular-nums">{(row[id] ?? 0).toLocaleString()}</span>
          <span className="text-muted">{name}</span>
        </p>
      ))}
    </div>
  );
}
