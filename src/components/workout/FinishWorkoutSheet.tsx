"use client";

import { useState } from "react";

interface Props {
  /** Working sets logged so far; with none there's nothing to save, so Finish isn't offered. */
  setCount: number;
  /** Saves the workout as it is. Reports its own failure. */
  onFinish: () => Promise<void>;
  /** Deletes the workout. Reports its own failure. */
  onDiscard: () => Promise<void>;
  onClose: () => void;
}

const sets = (n: number) => `${n} ${n === 1 ? "set" : "sets"}`;

/** The way out of a workout in progress: save what's logged, throw it away, or carry on. */
export default function FinishWorkoutSheet({ setCount, onFinish, onDiscard, onClose }: Props) {
  const [busy, setBusy] = useState<"finish" | "discard" | null>(null);

  /** Both actions report failures themselves, so the sheet closes either way and lets that message show. */
  async function run(kind: "finish" | "discard", action: () => Promise<void>) {
    setBusy(kind);
    await action();
    setBusy(null);
    onClose();
  }

  return (
    <div
      className="overlay-backdrop fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "color-mix(in srgb, var(--bg) 60%, transparent)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div
        role="dialog"
        aria-label="Finish workout"
        className="overlay-sheet w-full max-w-lg glass-strong gloss rounded-t-3xl p-6 space-y-5"
        style={{ boxShadow: "0 -4px 40px color-mix(in srgb, var(--bg) 50%, transparent), 0 0 0 1px color-mix(in srgb, var(--fg) 8%, transparent)" }}
      >
        <div className="space-y-1">
          <h3 className="font-display font-bold text-xl text-fg leading-tight">Finish workout?</h3>
          <p className="text-sm text-muted">
            {setCount > 0
              ? `You've logged ${sets(setCount)}. Finish to save them, or discard the workout.`
              : "Nothing is logged yet. Keep going, or discard this workout."}
          </p>
        </div>

        <div className="space-y-2">
          {setCount > 0 && (
            <button
              onClick={() => run("finish", onFinish)}
              disabled={busy !== null}
              className="btn-primary gloss w-full font-display font-bold text-base py-3.5 rounded-2xl"
            >
              {busy === "finish" ? "Finishing…" : "Finish"}
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={busy !== null}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-muted cursor-pointer"
              style={{ background: "color-mix(in srgb, var(--fg) 7%, transparent)" }}
            >
              Keep going
            </button>
            <button
              onClick={() => run("discard", onDiscard)}
              disabled={busy !== null}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-danger cursor-pointer"
              style={{ background: "color-mix(in srgb, var(--fg) 7%, transparent)" }}
            >
              {busy === "discard" ? "Discarding…" : "Discard"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
