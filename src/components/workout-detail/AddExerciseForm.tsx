"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import type { ExerciseOption } from "@/hooks/useExerciseCatalog";
import type { NewSet } from "@/hooks/useWorkoutDetail";
import { displayToKg, type WeightUnit } from "@/lib/units";
import ExercisePicker from "./ExercisePicker";

interface Props {
  options: ExerciseOption[];
  unit: WeightUnit;
  /** Weights in kg. Resolves true when saved; the form stays open on failure so nothing typed is lost. */
  onSave: (exerciseId: string, sets: NewSet[]) => Promise<boolean>;
  onCancel: () => void;
}

const inputClass = "bg-elevated border border-border rounded-lg px-2 py-1 text-fg text-sm text-center focus:outline-none focus:border-primary";

/** Valid rows only, with weights typed in `unit` converted to kg. */
export function parseNewSets(rows: { weight: string; reps: string }[], unit: WeightUnit): NewSet[] {
  return rows
    .map((r) => ({ weight: parseFloat(r.weight), reps: parseInt(r.reps, 10) }))
    .filter((r) => !isNaN(r.weight) && !isNaN(r.reps) && r.weight > 0 && r.reps > 0)
    .map((r) => ({ ...r, weight: displayToKg(r.weight, unit) }));
}

export default function AddExerciseForm({ options, unit, onSave, onCancel }: Props) {
  const [exercise, setExercise] = useState<ExerciseOption | null>(null);
  const [rows, setRows] = useState([{ weight: "", reps: "" }]);
  const [saving, setSaving] = useState(false);
  const validSets = parseNewSets(rows, unit);

  async function handleSave() {
    if (!exercise || validSets.length === 0) return;
    setSaving(true);
    const ok = await onSave(exercise.id, validSets);
    setSaving(false);
    if (ok) onCancel();
  }

  const updateRow = (i: number, field: "weight" | "reps", value: string) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: value } : r)));

  return (
    <div className="glass gloss rounded-2xl p-4 space-y-3">
      <p className="font-display font-semibold text-xs uppercase tracking-widest text-muted">Add exercise</p>

      {exercise ? (
        <p className="text-sm text-primary font-display font-semibold flex items-center gap-1">
          {exercise.name}
          <button onClick={() => setExercise(null)} aria-label="Change exercise" className="text-muted hover:text-fg cursor-pointer">
            <X size={12} />
          </button>
        </p>
      ) : (
        <ExercisePicker options={options} onPick={setExercise} />
      )}

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted w-6 font-display">S{i + 1}</span>
            <input type="number" value={row.weight} onChange={(e) => updateRow(i, "weight", e.target.value)} placeholder={unit} aria-label={`Set ${i + 1} weight`} className={`w-20 ${inputClass}`} />
            <span className="text-muted text-xs">×</span>
            <input type="number" value={row.reps} onChange={(e) => updateRow(i, "reps", e.target.value)} placeholder="reps" aria-label={`Set ${i + 1} reps`} className={`w-16 ${inputClass}`} />
            {rows.length > 1 && (
              <button onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))} aria-label={`Remove set ${i + 1}`} className="text-muted hover:text-danger transition-colors cursor-pointer">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setRows((prev) => [...prev, { weight: "", reps: "" }])}
          className="text-xs text-subtle hover:text-primary transition-colors flex items-center gap-1 pl-8 cursor-pointer"
        >
          <Plus size={11} /> Add set
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={!exercise || validSets.length === 0 || saving}
          className="text-xs font-display font-semibold text-primary hover:opacity-80 transition-opacity disabled:opacity-40 cursor-pointer"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="text-xs text-muted hover:text-fg transition-colors cursor-pointer">
          Cancel
        </button>
      </div>
    </div>
  );
}
