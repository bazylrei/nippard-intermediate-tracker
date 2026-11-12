"use client";

import { useState } from "react";
import { addSetsToSession } from "@/lib/db";
import type { SetLog } from "@/lib/types";
import { X, Plus } from "lucide-react";

interface Props {
  sessionId: string;
  allExercises: { id: string; name: string; muscleGroup: string }[];
  userId: string;
  onSave: (sets: SetLog[]) => void;
  onCancel: () => void;
}

export default function AddExerciseForm({ sessionId, allExercises, userId, onSave, onCancel }: Props) {
  const [exId, setExId] = useState("");
  const [exSearch, setExSearch] = useState("");
  const [setsRows, setSetsRows] = useState<{ weight: string; reps: string }[]>([{ weight: "", reps: "" }]);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!exId) return;
    const validSets = setsRows
      .map((r) => ({ weight: parseFloat(r.weight), reps: parseInt(r.reps, 10) }))
      .filter((r) => !isNaN(r.weight) && !isNaN(r.reps) && r.weight > 0 && r.reps > 0);
    if (!validSets.length) return;
    setSaving(true);
    const newSets = await addSetsToSession(sessionId, exId, userId, validSets);
    onSave(newSets);
    setSaving(false);
  }

  const filteredExercises = allExercises
    .filter((e) => e.name.toLowerCase().includes(exSearch.toLowerCase()))
    .slice(0, 25);

  return (
    <div className="border-t border-border pt-3 mt-1 space-y-3">
      <div className="space-y-1">
        <input
          autoFocus
          type="text"
          value={exSearch}
          onChange={(e) => { setExSearch(e.target.value); setExId(""); }}
          placeholder="Search exercise…"
          className="w-full text-xs bg-elevated border border-border rounded-xl px-3 py-2 text-fg focus:outline-none focus:border-primary"
        />
        {!exId && (
          <div className="bg-elevated border border-border rounded-xl overflow-hidden max-h-36 overflow-y-auto">
            {filteredExercises.map((e) => (
              <button
                key={e.id}
                onClick={() => { setExId(e.id); setExSearch(e.name); }}
                className="w-full text-left px-3 py-1.5 text-xs text-fg hover:bg-border transition-colors cursor-pointer"
              >
                {e.name}
              </button>
            ))}
          </div>
        )}
        {exId && (
          <p className="text-xs text-primary px-1 font-display font-semibold">
            {exSearch}
            <button onClick={() => { setExId(""); setExSearch(""); }} className="text-muted hover:text-fg ml-1 cursor-pointer">
              <X size={10} className="inline" />
            </button>
          </p>
        )}
      </div>

      <div className="space-y-2">
        {setsRows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted w-6 font-display">S{i + 1}</span>
            <input
              type="number"
              value={row.weight}
              onChange={(e) => setSetsRows((prev) => prev.map((r, j) => j === i ? { ...r, weight: e.target.value } : r))}
              placeholder="kg"
              className="w-20 bg-elevated border border-border rounded-lg px-2 py-1 text-fg text-sm text-center focus:outline-none focus:border-primary"
            />
            <span className="text-muted text-xs">×</span>
            <input
              type="number"
              value={row.reps}
              onChange={(e) => setSetsRows((prev) => prev.map((r, j) => j === i ? { ...r, reps: e.target.value } : r))}
              placeholder="reps"
              className="w-16 bg-elevated border border-border rounded-lg px-2 py-1 text-fg text-sm text-center focus:outline-none focus:border-primary"
            />
            {setsRows.length > 1 && (
              <button onClick={() => setSetsRows((prev) => prev.filter((_, j) => j !== i))} className="text-muted hover:text-danger transition-colors cursor-pointer">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setSetsRows((prev) => [...prev, { weight: "", reps: "" }])}
          className="text-xs text-subtle hover:text-primary transition-colors flex items-center gap-1 pl-8 cursor-pointer"
        >
          <Plus size={11} /> Add set
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={!exId || saving}
          className="text-xs font-display font-semibold text-primary hover:opacity-80 transition-opacity disabled:opacity-40 cursor-pointer"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-muted hover:text-fg transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
