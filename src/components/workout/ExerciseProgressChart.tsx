"use client";

import { useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatCalendarDate } from "@/lib/dates";

/** Recessive axis text: muted ink, small, tabular figures. */
const AXIS_TICK = { fill: "var(--muted)", fontSize: 11, style: { fontVariantNumeric: "tabular-nums" } };

type Metric = "weight" | "volume";

export interface ProgressPoint {
  date: string;
  /** Last-set weight, in the display unit. */
  weight: number;
  /** Session volume, in the display unit; absent when the session has no matching volume. */
  volume?: number;
  isToday: boolean;
}

interface Props {
  points: ProgressPoint[];
  unit: "kg" | "lbs";
}

const SERIES: Record<Metric, { label: string; color: string }> = {
  weight: { label: "Weight", color: "var(--primary)" },
  volume: { label: "Volume", color: "var(--accent)" },
};

/** Compact volume tick: 2300 → "2.3k", so five-digit volumes still fit the axis. */
function volumeTick(v: number, unit: string): string {
  return v >= 1000 ? `${Math.round(v / 100) / 10}k${unit}` : `${v}${unit}`;
}

/** One exercise's progress over its recent sessions: weight and volume together, each switchable off. */
export default function ExerciseProgressChart({ points, unit }: Props) {
  const [visible, setVisible] = useState<Record<Metric, boolean>>({ weight: true, volume: true });
  const hasVolume = points.filter((p) => p.volume !== undefined).length >= 2;
  const show: Record<Metric, boolean> = { weight: visible.weight || !hasVolume, volume: hasVolume && visible.volume };

  /** Flips one line, but never hides both: the chart would be empty. */
  function toggle(metric: Metric) {
    const other: Metric = metric === "weight" ? "volume" : "weight";
    if (visible[metric] && !visible[other]) return;
    setVisible({ ...visible, [metric]: !visible[metric] });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-subtle uppercase tracking-widest font-display">
          {hasVolume ? "Progression (last set weight, session volume)" : "Weight progression (last set)"}
        </p>
        {hasVolume && (
          <div className="flex gap-1">
            {(Object.keys(SERIES) as Metric[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={show[m]}
                onClick={() => toggle(m)}
                className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-display px-2 py-0.5 rounded-full cursor-pointer"
                style={{ color: show[m] ? "var(--fg)" : "var(--muted)", background: show[m] ? "color-mix(in srgb, var(--fg) 8%, transparent)" : "transparent" }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: SERIES[m].color, opacity: show[m] ? 1 : 0.3 }} />
                {SERIES[m].label}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Height includes the date-axis band so its labels aren't clipped. */}
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatCalendarDate}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          {/* Each metric has its own scale: weight on the left, volume on the right. */}
          {show.weight && (
            <YAxis
              yAxisId="weight"
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => `${v}${unit}`}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              tickCount={4}
              width={52}
            />
          )}
          {show.volume && (
            <YAxis
              yAxisId="volume"
              orientation="right"
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => volumeTick(v, unit)}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              tickCount={4}
              width={56}
            />
          )}
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ProgressPoint;
              const parts = [
                show.weight && `${d.weight}${unit}`,
                show.volume && d.volume !== undefined && `vol ${d.volume}${unit}`,
              ].filter(Boolean);
              return (
                <div className="glass rounded-lg px-2 py-1 text-xs font-display font-semibold"
                  style={{ border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)", background: "var(--surface)" }}>
                  {d.isToday ? "Today" : formatCalendarDate(d.date)} · {parts.join(" · ")}
                </div>
              );
            }}
          />
          {(Object.keys(SERIES) as Metric[]).filter((m) => show[m]).map((m) => (
            <Line
              key={m}
              yAxisId={m}
              type="monotone"
              dataKey={m}
              connectNulls
              stroke={SERIES[m].color}
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: { isToday: boolean } };
                if (payload.isToday) {
                  return <circle key={`dot-${m}-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={SERIES[m].color} stroke="var(--bg)" strokeWidth={2} />;
                }
                return <circle key={`dot-${m}-${cx}-${cy}`} cx={cx} cy={cy} r={2} fill={SERIES[m].color} opacity={0.4} />;
              }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
