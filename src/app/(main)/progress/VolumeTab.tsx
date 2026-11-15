import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { kgToDisplay, type WeightUnit } from "@/lib/units";
import type { WeeklyVolume } from "@/lib/volume";
import BodyWeightCta from "@/components/BodyWeightCta";
import { CHART_TOOLTIP_STYLE } from "./chart-style";
import EmptyState from "./EmptyState";

interface Props {
  /** Volume in kg × reps per program week, per-side and bodyweight loads applied. */
  volume: WeeklyVolume;
  unit: WeightUnit;
  chartWidth: number;
  /** Logs today's weigh-in (kg) and refreshes the volume. */
  onLogBodyWeight: (weightKg: number) => Promise<void>;
}

export default function VolumeTab({ volume, unit, chartWidth, onLogBodyWeight }: Props) {
  const data = volume.weeks.map((v) => ({ week: v.week, volume: Math.round(kgToDisplay(v.volume, unit)) }));
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted font-display uppercase tracking-wider">Total weekly training volume ({unit})</p>
      {volume.missingBodyWeight && (
        <BodyWeightCta unit={unit} message="Bodyweight exercises count only their added weight until you log your body weight." onSave={onLogBodyWeight} />
      )}
      {data.length === 0 ? (
        <EmptyState message="No volume data yet — complete a workout first." />
      ) : chartWidth > 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-3">
          <BarChart width={chartWidth - 24} height={260} data={data} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="week" tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={(v) => `W${v}`} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(v) => [`${Number(v).toLocaleString()} ${unit}`, "Volume"]}
              labelFormatter={(l) => `Week ${l}`}
            />
            <Bar dataKey="volume" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </div>
      ) : null}
    </div>
  );
}
