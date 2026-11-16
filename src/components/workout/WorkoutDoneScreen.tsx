"use client";

import { dayLabel } from "@/lib/day-types";
import type { Exercise, SetLog } from "@/lib/types";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { kgToDisplay } from "@/lib/units";
import { setLoadKg, volumeChangePercent } from "@/lib/volume";
import type { PostWorkoutData } from "@/hooks/useWorkoutHistory";
import BodyWeightCta from "@/components/BodyWeightCta";
import ExerciseProgressChart from "@/components/workout/ExerciseProgressChart";

interface Props {
  week: number;
  dayType: string;
  exercises: Exercise[];
  sessionSets: SetLog[];
  postWorkout: PostWorkoutData;
  unit: "kg" | "lbs";
  onHome: () => void;
  onProgress: () => void;
}

export default function WorkoutDoneScreen({ week, dayType, exercises, sessionSets, postWorkout, unit, onHome, onProgress }: Props) {
  const { history: postHistory, volumes, bodyWeightKg } = postWorkout;
  const doneIds = new Set(sessionSets.filter((s) => s.setIndex >= 0).map((s) => s.exerciseId));
  const needsBodyWeight = bodyWeightKg === null && exercises.some((ex) => ex.isBodyweight && doneIds.has(ex.id));
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
                Week {week} · {dayLabel(dayType)}
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
                className="btn-primary flex-1 gloss font-display font-bold py-3 rounded-2xl text-sm"
              >
                Full Progress
              </button>
            </div>
          </div>

          {/* Per-exercise cards */}
          <div className="space-y-4">
            {needsBodyWeight && (
              <BodyWeightCta unit={unit} message="Bodyweight exercises count only their added weight until you log your body weight." onSave={postWorkout.logBodyWeight} />
            )}
            {exercises.map((ex) => {
              const exSets = sessionSets.filter((s) => s.exerciseId === ex.id && s.setIndex >= 0);
              if (exSets.length === 0) return null;

              const history = postHistory[ex.id] ?? [];
              // Volume joins the weight points by date; a date with no volume leaves a gap.
              const volumeByDate = new Map((volumes[ex.id] ?? []).map((v) => [v.date, v.volume]));
              const chartData = history.slice(-8).map((h, i, arr) => {
                const volume = volumeByDate.get(h.date);
                return {
                  date: h.date,
                  weight: kgToDisplay(h.weight, unit),
                  ...(volume !== undefined && { volume: Math.round(kgToDisplay(volume, unit)) }),
                  isToday: i === arr.length - 1,
                };
              });
              const volumeChange = volumeChangePercent(volumes[ex.id] ?? []);

              const todayBest = exSets.reduce((m, s) => s.weight > m.weight ? s : m, exSets[0]);
              const prevPoint = history.length >= 2 ? history[history.length - 2] : null;
              const todayWeight = history[history.length - 1]?.weight ?? todayBest.weight;
              // History is in kg; convert the difference so "+2.5lbs vs last" is really lbs.
              const delta = prevPoint ? kgToDisplay(todayWeight - prevPoint.weight, unit) : null;
              // Weight actually moved: per-side doubled, body weight added to bodyweight exercises.
              const totalVolume = Math.round(exSets.reduce((sum, s) => sum + setLoadKg(s.weight, ex, bodyWeightKg) * s.reps, 0));
              const volumeMissesBodyWeight = ex.isBodyweight && bodyWeightKg === null;
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
                      Vol: <span className="text-fg font-display font-semibold">{Math.round(kgToDisplay(totalVolume, unit))}{unit}</span>
                      {volumeChange !== null && (
                        <span className={`font-display font-semibold ${volumeChange > 0 ? "text-accent" : volumeChange < 0 ? "text-danger" : "text-muted"}`}>
                          {" "}({volumeChange > 0 ? "+" : ""}{volumeChange}% vs last)
                        </span>
                      )}
                      {volumeMissesBodyWeight && <span className="text-subtle"> · added weight only</span>}
                    </div>
                  </div>

                  {chartData.length >= 2 && <ExerciseProgressChart points={chartData} unit={unit} />}
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
