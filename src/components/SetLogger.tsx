"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle, Info } from "lucide-react";
import type { Exercise, SetLog } from "@/lib/types";
import { useProgramContext } from "@/context/ProgramContext";
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

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

export default function SetLogger({ exercise, setIndex, isLastSet, previousSets, unit, onLog }: Props) {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState("");
  const [failureHit, setFailureHit] = useState<boolean | null>(null);
  const [showTechniqueInfo, setShowTechniqueInfo] = useState(false);
  const populated = useRef(false);

  useEffect(() => {
    if (populated.current || previousSets.length === 0) return;
    populated.current = true;
    const prevSet = previousSets[setIndex] ?? previousSets[previousSets.length - 1];
    if (prevSet) {
      setWeight(String(toDisplay(prevSet.weight, unit)));
      setReps(String(prevSet.reps));
      setRpe(prevSet.rpe ? String(prevSet.rpe) : "");
    }
  }, [previousSets, setIndex, unit]);

  const prevSet = previousSets[setIndex] ?? previousSets[previousSets.length - 1];
  const { failureTechniques } = useProgramContext();
  const targetRpe = isLastSet ? exercise.lastSetRpe : exercise.earlySetRpe;
  const techniqueInfo = isLastSet ? failureTechniques[exercise.lastSetTarget] : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (isNaN(w) || isNaN(r) || w < 0 || r <= 0) return;
    onLog(toKg(w, unit), r, rpe ? parseFloat(rpe) : null, isLastSet ? failureHit : null);
  }

  return (
    <div className="glass gloss rounded-2xl p-4 space-y-4">
      {/* Set header */}
      <div className="flex items-center justify-between">
        <div>
          <span className={`font-display font-bold text-base uppercase tracking-wide ${isLastSet ? "text-primary" : "text-muted"}`}>
            {isLastSet ? "Last Set" : `Set ${setIndex + 1}`}
          </span>
          {isLastSet && techniqueInfo && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-primary/80">{techniqueInfo.label}</span>
              <button
                onClick={() => setShowTechniqueInfo(true)}
                className="text-subtle hover:text-primary transition-colors cursor-pointer"
              >
                <Info size={14} />
              </button>
            </div>
          )}
        </div>
        {targetRpe && (
          <span className="text-xs text-muted px-2.5 py-1 rounded-full font-display"
            style={{ background: "color-mix(in srgb, var(--fg) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)" }}>
            RPE {targetRpe[0]}–{targetRpe[1]}
          </span>
        )}
      </div>

      {/* Previous data */}
      {prevSet && (
        <div className="rounded-xl px-4 py-2.5 flex items-center justify-between"
          style={{ background: "color-mix(in srgb, var(--fg) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--fg) 7%, transparent)" }}>
          <span className="text-xs text-muted">Last time</span>
          <span className="font-display font-semibold text-sm text-fg">
            {toDisplay(prevSet.weight, unit)}{unit} × {prevSet.reps}
            {prevSet.rpe && <span className="text-muted font-normal"> @ RPE {prevSet.rpe}</span>}
          </span>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1.5">Weight ({unit})</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              step="any"
              min="0"
              inputMode="decimal"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              className="w-full rounded-xl px-3 py-3 text-fg text-center font-display text-3xl font-bold focus:outline-none transition-colors"
              style={{
                background: "color-mix(in srgb, var(--fg) 6%, transparent)",
                border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)",
              }}
              placeholder="—"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">
              Reps ({exercise.repRange[0]}–{exercise.repRange[1]})
            </label>
            <input
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              min="1"
              max="50"
              inputMode="numeric"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              className="w-full rounded-xl px-3 py-3 text-fg text-center font-display text-3xl font-bold focus:outline-none transition-colors"
              style={{
                background: "color-mix(in srgb, var(--fg) 6%, transparent)",
                border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)",
              }}
              placeholder="—"
              required
            />
          </div>
        </div>

        {/* RPE selector */}
        <div>
          <label className="block text-xs text-muted mb-1.5">RPE (optional)</label>
          <div className="flex gap-1">
            {RPE_VALUES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRpe(rpe === String(r) ? "" : String(r))}
                className={`flex-1 py-2 rounded-lg text-xs font-display font-semibold transition-colors cursor-pointer ${
                  rpe === String(r)
                    ? "bg-primary text-primary-fg"
                    : "text-muted hover:text-fg"
                }`}
                style={rpe !== String(r) ? { background: "color-mix(in srgb, var(--fg) 7%, transparent)" } : {}}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Failure toggle */}
        {isLastSet && (
          <div>
            <label className="block text-xs text-muted mb-1.5">Reached failure?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFailureHit(true)}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  failureHit === true
                    ? "bg-accent text-accent-fg"
                    : "text-muted hover:text-fg"
                }`}
                style={failureHit !== true ? { background: "color-mix(in srgb, var(--fg) 7%, transparent)" } : {}}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setFailureHit(false)}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  failureHit === false
                    ? "text-fg"
                    : "text-muted hover:text-fg"
                }`}
                style={{
                  background: failureHit === false
                    ? "color-mix(in srgb, var(--fg) 12%, transparent)"
                    : "color-mix(in srgb, var(--fg) 7%, transparent)",
                  border: failureHit === false ? "1px solid color-mix(in srgb, var(--fg) 20%, transparent)" : "none",
                }}
              >
                No
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="gloss w-full flex items-center justify-center gap-2 text-primary-fg font-display font-bold text-lg py-4 rounded-2xl transition-opacity cursor-pointer hover:opacity-90"
          style={{
            background: "linear-gradient(170deg, color-mix(in srgb, var(--primary) 80%, white) 0%, var(--primary) 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 20px color-mix(in srgb, var(--primary) 35%, transparent)",
          }}
        >
          <CheckCircle size={20} />
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
