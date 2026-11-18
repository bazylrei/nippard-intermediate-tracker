"use client";

import { useState } from "react";
import { Play, X } from "lucide-react";
import { dayLabel } from "@/lib/day-types";
import type { WorkoutDay } from "@/lib/types";
import type { UnfinishedChoice } from "@/lib/unfinished-workout";

export interface UnfinishedSummary {
  /** e.g. "Upper — Strength". */
  label: string;
  /** Working sets logged so far. */
  setCount: number;
}

interface Props {
  week: number;
  day: WorkoutDay;
  /** Another workout left unfinished; it has to be saved or discarded first. */
  unfinished: UnfinishedSummary | null;
  /** Starts the workout, settling the unfinished one as chosen. Rejects if that fails. */
  onStart: (choice: UnfinishedChoice | null) => Promise<void>;
  onClose: () => void;
}

const sets = (n: number) => `${n} ${n === 1 ? "set" : "sets"}`;

/** Confirms the day before starting it, so browsing the program never starts a workout by accident. */
export default function StartWorkoutSheet({ week, day, unfinished, onStart, onClose }: Props) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Stays open on failure so the choice can be retried. */
  async function start(choice: UnfinishedChoice | null) {
    setStarting(true);
    setError(null);
    try {
      await onStart(choice);
    } catch (err) {
      console.error(err);
      setError("Couldn't start the workout. Try again.");
      setStarting(false);
    }
  }

  const hasLoggedSets = !!unfinished && unfinished.setCount > 0;

  return (
    <div
      className="overlay-backdrop fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "color-mix(in srgb, var(--bg) 60%, transparent)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-label={`Start ${dayLabel(day.dayType)}`}
        className="overlay-sheet w-full max-w-lg glass-strong gloss rounded-t-3xl p-6 space-y-5"
        style={{ boxShadow: "0 -4px 40px color-mix(in srgb, var(--bg) 50%, transparent), 0 0 0 1px color-mix(in srgb, var(--fg) 8%, transparent)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted uppercase tracking-widest font-display font-semibold">Week {week}</p>
            <h3 className="font-display font-bold text-xl text-fg leading-tight">{dayLabel(day.dayType)}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-subtle hover:text-fg transition-colors cursor-pointer p-1 shrink-0 mt-0.5">
            <X size={20} />
          </button>
        </div>

        <ol className="space-y-1.5">
          {day.exercises.map((ex, i) => (
            <li key={ex.id} className="flex gap-3 text-sm">
              <span className="text-subtle font-display tabular-nums w-4 text-right">{i + 1}</span>
              <span className="text-fg">{ex.name}</span>
            </li>
          ))}
        </ol>

        {unfinished && (
          <p className="text-sm text-muted rounded-xl px-4 py-3" style={{ background: "color-mix(in srgb, var(--fg) 6%, transparent)" }}>
            {hasLoggedSets
              ? <>Your <span className="text-fg font-semibold">{unfinished.label}</span> workout is unfinished, with {sets(unfinished.setCount)} logged. Save it as it is, or discard it?</>
              : <>Your unfinished <span className="text-fg font-semibold">{unfinished.label}</span> workout has no sets logged, so it will be discarded.</>}
          </p>
        )}

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        {hasLoggedSets ? (
          <div className="flex gap-2">
            <button
              onClick={() => start("discard")}
              disabled={starting}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-danger cursor-pointer"
              style={{ background: "color-mix(in srgb, var(--fg) 7%, transparent)" }}
            >
              Discard it & start
            </button>
            <button
              onClick={() => start("save")}
              disabled={starting}
              className="btn-primary flex-1 gloss font-display font-bold py-3 rounded-xl text-sm"
            >
              Save it & start
            </button>
          </div>
        ) : (
          <button
            onClick={() => start(unfinished ? "discard" : null)}
            disabled={starting}
            className="btn-primary gloss w-full flex items-center justify-center gap-2 font-display font-bold text-base py-3.5 rounded-2xl"
          >
            <Play size={16} fill="currentColor" />
            {starting ? "Starting…" : "Start workout"}
          </button>
        )}
      </div>
    </div>
  );
}
