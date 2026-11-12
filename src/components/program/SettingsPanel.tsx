import type { UserPreferences } from "@/lib/types";

interface Props {
  prefs: UserPreferences;
  onToggleUnit: () => void;
  onSaveBodyStats: (stats: { bodyWeightKg: number | null; heightCm: number | null }) => void;
}

const inputClass = "w-full rounded-xl px-3 py-2 text-fg text-center font-display text-lg font-semibold focus:outline-none";
const inputStyle = {
  background: "color-mix(in srgb, var(--fg) 6%, transparent)",
  border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)",
};

const parseOrNull = (value: string) => {
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
};

export default function SettingsPanel({ prefs, onToggleUnit, onSaveBodyStats }: Props) {
  const bodyWeightKg = prefs.bodyWeightKg ?? null;
  const heightCm = prefs.heightCm ?? null;

  return (
    <div className="glass gloss rounded-2xl p-4 space-y-3">
      <h3 className="font-display font-semibold text-xs uppercase tracking-widest text-muted">Settings</h3>
      <div className="flex items-center justify-between">
        <span className="text-sm text-fg">Weight unit</span>
        <button
          onClick={onToggleUnit}
          aria-label="Weight unit"
          className="glass gloss font-display font-bold text-sm px-4 py-1.5 rounded-lg transition-colors cursor-pointer text-fg"
        >
          {prefs.unit.toUpperCase()}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label htmlFor="body-weight" className="block text-xs text-muted mb-1.5">Body weight (kg)</label>
          {/* Keyed on the saved value so a reverted (failed) save resets what's shown. */}
          <input
            key={`bw-${bodyWeightKg}`}
            id="body-weight"
            type="number"
            step="0.1"
            min="0"
            inputMode="decimal"
            defaultValue={bodyWeightKg ?? ""}
            onBlur={(e) => {
              const v = parseOrNull(e.target.value);
              if (v !== bodyWeightKg) onSaveBodyStats({ bodyWeightKg: v, heightCm });
            }}
            className={inputClass}
            style={inputStyle}
            placeholder="—"
          />
        </div>
        <div>
          <label htmlFor="height" className="block text-xs text-muted mb-1.5">Height (cm)</label>
          <input
            key={`h-${heightCm}`}
            id="height"
            type="number"
            step="1"
            min="0"
            inputMode="numeric"
            defaultValue={heightCm ?? ""}
            onBlur={(e) => {
              const v = parseOrNull(e.target.value);
              if (v !== heightCm) onSaveBodyStats({ bodyWeightKg, heightCm: v });
            }}
            className={inputClass}
            style={inputStyle}
            placeholder="—"
          />
        </div>
      </div>
    </div>
  );
}
