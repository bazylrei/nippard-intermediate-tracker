"use client";

import { useReducer, useState, useEffect, useRef } from "react";
import { CheckCircle, Info } from "lucide-react";
import type { Exercise, SetLog } from "@/lib/types";
import { useProgramContext } from "@/context/ProgramContext";
import FailureTechniqueModal from "./FailureTechniqueModal";
import { kgToDisplay, displayToKg } from "@/lib/units";

interface Props {
  exercise: Exercise;
  setIndex: number;
  isLastSet: boolean;
  previousSets: SetLog[];
  unit: "kg" | "lbs";
  onLog: (weight: number, reps: number, rpe: number | null, failureHit: boolean | null) => void;
}

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

type FormState = { weight: string; reps: string; rpe: string };
type FormAction =
  | { type: "populate"; weight: string; reps: string; rpe: string }
  | { type: "set"; field: keyof FormState; value: string };

function formReducer(state: FormState, action: FormAction): FormState {
  if (action.type === "populate") return { weight: action.weight, reps: action.reps, rpe: action.rpe };
  return { ...state, [action.field]: action.value };
}

export default function SetLogger({ exercise, setIndex, isLastSet, previousSets, unit, onLog }: Props) {
  const [form, dispatch] = useReducer(formReducer, { weight: "", reps: "", rpe: "" });
  const [failureHit, setFailureHit] = useState<boolean | null>(null);
  const [showTechniqueInfo, setShowTechniqueInfo] = useState(false);
  const populated = useRef(false);

  useEffect(() => {
    if (populated.current || previousSets.length === 0) return;
    populated.current = true;
    const prevSet = previousSets[setIndex] ?? previousSets[previousSets.length - 1];
    if (prevSet) {
      dispatch({
        type: "populate",
        weight: String(kgToDisplay(prevSet.weight, unit)),
        reps: String(prevSet.reps),
        rpe: prevSet.rpe ? String(prevSet.rpe) : "",
      });
    }
  }, [previousSets, setIndex, unit]);

  const prevSet = previousSets[setIndex] ?? previousSets[previousSets.length - 1];
  const { weightPerSide, isBodyweight } = exercise;
  const { failureTechniques } = useProgramContext();
  const targetRpe = isLastSet ? exercise.lastSetRpe : exercise.earlySetRpe;
  const techniqueInfo = isLastSet ? failureTechniques[exercise.lastSetTarget] : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(form.weight);
    const r = parseInt(form.reps, 10);
    if (isNaN(w) || isNaN(r) || w < 0 || r <= 0) return;
    onLog(displayToKg(w, unit), r, form.rpe ? parseFloat(form.rpe) : null, isLastSet ? failureHit : null);
  }

  return (
    <div className="glass gloss rounded-2xl p-4 space-y-4">
      {/* Set header */}
      <div className="flex items-center justify-between">
        <div>
          <span className={`font-display font-bold text-base uppercase tracking-wide ${isLastSet ? "text-primary" : "text-muted"}`}>
            Set {setIndex + 1}
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
            {weightPerSide && "2× "}{kgToDisplay(prevSet.weight, unit)}{unit} × {prevSet.reps}
            {prevSet.rpe && <span className="text-muted font-normal"> @ RPE {prevSet.rpe}</span>}
          </span>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1.5">
              {weightPerSide ? `Each hand (${unit})` : isBodyweight ? `Added (${unit})` : `Weight (${unit})`}
            </label>
            {weightPerSide ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 rounded-xl overflow-hidden"
                  style={{ background: "color-mix(in srgb, var(--fg) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)" }}>
                  <span className="font-display font-bold text-lg text-muted pl-3 shrink-0 select-none">2×</span>
                  <input
                    type="number"
                    value={form.weight}
                    onChange={(e) => dispatch({ type: "set", field: "weight", value: e.target.value })}
                    step="any"
                    min="0"
                    inputMode="decimal"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    className="flex-1 py-3 pr-3 text-fg text-center font-display text-3xl font-bold focus:outline-none bg-transparent"
                    placeholder="—"
                    required
                  />
                </div>
                {form.weight && !isNaN(parseFloat(form.weight)) && parseFloat(form.weight) > 0 && (
                  <p className="text-center text-xs text-muted font-display">
                    = {(parseFloat(form.weight) * 2)} {unit} total
                  </p>
                )}
              </div>
            ) : (
              <input
                type="number"
                value={form.weight}
                onChange={(e) => dispatch({ type: "set", field: "weight", value: e.target.value })}
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
            )}
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">
              Reps ({exercise.repRange[0]}–{exercise.repRange[1]})
            </label>
            <input
              type="number"
              value={form.reps}
              onChange={(e) => dispatch({ type: "set", field: "reps", value: e.target.value })}
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
                onClick={() => dispatch({ type: "set", field: "rpe", value: form.rpe === String(r) ? "" : String(r) })}
                className={`flex-1 py-2 rounded-lg text-xs font-display font-semibold transition-colors cursor-pointer ${
                  form.rpe === String(r)
                    ? "bg-primary text-primary-fg"
                    : "text-muted hover:text-fg"
                }`}
                style={form.rpe !== String(r) ? { background: "color-mix(in srgb, var(--fg) 7%, transparent)" } : {}}
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
          className="btn-primary gloss w-full flex items-center justify-center gap-2 font-display font-bold text-lg py-4 rounded-2xl"
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
