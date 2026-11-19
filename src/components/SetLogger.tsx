"use client";

import { useReducer, useState, useEffect, useRef } from "react";
import { CheckCircle } from "lucide-react";
import type { Exercise, SetLog } from "@/lib/types";
import { useProgramContext } from "@/context/ProgramContext";
import FailureTechniqueModal from "./FailureTechniqueModal";
import OverlayPresence from "./OverlayPresence";
import PreviousPerformance from "./workout/PreviousPerformance";
import SetLoggerHeader from "./workout/SetLoggerHeader";
import WeightField from "./workout/WeightField";
import RpePicker from "./workout/RpePicker";
import FailureToggle from "./workout/FailureToggle";
import OverloadTip from "./workout/OverloadTip";
import { overloadTip } from "@/lib/progression";
import { kgToDisplay, displayToKg } from "@/lib/units";

interface Props {
  exercise: Exercise;
  setIndex: number;
  isLastSet: boolean;
  previousSets: SetLog[];
  /** All-time best for the exercise, shown beside "Last time" when given. */
  bestSet?: SetLog;
  unit: "kg" | "lbs";
  onLog: (weight: number, reps: number, rpe: number | null, failureHit: boolean | null) => void;
  /**
   * Correcting a set already logged: the form starts from it and saves changes
   * (weight in kg) instead of logging a new set. Rejects if the save fails; the
   * caller leaves edit mode once it resolves.
   */
  editing?: { set: SetLog; onSave: (weightKg: number, reps: number, rpe: number | null) => Promise<void> };
}

type FormState = { weight: string; reps: string; rpe: string };
type FormAction =
  | { type: "populate"; weight: string; reps: string; rpe: string }
  | { type: "set"; field: keyof FormState; value: string };

function formReducer(state: FormState, action: FormAction): FormState {
  if (action.type === "populate") return { weight: action.weight, reps: action.reps, rpe: action.rpe };
  return { ...state, [action.field]: action.value };
}

export default function SetLogger({ exercise, setIndex, isLastSet, previousSets, bestSet, unit, onLog, editing }: Props) {
  const [form, dispatch] = useReducer(formReducer, editing
    ? { weight: String(kgToDisplay(editing.set.weight, unit)), reps: String(editing.set.reps), rpe: editing.set.rpe ? String(editing.set.rpe) : "" }
    : { weight: "", reps: "", rpe: "" });
  const [failureHit, setFailureHit] = useState<boolean | null>(null);
  const [showTechniqueInfo, setShowTechniqueInfo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  // An edit starts from the logged set, so last time must not overwrite it.
  const populated = useRef(!!editing);

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
  const tip = editing ? null : overloadTip(prevSet, exercise.repRange, unit);
  const { weightPerSide, isBodyweight } = exercise;
  const { failureTechniques } = useProgramContext();
  const setField = (field: keyof FormState, value: string) => dispatch({ type: "set", field, value });
  const targetRpe = isLastSet ? exercise.lastSetRpe : exercise.earlySetRpe;
  const techniqueInfo = isLastSet ? failureTechniques[exercise.lastSetTarget] : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(form.weight);
    const r = parseInt(form.reps, 10);
    if (isNaN(w) || isNaN(r) || w < 0 || r <= 0) return;
    if (editing) {
      setSaving(true);
      setSaveFailed(false);
      try {
        await editing.onSave(displayToKg(w, unit), r, form.rpe ? parseFloat(form.rpe) : null);
      } catch (err) {
        console.error(err);
        setSaveFailed(true);
      } finally {
        setSaving(false);
      }
      return;
    }
    onLog(displayToKg(w, unit), r, form.rpe ? parseFloat(form.rpe) : null, isLastSet ? failureHit : null);
  }

  return (
    <div className="glass gloss rounded-2xl p-4 space-y-4">
      <SetLoggerHeader
        setIndex={setIndex}
        isLastSet={isLastSet}
        techniqueLabel={techniqueInfo?.label}
        onShowTechnique={() => setShowTechniqueInfo(true)}
        targetRpe={targetRpe}
      />

      <PreviousPerformance lastSet={prevSet} bestSet={bestSet} unit={unit} weightPerSide={weightPerSide} />
      {tip && (
        <OverloadTip
          tip={tip}
          topOfRange={exercise.repRange[1]}
          unit={unit}
          weightPerSide={weightPerSide}
          applied={parseFloat(form.weight) === tip.suggestedWeight}
          onUse={() => setField("weight", String(tip.suggestedWeight))}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <WeightField
            unit={unit}
            weightPerSide={weightPerSide}
            isBodyweight={isBodyweight}
            value={form.weight}
            onChange={(value) => setField("weight", value)}
          />
          <div>
            <label className="block text-xs text-muted mb-1.5">
              Reps ({exercise.repRange[0]}–{exercise.repRange[1]})
            </label>
            <input
              type="number"
              value={form.reps}
              onChange={(e) => setField("reps", e.target.value)}
              min="1"
              max="50"
              inputMode="numeric"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              className="input-well w-full rounded-xl px-3 py-3 text-fg text-center font-display text-3xl font-bold focus:outline-none transition-colors"
              placeholder="—"
              required
            />
          </div>
        </div>

        <RpePicker value={form.rpe} onChange={(value) => setField("rpe", value)} />

        {isLastSet && !editing && <FailureToggle value={failureHit} onChange={setFailureHit} />}

        <button
          type="submit"
          disabled={saving}
          className="btn-primary gloss w-full flex items-center justify-center gap-2 font-display font-bold text-lg py-4 rounded-2xl"
        >
          <CheckCircle size={20} />
          {editing ? (saving ? "Saving…" : "Save changes") : "Log Set"}
        </button>
        {saveFailed && <p role="alert" className="text-sm text-danger text-center">Couldn&apos;t save your changes. Try again.</p>}
      </form>

      <OverlayPresence>
        {showTechniqueInfo && (
          <FailureTechniqueModal
            technique={exercise.lastSetTarget}
            onClose={() => setShowTechniqueInfo(false)}
          />
        )}
      </OverlayPresence>
    </div>
  );
}
