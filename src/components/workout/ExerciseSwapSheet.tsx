"use client";

import { useState } from "react";
import { X, Check, Repeat2 } from "lucide-react";
import type { Exercise } from "@/lib/types";

export interface ExerciseSwapSheetProps {
  /** What can be done in this slot: its own exercise first, then its alternates. */
  options: Exercise[];
  /** The exercise being done in this workout. */
  currentId: string;
  /** The saved default (the slot's own exercise when none is saved). */
  defaultId: string;
  /** Applies the choice to this workout, and with `makeDefault` to future ones. Rejects if saving fails. */
  onChoose: (chosenId: string, makeDefault: boolean) => Promise<void>;
  onClose: () => void;
}

/** Choose which exercise to do. It applies to this workout only, unless "make this my default" is ticked. */
export default function ExerciseSwapSheet({ options, currentId, defaultId, onChoose, onClose }: ExerciseSwapSheetProps) {
  const [selectedId, setSelectedId] = useState(currentId);
  const [makeDefault, setMakeDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = options.find((option) => option.id === selectedId) ?? options[0];
  const offerDefault = selected.id !== defaultId;
  const unchanged = selected.id === currentId && !makeDefault;

  function select(id: string) {
    setSelectedId(id);
    setMakeDefault(false);
  }

  /** Closes only once saved; on failure stays open so the choice can be retried. */
  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      await onChoose(selected.id, offerDefault && makeDefault);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Couldn't switch exercise. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="overlay-backdrop fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "color-mix(in srgb, var(--bg) 60%, transparent)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="overlay-sheet w-full max-w-lg glass-strong gloss rounded-t-3xl p-6 space-y-5"
        style={{ boxShadow: "0 -4px 40px color-mix(in srgb, var(--bg) 50%, transparent), 0 0 0 1px color-mix(in srgb, var(--fg) 8%, transparent)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted uppercase tracking-widest font-display font-semibold">Swap exercise</p>
            <h3 className="font-display font-bold text-xl text-fg leading-tight">Which one are you doing?</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-subtle hover:text-fg transition-colors cursor-pointer p-1 shrink-0 mt-0.5">
            <X size={20} />
          </button>
        </div>

        <div role="radiogroup" aria-label="Exercise" className="space-y-2">
          {options.map((option) => {
            const active = option.id === selected.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => select(option.id)}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors cursor-pointer"
                style={{
                  background: active ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "color-mix(in srgb, var(--fg) 6%, transparent)",
                  border: `1px solid ${active ? "color-mix(in srgb, var(--primary) 40%, transparent)" : "color-mix(in srgb, var(--fg) 10%, transparent)"}`,
                }}
              >
                <span className={`font-display font-semibold flex-1 ${active ? "text-fg" : "text-muted"}`}>{option.name}</span>
                {option.id === defaultId && (
                  <span className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted">Your default</span>
                )}
                {active && <Check size={16} className="text-primary shrink-0" />}
              </button>
            );
          })}
        </div>

        {offerDefault && (
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={makeDefault}
              onChange={(e) => setMakeDefault(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--primary)]"
            />
            <span className="text-sm text-fg leading-snug">Make this my default for future workouts</span>
          </label>
        )}
        <p className="text-xs text-muted -mt-2">
          {offerDefault && makeDefault ? "Future workouts will start with this exercise." : "Applies to this workout only."}
        </p>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-muted cursor-pointer"
            style={{ background: "color-mix(in srgb, var(--fg) 7%, transparent)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || unchanged}
            className="btn-primary flex-1 gloss flex items-center justify-center gap-2 font-display font-bold py-3 rounded-xl"
          >
            <Repeat2 size={16} />
            {saving ? "Switching…" : `Use ${selected.name}`}
          </button>
        </div>
      </div>
    </div>
  );
}
