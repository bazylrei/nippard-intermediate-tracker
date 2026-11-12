"use client";

import { useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import type { SetLog } from "@/lib/types";
import type { ExerciseOption } from "@/hooks/useExerciseCatalog";
import ExercisePicker from "./ExercisePicker";
import SetRow from "./SetRow";

interface Props {
  exerciseId: string;
  name: string;
  sets: SetLog[];
  editing: boolean;
  options: ExerciseOption[];
  onSwap: (toExerciseId: string) => Promise<boolean>;
  onRemove: () => Promise<boolean>;
  onSaveSet: (setId: string, weight: number, reps: number, rpe: number | null) => Promise<boolean>;
  onDeleteSet: (setId: string) => Promise<boolean>;
}

type Mode = "view" | "swap" | "confirm-remove";

export default function ExerciseSetsBlock({
  exerciseId, name, sets, editing, options, onSwap, onRemove, onSaveSet, onDeleteSet,
}: Props) {
  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<boolean>) {
    setBusy(true);
    const ok = await action();
    setBusy(false);
    if (ok) setMode("view");
  }

  return (
    <section className="glass gloss rounded-2xl p-4" aria-label={name}>
      {editing && mode === "swap" ? (
        <div className="mb-2 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">Replace <span className="text-fg">{name}</span> with…</p>
            <button onClick={() => setMode("view")} aria-label="Cancel" className="text-muted hover:text-fg cursor-pointer"><X size={14} /></button>
          </div>
          <ExercisePicker options={options} selectedId={exerciseId} onPick={(e) => void run(() => onSwap(e.id))} />
        </div>
      ) : (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-display font-semibold text-muted uppercase tracking-wider">{name}</h3>
          {editing && (
            <div className="flex items-center gap-0.5 shrink-0 ml-2">
              {mode === "confirm-remove" ? (
                <>
                  <button onClick={() => void run(onRemove)} disabled={busy} className="text-xs font-display font-semibold text-danger hover:opacity-80 transition-opacity disabled:opacity-50 mr-1 cursor-pointer">
                    {busy ? "…" : "Remove"}
                  </button>
                  <button onClick={() => setMode("view")} aria-label="Cancel" className="text-muted hover:text-fg cursor-pointer"><X size={12} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => setMode("swap")} aria-label={`Change ${name}`} className="text-subtle hover:text-primary transition-colors p-0.5 cursor-pointer"><Pencil size={12} /></button>
                  <button onClick={() => setMode("confirm-remove")} aria-label={`Remove ${name}`} className="text-subtle hover:text-danger transition-colors p-0.5 cursor-pointer"><Trash2 size={12} /></button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        {sets.map((set, i) => (
          <SetRow
            key={set.id}
            set={set}
            number={i + 1}
            editing={editing}
            onSave={(weight, reps) => onSaveSet(set.id, weight, reps, set.rpe)}
            onDelete={() => onDeleteSet(set.id)}
          />
        ))}
      </div>
    </section>
  );
}
