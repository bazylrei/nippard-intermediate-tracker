"use client";

import { useState } from "react";
import UnitSetting from "@/components/widgets/UnitSetting";
import ThemeSetting from "@/components/widgets/ThemeSetting";
import { WEEKDAYS } from "@/lib/dates";
import type { WeightUnit } from "@/lib/units";

interface Props {
  unit: WeightUnit;
  weekStartsOn: number;
  onChangeUnit: (unit: WeightUnit) => void;
  onChangeWeekStart: (day: number) => void;
  /** Saves the choices and moves on; reports its own failure. */
  onNext: () => Promise<void>;
}

export default function UnitsStep({ unit, weekStartsOn, onChangeUnit, onChangeWeekStart, onNext }: Props) {
  const [saving, setSaving] = useState(false);

  async function next() {
    setSaving(true);
    try {
      await onNext();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center gap-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-fg leading-tight">Set it up your way</h1>
        <p className="text-sm text-muted">You can change these any time in Settings.</p>
      </div>

      <div className="glass gloss rounded-2xl p-4 space-y-4">
        <UnitSetting unit={unit} onChange={onChangeUnit} />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="onboarding-week-start" className="text-sm text-fg">Week starts on</label>
            <select
              id="onboarding-week-start"
              value={weekStartsOn}
              onChange={(e) => onChangeWeekStart(Number(e.target.value))}
              className="rounded-lg px-3 py-1.5 text-sm font-display font-semibold text-fg focus:outline-none cursor-pointer"
              style={{ background: "color-mix(in srgb, var(--fg) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)" }}
            >
              {WEEKDAYS.map((name, day) => <option key={day} value={day}>{name}</option>)}
            </select>
          </div>
          <p className="text-xs text-subtle">Sets when your weekly weigh-in comes up.</p>
        </div>
        <ThemeSetting />
      </div>

      <button onClick={next} disabled={saving} className="btn-primary gloss w-full font-display font-bold text-lg py-4 rounded-2xl cursor-pointer disabled:opacity-60">
        {saving ? "Saving…" : "Next"}
      </button>
    </div>
  );
}
