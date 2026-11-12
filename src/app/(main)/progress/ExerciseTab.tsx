import { ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { dayLabel } from "@/lib/day-types";
import { formatCalendarDate } from "@/lib/dates";
import { kgToDisplay, type WeightUnit } from "@/lib/units";
import type { ExerciseOption } from "@/hooks/useExerciseCatalog";
import { CHART_TOOLTIP_STYLE } from "./chart-style";
import EmptyState from "./EmptyState";

export interface ExerciseHistoryPoint {
  date: string;
  /** kg */
  weight: number;
  reps: number;
  dayType: string;
}

interface Props {
  options: ExerciseOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  history: ExerciseHistoryPoint[];
  unit: WeightUnit;
  chartWidth: number;
}

export default function ExerciseTab({ options, selectedId, onSelect, history, unit, chartWidth }: Props) {
  if (options.length === 0) {
    return <EmptyState message="No exercise data yet — complete your first workout to start tracking." />;
  }
  const points = history.map((h) => ({ ...h, weight: kgToDisplay(h.weight, unit) }));

  return (
    <div className="space-y-4">
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          aria-label="Exercise"
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-fg focus:outline-none focus:border-primary text-sm font-display font-medium appearance-none cursor-pointer"
        >
          {options.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      </div>

      {points.length === 0 ? (
        <EmptyState message="No data for this exercise yet." />
      ) : (
        <div className="space-y-4">
          {chartWidth > 0 && (
            <div className="bg-surface border border-border rounded-2xl p-3">
              <LineChart width={chartWidth - 24} height={200} data={points} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={formatCalendarDate} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelFormatter={(l) => formatCalendarDate(String(l))}
                  formatter={(v) => [`${Number(v)} ${unit}`, "Weight"]}
                />
                <Line type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={2} dot={{ fill: "var(--primary)", r: 4 }} />
              </LineChart>
            </div>
          )}
          <div className="space-y-2">
            {[...points].reverse().map((h, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-display font-semibold text-sm text-fg">{h.weight}{unit} × {h.reps} reps</p>
                  <p className="text-xs text-muted mt-0.5">{formatCalendarDate(h.date)}</p>
                </div>
                {h.dayType && (
                  <span className="text-xs font-display font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    {dayLabel(h.dayType)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
