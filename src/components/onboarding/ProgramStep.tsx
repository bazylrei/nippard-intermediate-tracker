"use client";

import { useState } from "react";
import { Play } from "lucide-react";

interface Props {
  name: string;
  /** Null until the program has loaded. */
  summary: { weeks: number; workouts: number } | null;
  /** Whether there's a first workout to start. */
  canStart: boolean;
  /** Finishes onboarding, then opens the first workout / Home. Report their own failure. */
  onStart: () => Promise<void>;
  onHome: () => Promise<void>;
}

export default function ProgramStep({ name, summary, canStart, onStart, onHome }: Props) {
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center gap-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-fg leading-tight">You&apos;re all set</h1>
        <p className="text-sm text-muted">Here&apos;s the program you&apos;ll follow.</p>
      </div>

      <div className="glass gloss rounded-2xl p-5 space-y-1">
        <p className="font-display font-bold text-2xl text-fg leading-tight">{name}</p>
        {summary && <p className="text-sm text-muted">{summary.weeks} weeks · {summary.workouts} workouts</p>}
      </div>
      <p className="text-xs text-subtle -mt-3">Want something different? Build your own under Profile → My programs.</p>

      <div className="space-y-2">
        {canStart && (
          <button
            onClick={() => run(onStart)}
            disabled={busy}
            className="btn-primary gloss w-full flex items-center justify-center gap-2 font-display font-bold text-lg py-4 rounded-2xl cursor-pointer disabled:opacity-60"
          >
            <Play size={18} fill="currentColor" />
            Start first workout
          </button>
        )}
        <button
          onClick={() => run(onHome)}
          disabled={busy}
          className="w-full text-sm text-muted hover:text-fg py-2 cursor-pointer disabled:opacity-60"
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}
