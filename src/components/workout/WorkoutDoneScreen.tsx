"use client";

import { DAY_LABELS } from "@/lib/program-data";
import type { Exercise, SetLog } from "@/lib/types";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { kgToDisplay, KG_TO_LBS } from "@/lib/units";

interface Props {
  week: number;
  dayType: string;
  exercises: Exercise[];
  sessionSets: SetLog[];
  postHistory: Record<string, { date: string; weight: number; reps: number }[]>;
  unit: "kg" | "lbs";
  onHome: () => void;
  onProgress: () => void;
}

export default function WorkoutDoneScreen({ week, dayType, exercises, sessionSets, postHistory, unit, onHome, onProgress }: Props) {
  const totalWorkingSets = sessionSets.filter((s) => s.setIndex >= 0).length;

  return (
      <div className="min-h-screen bg-bg pb-16">
        <div className="max-w-lg mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col items-center text-center pt-12 pb-8 gap-4">
            <div className="w-20 h-20 glass gloss rounded-full flex items-center justify-center"
              style={{ boxShadow: "0 0 40px color-mix(in srgb, var(--primary) 25%, transparent)" }}>
              <Trophy size={40} className="text-primary" />
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold text-fg leading-tight">Workout Complete!</h1>
              <p className="text-muted mt-1 text-sm">
                Week {week} · {DAY_LABELS[dayType]}
              </p>
              <p className="text-muted text-xs mt-0.5">
                {exercises.length} exercises · {totalWorkingSets} sets
              </p>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={() => onHome()}
                className="flex-1 glass gloss text-fg font-medium py-3 rounded-2xl transition-colors cursor-pointer text-sm"
              >
                Home
              </button>
              <button
                onClick={() => onProgress()}
                className="flex-1 gloss text-primary-fg font-display font-bold py-3 rounded-2xl transition-opacity cursor-pointer hover:opacity-90 text-sm"
                style={{
                  background: "linear-gradient(170deg, color-mix(in srgb, var(--primary) 80%, white) 0%, var(--primary) 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 20px color-mix(in srgb, var(--primary) 35%, transparent)",
                }}
              >
                Full Progress
              </button>
            </div>
          </div>

          {/* Per-exercise cards */}
          <div className="space-y-4">
            {exercises.map((ex) => {
              const exSets = sessionSets.filter((s) => s.exerciseId === ex.id && s.setIndex >= 0);
              if (exSets.length === 0) return null;

              const history = postHistory[ex.id] ?? [];
              const chartData = history.slice(-8).map((h, i, arr) => ({
                session: i + 1,
                weight: Math.round(h.weight * 10) / 10,
                isToday: i === arr.length - 1,
              }));

              const todayBest = exSets.reduce((m, s) => s.weight > m.weight ? s : m, exSets[0]);
              const prevPoint = history.length >= 2 ? history[history.length - 2] : null;
              const todayWeight = history[history.length - 1]?.weight ?? todayBest.weight;
              const delta = prevPoint ? todayWeight - prevPoint.weight : null;
              const totalVolume = Math.round(exSets.reduce((sum, s) => sum + s.weight * s.reps, 0));
              const displayWeight = kgToDisplay(todayBest.weight, unit);

              return (
                <div key={ex.id} className="glass gloss rounded-2xl p-4 space-y-3">
                  {/* Exercise header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display font-bold text-base text-fg leading-tight">{ex.name}</p>
                      <p className="text-xs text-muted capitalize">{ex.muscleGroup}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-bold text-xl text-fg">
                        {ex.weightPerSide && <span className="text-sm text-muted mr-0.5">2×</span>}
                        {displayWeight}{unit}
                      </p>
                      <p className="text-xs text-muted">{exSets.length} sets · {exSets.map(s => s.reps).join("-")} reps</p>
                    </div>
                  </div>

                  {/* Delta vs last time + volume */}
                  <div className="flex items-center gap-3">
                    {delta !== null && (
                      <div className={`flex items-center gap-1 text-xs font-display font-semibold px-2.5 py-1 rounded-full ${
                        delta > 0 ? "text-accent" : delta < 0 ? "text-danger" : "text-muted"
                      }`} style={{ background: delta > 0
                        ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                        : delta < 0
                        ? "color-mix(in srgb, var(--danger) 12%, transparent)"
                        : "color-mix(in srgb, var(--fg) 8%, transparent)"
                      }}>
                        {delta > 0 ? <TrendingUp size={11} /> : delta < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                        {delta > 0 ? "+" : ""}{Math.round(delta * 10) / 10}{unit} vs last
                      </div>
                    )}
                    <div className="text-xs text-muted">
                      Vol: <span className="text-fg font-display font-semibold">{Math.round(totalVolume * (unit === "lbs" ? KG_TO_LBS : 1))}{unit}</span>
                    </div>
                  </div>

                  {/* Sparkline chart */}
                  {chartData.length >= 2 && (
                    <div>
                      <p className="text-[10px] text-subtle uppercase tracking-widest mb-1 font-display">Weight progression (last set)</p>
                      <ResponsiveContainer width="100%" height={72}>
                        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                          <YAxis domain={["auto", "auto"]} hide />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0].payload as { weight: number; isToday: boolean };
                              return (
                                <div className="glass rounded-lg px-2 py-1 text-xs font-display font-semibold"
                                  style={{ border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)", background: "var(--surface)" }}>
                                  {d.isToday ? "Today · " : ""}{d.weight}{unit}
                                </div>
                              );
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="weight"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            dot={(props) => {
                              const { cx, cy, payload } = props as { cx: number; cy: number; payload: { isToday: boolean } };
                              if (payload.isToday) {
                                return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill="var(--primary)" stroke="var(--bg)" strokeWidth={2} />;
                              }
                              return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={2} fill="var(--primary)" opacity={0.4} />;
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {chartData.length < 2 && (
                    <p className="text-xs text-subtle text-center py-2">First time logging this exercise — come back next session to see your progress.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
  );
}
