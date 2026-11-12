"use client";

import { useState } from "react";
import { X, ChevronDown, Check } from "lucide-react";
import type { BuilderExercise } from "@/lib/types";
import { FAILURE_TECHNIQUES, type ExerciseInfo } from "./constants";

export default function ExerciseEditModal({
  exercise,
  allExercises,
  onSave,
  onClose,
}: {
  exercise: BuilderExercise;
  allExercises: ExerciseInfo[];
  onSave: (fields: Partial<BuilderExercise>) => Promise<void>;
  onClose: () => void;
}) {
  const [exerciseId, setExerciseId] = useState(exercise.exerciseId);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [repMin, setRepMin] = useState(String(exercise.repRangeMin));
  const [repMax, setRepMax] = useState(String(exercise.repRangeMax));
  const [earlySets, setEarlySets] = useState(String(exercise.earlySetCount));
  const [lastSets, setLastSets] = useState(String(exercise.lastSetCount));
  const [lastSetTarget, setLastSetTarget] = useState(exercise.lastSetTarget);
  const [saving, setSaving] = useState(false);

  const selectedName = allExercises.find((e) => e.id === exerciseId)?.name ?? exercise.name;

  const filtered = search.trim()
    ? allExercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : allExercises;

  const grouped = filtered.reduce<Record<string, ExerciseInfo[]>>((acc, ex) => {
    if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
    acc[ex.muscleGroup].push(ex);
    return acc;
  }, {});

  async function handleSave() {
    setSaving(true);
    await onSave({
      exerciseId,
      repRangeMin: parseInt(repMin) || exercise.repRangeMin,
      repRangeMax: parseInt(repMax) || exercise.repRangeMax,
      earlySetCount: parseInt(earlySets),
      lastSetCount: Math.max(1, parseInt(lastSets) || 1),
      lastSetTarget,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-zinc-100 text-sm">Edit Exercise Slot</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
        </div>

        {/* Exercise picker toggle */}
        <div className="shrink-0 space-y-1.5">
          <span className="text-xs text-zinc-500">Exercise</span>
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="w-full flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 hover:border-orange-500 transition-colors"
          >
            <span className="truncate">{selectedName}</span>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform shrink-0 ml-2 ${showPicker ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showPicker ? (
          <div className="flex flex-col min-h-0 flex-1">
            <input
              autoFocus
              placeholder="Search exercises…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoCorrect="off"
              autoCapitalize="off"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 mb-2 shrink-0"
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
                      onClick={() => { setExerciseId(ex.id); setShowPicker(false); setSearch(""); }}
                      className={`w-full text-left px-2 py-2 rounded-lg text-sm transition-colors ${
                        ex.id === exerciseId ? "bg-orange-500/10 text-orange-400" : "text-zinc-200 hover:bg-zinc-800"
                      }`}
                    >
                      {ex.name}
                    </button>
                  ))}
                </div>
              ))}
              {filtered.length === 0 && <p className="text-xs text-zinc-600 text-center py-4">No matches.</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Rep min",      value: repMin,    set: setRepMin },
                { label: "Rep max",      value: repMax,    set: setRepMax },
                { label: "Working sets", value: earlySets, set: setEarlySets },
                { label: "Last sets",    value: lastSets,  set: setLastSets },
              ].map(({ label, value, set }) => (
                <label key={label} className="space-y-1">
                  <span className="text-xs text-zinc-500">{label}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
                  />
                </label>
              ))}
            </div>

            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Last set technique</span>
              <select
                value={lastSetTarget}
                onChange={(e) => setLastSetTarget(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
              >
                {FAILURE_TECHNIQUES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </label>

            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? "Saving…" : <><Check size={15} /> Save</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
