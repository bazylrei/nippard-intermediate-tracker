"use client";

import { useState } from "react";
import { CheckCircle, Info } from "lucide-react";
import type { Exercise, SetLog } from "@/lib/types";
import { FAILURE_TECHNIQUE_LABELS } from "@/lib/program-data";
import FailureTechniqueModal from "./FailureTechniqueModal";

interface Props {
  exercise: Exercise;
  setIndex: number;
  isLastSet: boolean;
  previousSets: SetLog[];
  unit: "kg" | "lbs";
  onLog: (weight: number, reps: number, rpe: number | null, failureHit: boolean | null) => void;
}

const KG_TO_LBS = 2.20462;

function toDisplay(kg: number, unit: "kg" | "lbs"): number {
  return unit === "lbs" ? Math.round(kg * KG_TO_LBS * 4) / 4 : kg;
}

function toKg(val: number, unit: "kg" | "lbs"): number {
  return unit === "lbs" ? val / KG_TO_LBS : val;
}

export default function SetLogger({ exercise, setIndex, isLastSet, previousSets, unit, onLog }: Props) {
  const prevSet = previousSets[setIndex] ?? previousSets[previousSets.length - 1];
  const [weight, setWeight] = useState(prevSet ? String(toDisplay(prevSet.weight, unit)) : "");
  const [reps, setReps] = useState(prevSet ? String(prevSet.reps) : "");
  const [rpe, setRpe] = useState(prevSet?.rpe ? String(prevSet.rpe) : "");
  const [failureHit, setFailureHit] = useState<boolean | null>(null);
  const [showTechniqueInfo, setShowTechniqueInfo] = useState(false);

  const targetRpe = isLastSet ? exercise.lastSetRpe : exercise.earlySetRpe;
  const techniqueInfo = isLastSet ? FAILURE_TECHNIQUE_LABELS[exercise.lastSetTarget] : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (isNaN(w) || isNaN(r) || w < 0 || r <= 0) return;
    onLog(toKg(w, unit), r, rpe ? parseFloat(rpe) : null, isLastSet ? failureHit : null);
  }

  return (
    <div className="space-y-4">
      {/* Set header */}
      <div className="flex items-center justify-between">
        <div>
          <span className={`text-sm font-semibold uppercase tracking-wide ${isLastSet ? "text-orange-400" : "text-zinc-400"}`}>
            {isLastSet ? "Last Set" : `Set ${setIndex + 1}`}
          </span>
          {isLastSet && techniqueInfo && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-orange-400/80">{techniqueInfo.label}</span>
              <button onClick={() => setShowTechniqueInfo(true)} className="text-zinc-500 hover:text-orange-400 transition-colors">
                <Info size={14} />
              </button>
            </div>
          )}
        </div>
        {targetRpe && (
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">
            Target RPE {targetRpe[0]}–{targetRpe[1]}
          </span>
        )}
      </div>

      {/* Previous data */}
      {prevSet && (
        <div className="bg-zinc-800/50 rounded-lg px-3 py-2 text-xs text-zinc-400">
          <span className="text-zinc-500">Last time: </span>
          <span className="text-zinc-300 font-medium">
            {toDisplay(prevSet.weight, unit)}{unit} × {prevSet.reps} reps
            {prevSet.rpe && ` @ RPE ${prevSet.rpe}`}
          </span>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Weight ({unit})</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              step="any"
              min="0"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 text-center text-lg font-semibold focus:outline-none focus:border-orange-500"
              placeholder="—"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Reps ({exercise.repRange[0]}–{exercise.repRange[1]})
            </label>
            <input
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              min="1"
              max="50"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 text-center text-lg font-semibold focus:outline-none focus:border-orange-500"
              placeholder="—"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">RPE (optional)</label>
          <div className="flex gap-1.5">
            {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRpe(String(r))}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                  rpe === String(r)
                    ? "bg-orange-500 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {isLastSet && (
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Reached failure?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFailureHit(true)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  failureHit === true
                    ? "bg-green-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setFailureHit(false)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  failureHit === false
                    ? "bg-zinc-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                No
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3.5 rounded-xl transition-colors"
        >
          <CheckCircle size={18} />
          Log Set
        </button>
      </form>

      {showTechniqueInfo && (
        <FailureTechniqueModal
          technique={exercise.lastSetTarget}
          onClose={() => setShowTechniqueInfo(false)}
        />
      )}
    </div>
  );
}
