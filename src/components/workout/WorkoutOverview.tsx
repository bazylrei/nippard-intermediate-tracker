"use client";

import { useState } from "react";
import Link from "next/link";
import { dayLabel } from "@/lib/day-types";
import type { Exercise } from "@/lib/types";
import { Play } from "lucide-react";

interface Props {
  week: number;
  dayType: string;
  exercises: Exercise[];
  /** Starts the workout; reports its own failure and leaves the overview open. */
  onBegin: () => Promise<void>;
  /** Why beginning failed, if it did. */
  error?: React.ReactNode;
}

/** The day before it starts: nothing is recorded, and the timer doesn't run, until Begin is pressed. */
export default function WorkoutOverview({ week, dayType, exercises, onBegin, error }: Props) {
  const resolvedExercises = exercises;
  const [beginning, setBeginning] = useState(false);

  /** One tap, one session: further taps are ignored until it's started (or has failed). */
  async function begin() {
    if (beginning) return;
    setBeginning(true);
    try {
      await onBegin();
    } finally {
      setBeginning(false);
    }
  }
  return (
      <div className="h-full flex flex-col max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid color-mix(in srgb, var(--fg) 8%, transparent)" }}>
          <div>
            <p className="font-display font-semibold text-xs tracking-widest text-muted uppercase">Week {week}</p>
            <h1 className="font-display text-lg font-bold text-fg">{dayLabel(dayType)}</h1>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3">
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

        <div className="px-4 pt-4 pb-above-raised-tab space-y-2" style={{ borderTop: "1px solid color-mix(in srgb, var(--fg) 8%, transparent)" }}>
          {error}
          <button
            onClick={begin}
            disabled={beginning}
            className="btn-primary gloss w-full flex items-center justify-center gap-2 font-display font-bold text-lg py-4 rounded-2xl"
          >
            <Play size={20} fill="currentColor" />
            {beginning ? "Starting…" : "Begin Workout"}
          </button>
          <Link href="/program" className="block text-center text-sm text-muted hover:text-fg py-1">
            Choose a different workout
          </Link>
        </div>
      </div>
  );
}
