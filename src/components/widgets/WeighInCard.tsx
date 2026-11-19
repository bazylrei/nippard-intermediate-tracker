"use client";

import { useState } from "react";
import { Weight } from "lucide-react";

interface Props {
  unit: "kg" | "lbs";
  /** Saves today's weight in `unit`; rejects if it couldn't be saved. */
  onSave: (weight: number) => Promise<void>;
  onDismiss: () => void;
  title?: string;
  dismissLabel?: string;
}

/** A weigh-in form (the weekly prompt, or opened from a call to action). Stays open with an inline error if the save fails. */
export default function WeighInCard({ unit, onSave, onDismiss, title = "Weekly weigh-in", dismissLabel = "Skip this week" }: Props) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const weight = parseFloat(value);
  const valid = !isNaN(weight) && weight > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(weight);
    } catch (err) {
      console.error(err);
      setError("Couldn't save your weight. Check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label={title} className="glass gloss rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
          <Weight size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-fg leading-tight">{title}</p>
          <p className="text-xs text-muted">What do you weigh today?</p>
        </div>
      </div>
      <div className="flex gap-2">
        <label className="flex-1 flex items-center rounded-xl px-3"
          style={{ background: "color-mix(in srgb, var(--fg) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)" }}>
          <input
            type="number"
            step="0.1"
            min="0"
            inputMode="decimal"
            aria-label={`Body weight (${unit})`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="—"
            className="w-full min-w-0 py-2.5 bg-transparent text-fg font-display text-xl font-bold focus:outline-none"
          />
          <span className="text-sm text-muted font-display">{unit}</span>
        </label>
        <button type="submit" disabled={!valid || saving} className="btn-primary gloss px-5 rounded-xl font-display font-bold">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      <button type="button" onClick={onDismiss} className="text-xs text-subtle hover:text-muted cursor-pointer">
        {dismissLabel}
      </button>
    </form>
  );
}
