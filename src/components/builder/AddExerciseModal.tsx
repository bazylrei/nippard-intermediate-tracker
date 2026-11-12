"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ExerciseInfo } from "./constants";

export default function AddExerciseModal({
  allExercises,
  onAdd,
  onClose,
}: {
  allExercises: ExerciseInfo[];
  onAdd: (exerciseId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const filtered = search.trim()
    ? allExercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : allExercises;

  const grouped = filtered.reduce<Record<string, ExerciseInfo[]>>((acc, ex) => {
    if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
    acc[ex.muscleGroup].push(ex);
    return acc;
  }, {});

  async function handlePick(exerciseId: string) {
    setAdding(true);
    await onAdd(exerciseId);
    setAdding(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-sm p-5 space-y-3 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-fg text-sm">Add Exercise</h2>
          <button onClick={onClose} className="text-subtle hover:text-fg"><X size={18} /></button>
        </div>
        <input
          autoFocus
          placeholder="Search exercises…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoCorrect="off"
          autoCapitalize="off"
          className="w-full bg-elevated border border-border rounded-xl px-3 py-2 text-sm text-fg focus:outline-none focus:border-primary shrink-0"
        />
        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {Object.entries(grouped).map(([group, exs]) => (
            <div key={group}>
              <p className="sticky top-0 bg-surface text-xs text-subtle font-semibold uppercase tracking-wide px-1 py-1.5">
                {group}
              </p>
              {exs.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => handlePick(ex.id)}
                  disabled={adding}
                  className="w-full text-left px-2 py-2 rounded-lg text-sm text-fg hover:bg-elevated transition-colors disabled:opacity-50"
                >
                  {ex.name}
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-subtle text-center py-6">No exercises match.</p>
          )}
        </div>
      </div>
    </div>
  );
}
