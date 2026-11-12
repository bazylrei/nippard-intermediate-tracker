"use client";

import { DAY_LABELS } from "@/lib/program-data";
import type { Exercise } from "@/lib/types";
import { ArrowLeft, Play } from "lucide-react";

interface Props {
  week: number;
  dayType: string;
  exercises: Exercise[];
  onBack: () => void;
  onBegin: () => void;
}

export default function WorkoutOverview({ week, dayType, exercises, onBack, onBegin }: Props) {
  const resolvedExercises = exercises;
  return (
      <div className="h-dvh flex flex-col max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid color-mix(in srgb, var(--fg) 8%, transparent)" }}>
          <button onClick={() => onBack()} className="text-subtle hover:text-fg transition-colors cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="font-display font-semibold text-xs tracking-widest text-muted uppercase">Week {week}</p>
            <h1 className="font-display text-lg font-bold text-fg">{DAY_LABELS[dayType]}</h1>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          <p className="font-display font-semibold text-xs tracking-widest text-muted uppercase">
            {resolvedExercises.length} exercises
          </p>
          <div className="space-y-2">
            {resolvedExercises.map((ex, i) => (
              <div key={i} className="glass gloss rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center font-display text-xs font-bold text-muted shrink-0"
                  style={{ background: "color-mix(in srgb, var(--fg) 8%, transparent)" }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-fg truncate">{ex.name}</p>
                  <p className="text-xs text-muted">
                    {ex.earlySetCount + ex.lastSetCount} sets · {ex.repRange[0]}–{ex.repRange[1]} reps
                  </p>
                </div>
                <span className="text-xs text-subtle capitalize shrink-0">{ex.muscleGroup}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4" style={{ borderTop: "1px solid color-mix(in srgb, var(--fg) 8%, transparent)" }}>
          <button
            onClick={() => onBegin()}
            className="gloss w-full flex items-center justify-center gap-2 text-primary-fg font-display font-bold text-lg py-4 rounded-2xl transition-opacity cursor-pointer hover:opacity-90"
            style={{
              background: "linear-gradient(170deg, color-mix(in srgb, var(--primary) 80%, white) 0%, var(--primary) 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 20px color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
          >
            <Play size={20} fill="currentColor" />
            Begin Workout
          </button>
        </div>
      </div>
  );
}
