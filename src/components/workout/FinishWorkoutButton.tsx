"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

interface Props {
  /** Working sets logged so far; with none there's nothing to save, so the button stays hidden. */
  setCount: number;
  onFinish: () => Promise<void>;
}

const sets = (n: number) => `${n} ${n === 1 ? "set" : "sets"}`;

/** Ends the workout early with what's logged, after a confirm, since not every workout is done in full. */
export default function FinishWorkoutButton({ setCount, onFinish }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [finishing, setFinishing] = useState(false);

  if (setCount === 0) return null;

  async function finish() {
    setFinishing(true);
    await onFinish(); // reports its own failure and leaves the workout open
    setFinishing(false);
    setConfirming(false);
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full flex items-center justify-center gap-1.5 text-sm text-subtle hover:text-muted py-2 transition-colors cursor-pointer"
      >
        <Flag size={13} />
        Finish workout
      </button>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3 text-center">
      <p className="text-sm text-fg">Finish now with {sets(setCount)} logged?</p>
      <div className="flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          disabled={finishing}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted cursor-pointer"
          style={{ background: "color-mix(in srgb, var(--fg) 7%, transparent)" }}
        >
          Keep going
        </button>
        <button
          onClick={finish}
          disabled={finishing}
          className="btn-primary flex-1 gloss font-display font-bold py-2.5 rounded-xl text-sm"
        >
          {finishing ? "Finishing…" : "Finish"}
        </button>
      </div>
    </div>
  );
}
