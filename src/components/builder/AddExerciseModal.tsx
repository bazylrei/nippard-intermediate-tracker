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
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-3 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-zinc-100 text-sm">Add Exercise</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
        </div>
        <input
          autoFocus
          placeholder="Search exercises…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoCorrect="off"
          autoCapitalize="off"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 shrink-0"
        />
        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {Object.entries(grouped).map(([group, exs]) => (
            <div key={group}>
              <p className="sticky top-0 bg-zinc-900 text-xs text-zinc-500 font-semibold uppercase tracking-wide px-1 py-1.5">
                {group}
              </p>
              {exs.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => handlePick(ex.id)}
                  disabled={adding}
                  className="w-full text-left px-2 py-2 rounded-lg text-sm text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  {ex.name}
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-6">No exercises match.</p>
          )}
        </div>
      </div>
    </div>
  );
}
