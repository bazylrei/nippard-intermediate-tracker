import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, type BarShapeProps } from "recharts";
import { kgToDisplay, type WeightUnit } from "@/lib/units";
import type { WeeklyVolume } from "@/lib/volume";
import { MUSCLE_REGIONS } from "@/lib/muscle-regions";
import BodyWeightCta from "@/components/widgets/BodyWeightCta";
import EmptyState from "@/components/widgets/EmptyState";
import RegionLegend, { regionColor } from "./RegionLegend";
import StackSegment from "./StackSegment";
import WeekTooltip from "./WeekTooltip";
import { weekOf, type VolumeRow } from "./volume-chart";

interface Props {
  /** Volume in kg × reps per program week and body region, per-side and bodyweight loads applied. */
  volume: WeeklyVolume;
  unit: WeightUnit;
  chartWidth: number;
  /** Logs today's weigh-in (kg) and refreshes the volume. */
  onLogBodyWeight: (weightKg: number) => Promise<void>;
}

export default function VolumeTab({ volume, unit, chartWidth, onLogBodyWeight }: Props) {
  // The week the user tapped; until then the details show the latest week.
  const [pickedWeek, setPickedWeek] = useState<number | null>(null);
  // Regions trained in any week. Each keeps its own colour whichever others appear.
  const regions = MUSCLE_REGIONS.filter(({ id }) => volume.weeks.some((w) => w.byRegion[id] > 0));
  const data: VolumeRow[] = volume.weeks.map((w) => {
    const row: VolumeRow = { week: w.week, top: [...regions].reverse().find(({ id }) => w.byRegion[id] > 0)?.id };
    for (const { id } of regions) row[id] = Math.round(kgToDisplay(w.byRegion[id], unit));
    return row;
  });
  const shown = volume.weeks.find((w) => w.week === pickedWeek) ?? volume.weeks.at(-1);
  const selectedWeek = shown && pickedWeek !== null ? shown.week : null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted font-display uppercase tracking-wider">Weekly training volume by body region ({unit})</p>
      {volume.missingBodyWeight && (
        <BodyWeightCta unit={unit} message="Bodyweight exercises count only their added weight until you log your body weight." onSave={onLogBodyWeight} />
      )}
      {!shown ? (
        <EmptyState message="No volume data yet — complete a workout first." />
      ) : (
        <>
          {chartWidth > 0 && (
            <div className="bg-surface border border-border rounded-2xl p-3">
              <BarChart width={chartWidth - 24} height={260} data={data} onClick={(state) => setPickedWeek(weekOf(state.activeLabel))} margin={{ top: 8, right: 4, bottom: 4, left: -16 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={(v) => `W${v}`} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                {/* No cursor: hovering or tapping a week shows its numbers without a highlight band behind the bar. */}
                <Tooltip cursor={false} content={(props) => <WeekTooltip {...props} regions={regions} unit={unit} />} />
                {regions.map(({ id }) => (
                  <Bar
                    key={id}
                    dataKey={id}
                    stackId="volume"
                    fill={regionColor(id)}
                    stroke="var(--surface)"
                    strokeWidth={2}
                    maxBarSize={28}
                    shape={(props: BarShapeProps) => <StackSegment {...props} region={id} selectedWeek={selectedWeek} />}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </div>
          )}
          <RegionLegend week={shown} regions={regions} unit={unit} />
        </>
      )}
    </div>
  );
}
