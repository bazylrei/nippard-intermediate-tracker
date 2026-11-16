"use client";

import { useState } from "react";
import { EQUIPMENT, MUSCLE_GROUPS, validateDraft, type DraftErrors, type ExerciseDraft } from "@/lib/exercise-form";
import { WARMUP_PROTOCOLS } from "@/components/builder/constants";
import SaveErrorAlert from "@/components/SaveErrorAlert";
import { useSaveError } from "@/hooks/useSaveError";
import type { ExerciseInput, MuscleGroup, WarmupProtocol } from "@/lib/types";

interface Props {
  initial: ExerciseDraft;
  submitLabel: string;
  /** Rejects on failure: the form stays as typed and shows the error. */
  onSave: (input: ExerciseInput) => Promise<void>;
}

const fieldClass = "w-full rounded-xl px-3 py-2 text-sm text-fg bg-elevated border border-border focus:outline-none focus:border-primary";

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-muted mb-1.5">{label}</label>
      {children}
      {error && <p id={`${id}-error`} className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}

export default function ExerciseForm({ initial, submitLabel, onSave }: Props) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);
  const saveError = useSaveError();
  const set = <K extends keyof ExerciseDraft>(key: K, value: ExerciseDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const errorProps = (key: keyof ExerciseDraft) =>
    errors[key] ? { "aria-invalid": true, "aria-describedby": `${key}-error` } : {};

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validateDraft(draft);
    if (!result.ok) { setErrors(result.errors); return; }
    setErrors({});
    setSaving(true);
    await saveError.attempt(() => onSave(result.value), "Couldn't save the exercise. Try again.");
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="glass gloss rounded-2xl p-4 space-y-4">
      {saveError.message && <SaveErrorAlert message={saveError.message} onDismiss={saveError.clear} />}

      <Field id="name" label="Name" error={errors.name}>
        <input id="name" value={draft.name} onChange={(e) => set("name", e.target.value)} className={fieldClass} {...errorProps("name")} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field id="muscleGroup" label="Muscle group">
          <select id="muscleGroup" value={draft.muscleGroup} onChange={(e) => set("muscleGroup", e.target.value as MuscleGroup)} className={fieldClass}>
            {MUSCLE_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </Field>
        <Field id="equipment" label="Equipment">
          <select id="equipment" value={draft.equipment} onChange={(e) => set("equipment", e.target.value)} className={fieldClass}>
            {EQUIPMENT.map((eq) => <option key={eq.value} value={eq.value}>{eq.label}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field id="restMin" label="Rest min (sec)" error={errors.restMin}>
          <input id="restMin" inputMode="numeric" value={draft.restMin} onChange={(e) => set("restMin", e.target.value)} className={fieldClass} {...errorProps("restMin")} />
        </Field>
        <Field id="restMax" label="Rest max (sec)" error={errors.restMax}>
          <input id="restMax" inputMode="numeric" value={draft.restMax} onChange={(e) => set("restMax", e.target.value)} className={fieldClass} {...errorProps("restMax")} />
        </Field>
        <Field id="warmupProtocol" label="Warm-up">
          <select id="warmupProtocol" value={draft.warmupProtocol} onChange={(e) => set("warmupProtocol", e.target.value as WarmupProtocol)} className={fieldClass}>
            {WARMUP_PROTOCOLS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
        </Field>
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-2.5 text-sm text-fg cursor-pointer">
          <input type="checkbox" checked={draft.weightPerSide} onChange={(e) => set("weightPerSide", e.target.checked)} className="mt-0.5 accent-[var(--primary)]" />
          <span>Weight is per hand / per side <span className="block text-xs text-subtle">Volume counts it twice (dumbbells, single-arm cables).</span></span>
        </label>
        <label className="flex items-start gap-2.5 text-sm text-fg cursor-pointer">
          <input type="checkbox" checked={draft.isBodyweight} onChange={(e) => set("isBodyweight", e.target.checked)} className="mt-0.5 accent-[var(--primary)]" />
          <span>Bodyweight exercise <span className="block text-xs text-subtle">Logged weight is added to your body weight (pull-ups, dips).</span></span>
        </label>
      </div>

      <Field id="formNote" label="Form notes (optional)">
        <textarea id="formNote" rows={3} value={draft.formNote} onChange={(e) => set("formNote", e.target.value)} className={fieldClass} />
      </Field>

      <Field id="youtubeUrl" label="Video link (optional)" error={errors.youtubeUrl}>
        <input id="youtubeUrl" type="url" placeholder="https://youtube.com/…" value={draft.youtubeUrl} onChange={(e) => set("youtubeUrl", e.target.value)} className={fieldClass} {...errorProps("youtubeUrl")} />
      </Field>

      <button type="submit" disabled={saving} className="btn-primary w-full rounded-xl py-3 font-display font-semibold">
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
