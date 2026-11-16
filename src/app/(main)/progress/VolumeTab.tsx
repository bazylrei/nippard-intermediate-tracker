import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Rectangle, type BarShapeProps, type TooltipContentProps } from "recharts";
import { kgToDisplay, type WeightUnit } from "@/lib/units";
import type { WeeklyVolume } from "@/lib/volume";
import { MUSCLE_REGIONS, type MuscleRegion } from "@/lib/muscle-regions";
import BodyWeightCta from "@/components/BodyWeightCta";
import { CHART_TOOLTIP_STYLE } from "./chart-style";
import EmptyState from "./EmptyState";
import RegionLegend, { regionColor } from "./RegionLegend";

interface Props {
  /** Volume in kg × reps per program week and body region, per-side and bodyweight loads applied. */
  volume: WeeklyVolume;
  unit: WeightUnit;
  chartWidth: number;
  /** Logs today's weigh-in (kg) and refreshes the volume. */
  onLogBodyWeight: (weightKg: number) => Promise<void>;
}

type Row = { week: number; top: MuscleRegion | undefined } & Partial<Record<MuscleRegion, number>>;

/** Rounds only the top segment of each week's stack, the bar's data end. */
function StackSegment({ region, ...props }: BarShapeProps & { region: MuscleRegion }) {
  const row = props.payload as Row;
  return <Rectangle {...props} radius={row.top === region ? [4, 4, 0, 0] : 0} />;
}

export default function VolumeTab({ volume, unit, chartWidth, onLogBodyWeight }: Props) {
  // Regions trained in any week. Each keeps its own colour whichever others appear.
  const regions = MUSCLE_REGIONS.filter(({ id }) => volume.weeks.some((w) => w.byRegion[id] > 0));
  const data: Row[] = volume.weeks.map((w) => {
    const row: Row = { week: w.week, top: [...regions].reverse().find(({ id }) => w.byRegion[id] > 0)?.id };
    for (const { id } of regions) row[id] = Math.round(kgToDisplay(w.byRegion[id], unit));
    return row;
  });
  const latest = volume.weeks.at(-1);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted font-display uppercase tracking-wider">Weekly training volume by body region ({unit})</p>
      {volume.missingBodyWeight && (
        <BodyWeightCta unit={unit} message="Bodyweight exercises count only their added weight until you log your body weight." onSave={onLogBodyWeight} />
      )}
      {!latest ? (
        <EmptyState message="No volume data yet — complete a workout first." />
      ) : (
        <>
          {chartWidth > 0 && (
            <div className="bg-surface border border-border rounded-2xl p-3">
              <BarChart width={chartWidth - 24} height={260} data={data} margin={{ top: 8, right: 4, bottom: 4, left: -16 }}>
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
                    shape={(props: BarShapeProps) => <StackSegment {...props} region={id} />}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </div>
          )}
          <RegionLegend week={latest} regions={regions} unit={unit} />
        </>
      )}
    </div>
  );
}

/** One week's readout: every region trained that week, values first, top of the stack first. */
function WeekTooltip({ active, payload, label, regions, unit }: TooltipContentProps & { regions: { id: MuscleRegion; label: string }[]; unit: WeightUnit }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
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
