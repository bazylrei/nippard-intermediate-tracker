"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import type { Exercise } from "@/lib/types";

interface Props {
  exercise: Exercise;
  existingNote: string;
  onClose: () => void;
  onSave: (note: string) => Promise<void>;
}

export default function ExerciseNotesSheet({ exercise, existingNote, onClose, onSave }: Props) {
  const [note, setNote] = useState(existingNote);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Closes only once the note is saved; on failure stays open so nothing typed is lost. */
  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(note);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Couldn't save your note. Try again.");
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted uppercase tracking-widest font-display font-semibold">Notes</p>
            <h3 className="font-display font-bold text-xl text-fg leading-tight">{exercise.name}</h3>
          </div>
          <button onClick={onClose} className="text-subtle hover:text-fg transition-colors cursor-pointer p-1 shrink-0 mt-0.5">
            <X size={20} />
          </button>
        </div>

        {exercise.formNote && (
          <div
            className="rounded-xl px-4 py-3 space-y-1"
            style={{ background: "color-mix(in srgb, var(--fg) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--fg) 7%, transparent)" }}
          >
            <p className="text-xs font-display font-semibold text-muted uppercase tracking-widest">Coach&apos;s cue</p>
            <p className="text-sm text-fg leading-relaxed">{exercise.formNote}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-display font-semibold text-muted uppercase tracking-widest">My setup notes</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Squat rack hole 7, use 20kg plates, grip just outside rings…"
            rows={4}
            className="w-full rounded-xl px-4 py-3 text-sm text-fg focus:outline-none resize-none leading-relaxed"
            style={{
              background: "color-mix(in srgb, var(--fg) 6%, transparent)",
              border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)",
            }}
          />
        </div>

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
            onClick={handleSave}
            disabled={saving}
            className="flex-1 gloss flex items-center justify-center gap-2 text-primary-fg font-display font-bold py-3 rounded-xl transition-opacity cursor-pointer hover:opacity-90 disabled:opacity-50"
            style={{
              background: "linear-gradient(170deg, color-mix(in srgb, var(--primary) 80%, white) 0%, var(--primary) 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <Check size={16} />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
