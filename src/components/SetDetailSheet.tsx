"use client";

import { useState } from "react";
import { X, Pencil, Check } from "lucide-react";
import type { SetLog, Exercise } from "@/lib/types";
import { kgToDisplay, displayToKg } from "@/lib/units";

interface Props {
  set: SetLog;
  exercise: Exercise;
  unit: "kg" | "lbs";
  onClose: () => void;
  onSave: (setId: string, weightKg: number, reps: number, rpe: number | null) => Promise<void>;
}

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

export default function SetDetailSheet({ set, exercise, unit, onClose, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState(String(kgToDisplay(set.weight, unit)));
  const [reps, setReps] = useState(String(set.reps));
  const [rpe, setRpe] = useState(set.rpe ? String(set.rpe) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { weightPerSide } = exercise;

  /** Leaves edit mode only once saved; on failure keeps the edits on screen. */
  async function handleSave() {
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (isNaN(w) || isNaN(r) || w < 0 || r <= 0) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(set.id, displayToKg(w, unit), r, rpe ? parseFloat(rpe) : null);
      setEditing(false);
    } catch (err) {
      console.error(err);
      setError("Couldn't save your changes. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "color-mix(in srgb, var(--bg) 60%, transparent)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg glass-strong gloss rounded-t-3xl p-6 space-y-5"
        style={{ boxShadow: "0 -4px 40px color-mix(in srgb, var(--bg) 50%, transparent), 0 0 0 1px color-mix(in srgb, var(--fg) 8%, transparent)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display font-bold text-sm text-muted uppercase tracking-widest">
              {exercise.name}
            </p>
            <h3 className="font-display font-bold text-xl text-fg">Set {set.setIndex + 1}</h3>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs font-display font-semibold text-primary cursor-pointer px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
              >
                <Pencil size={12} />
                Edit
              </button>
            )}
            <button onClick={onClose} className="text-subtle hover:text-fg transition-colors cursor-pointer p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1.5">
                  {weightPerSide ? `Each hand (${unit})` : `Weight (${unit})`}
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  step="any"
                  min="0"
                  inputMode="decimal"
                  className="w-full rounded-xl px-3 py-3 text-fg text-center font-display text-3xl font-bold focus:outline-none transition-colors"
                  style={{ background: "color-mix(in srgb, var(--fg) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)" }}
                />
                {weightPerSide && weight && !isNaN(parseFloat(weight)) && parseFloat(weight) > 0 && (
                  <p className="text-center text-xs text-muted mt-1 font-display">= {parseFloat(weight) * 2} {unit} total</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Reps</label>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  min="1"
                  inputMode="numeric"
                  className="w-full rounded-xl px-3 py-3 text-fg text-center font-display text-3xl font-bold focus:outline-none transition-colors"
                  style={{ background: "color-mix(in srgb, var(--fg) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)" }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1.5">RPE (optional)</label>
              <div className="flex gap-1">
                {RPE_VALUES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRpe(rpe === String(r) ? "" : String(r))}
                    className={`flex-1 py-2 rounded-lg text-xs font-display font-semibold transition-colors cursor-pointer ${
                      rpe === String(r) ? "bg-primary text-primary-fg" : "text-muted hover:text-fg"
                    }`}
                    style={rpe !== String(r) ? { background: "color-mix(in srgb, var(--fg) 7%, transparent)" } : {}}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {error && <p role="alert" className="text-sm text-danger">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => { setEditing(false); setWeight(String(kgToDisplay(set.weight, unit))); setReps(String(set.reps)); setRpe(set.rpe ? String(set.rpe) : ""); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-muted cursor-pointer"
                style={{ background: "color-mix(in srgb, var(--fg) 7%, transparent)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 gloss flex items-center justify-center gap-2 font-display font-bold py-3 rounded-xl"
              >
                <Check size={16} />
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-4 text-center" style={{ background: "color-mix(in srgb, var(--fg) 5%, transparent)" }}>
                <p className="text-xs text-muted mb-1">Weight</p>
                <p className="font-display font-bold text-2xl text-fg">
                  {weightPerSide && <span className="text-sm text-muted mr-0.5">2×</span>}
                  {kgToDisplay(set.weight, unit)}
                </p>
                <p className="text-xs text-muted">{unit}</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: "color-mix(in srgb, var(--fg) 5%, transparent)" }}>
                <p className="text-xs text-muted mb-1">Reps</p>
                <p className="font-display font-bold text-2xl text-fg">{set.reps}</p>
                <p className="text-xs text-muted">reps</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: "color-mix(in srgb, var(--fg) 5%, transparent)" }}>
                <p className="text-xs text-muted mb-1">RPE</p>
                <p className="font-display font-bold text-2xl text-fg">{set.rpe ?? "—"}</p>
                <p className="text-xs text-muted">/ 10</p>
              </div>
            </div>
            {set.failureHit != null && (
              <p className="text-xs text-muted text-center">
                Failure: <span className={set.failureHit ? "text-accent" : "text-fg"}>{set.failureHit ? "Yes" : "No"}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
