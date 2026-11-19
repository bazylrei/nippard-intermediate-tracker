"use client";

import type { WeightUnit } from "@/lib/units";

const UNITS: { value: WeightUnit; label: string }[] = [
  { value: "kg", label: "KG" },
  { value: "lbs", label: "LBS" },
];

interface Props {
  unit: WeightUnit;
  /** Called with the newly chosen unit; not called when the current one is tapped again. */
  onChange: (unit: WeightUnit) => void;
}

/** Weight unit as a KG / LBS choice, laid out like the Theme control. */
export default function UnitSetting({ unit, onChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span id="unit-label" className="text-sm text-fg">Weight unit</span>
      <div role="radiogroup" aria-labelledby="unit-label" className="flex rounded-lg p-0.5"
        style={{ background: "color-mix(in srgb, var(--fg) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)" }}>
        {UNITS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={unit === value}
            onClick={() => { if (value !== unit) onChange(value); }}
            className={`px-3 py-1 rounded-md text-sm font-display font-semibold transition-colors cursor-pointer ${
              unit === value ? "bg-primary text-primary-fg" : "text-muted hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
