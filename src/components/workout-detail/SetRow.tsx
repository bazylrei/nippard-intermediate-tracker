"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import type { SetLog } from "@/lib/types";
import { kgToDisplay, displayToKg, type WeightUnit } from "@/lib/units";

interface Props {
  set: SetLog;
  /** 1-based position shown in the badge. */
  number: number;
  editing: boolean;
  unit: WeightUnit;
  /** Weight in kg. */
  onSave: (weightKg: number, reps: number) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}

type Mode = "view" | "edit" | "confirm-delete";

const inputClass = "bg-surface border border-border rounded-lg px-2 py-1 text-fg text-sm text-center focus:outline-none focus:border-primary";

export default function SetRow({ set, number, editing, unit, onSave, onDelete }: Props) {
  const [mode, setMode] = useState<Mode>("view");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [busy, setBusy] = useState(false);
  const label = `${kgToDisplay(set.weight, unit)}${unit} × ${set.reps} reps`;

  async function run(action: () => Promise<boolean>) {
    setBusy(true);
    const ok = await action();
    setBusy(false);
    if (ok) setMode("view");
  }

  function save() {
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (isNaN(w) || isNaN(r) || w < 0 || r <= 0) return;
    void run(() => onSave(displayToKg(w, unit), r));
  }

  if (editing && mode === "edit") return (
    <div className="flex items-center gap-2 bg-elevated border border-border rounded-xl px-3 py-2">
      <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} step="any" min="0" aria-label={`Weight (${unit})`} className={`w-20 ${inputClass}`} />
      <span className="text-muted text-xs">{unit} ×</span>
      <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} min="1" aria-label="Reps" className={`w-16 ${inputClass}`} />
      <span className="text-muted text-xs flex-1">reps</span>
      <button onClick={save} disabled={busy} aria-label="Save set" className="text-accent hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer"><Check size={16} /></button>
      <button onClick={() => setMode("view")} aria-label="Cancel" className="text-muted hover:text-fg transition-colors cursor-pointer"><X size={16} /></button>
    </div>
  );

  if (editing && mode === "confirm-delete") return (
    <div className="flex items-center justify-between px-1 py-1">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => void run(onDelete)} disabled={busy} className="text-xs font-display font-semibold text-danger hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer">
          {busy ? "…" : "Delete"}
        </button>
        <button onClick={() => setMode("view")} aria-label="Cancel" className="text-muted hover:text-fg cursor-pointer"><X size={14} /></button>
      </div>
    </div>
  );

  return (
    <div className="flex items-center justify-between px-1 py-1">
      <div className="flex items-center gap-2">
        <span className="text-xs px-1.5 py-0.5 rounded-md font-display font-semibold bg-elevated text-muted">{number}</span>
        <span className="text-sm text-fg font-medium">{label}</span>
        {set.rpe != null && <span className="text-xs text-subtle">@ RPE {set.rpe}</span>}
      </div>
      {editing && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => { setWeight(String(kgToDisplay(set.weight, unit))); setReps(String(set.reps)); setMode("edit"); }}
            aria-label={`Edit set ${number}`}
            className="text-subtle hover:text-primary transition-colors p-1 cursor-pointer"
          >
            <Pencil size={13} />
          </button>
          <button onClick={() => setMode("confirm-delete")} aria-label={`Delete set ${number}`} className="text-subtle hover:text-danger transition-colors p-1 cursor-pointer">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
