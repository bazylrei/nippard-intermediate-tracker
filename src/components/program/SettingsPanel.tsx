import type { UserPreferences } from "@/lib/types";
import { displayToKg, kgToDisplay } from "@/lib/units";

interface Props {
  prefs: UserPreferences;
  /** Latest weigh-in, in kg; null before the first. */
  bodyWeightKg: number | null;
  onToggleUnit: () => void;
  onSaveHeight: (heightCm: number | null) => void;
  /** Logs a weigh-in for today. */
  onLogBodyWeight: (weightKg: number) => void;
  onChangeWeekStart: (day: number) => void;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const inputClass = "w-full rounded-xl px-3 py-2 text-fg text-center font-display text-lg font-semibold focus:outline-none";
const inputStyle = {
  background: "color-mix(in srgb, var(--fg) 6%, transparent)",
  border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)",
};

const parseOrNull = (value: string) => {
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
};

export default function SettingsPanel({ prefs, bodyWeightKg, onToggleUnit, onSaveHeight, onLogBodyWeight, onChangeWeekStart }: Props) {
  const heightCm = prefs.heightCm ?? null;
  const shownWeight = bodyWeightKg === null ? null : kgToDisplay(bodyWeightKg, prefs.unit);

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
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="week-start" className="text-sm text-fg">Week starts on</label>
        <select
          id="week-start"
          value={prefs.weekStartsOn}
          onChange={(e) => onChangeWeekStart(Number(e.target.value))}
          className="rounded-lg px-3 py-1.5 text-sm font-display font-semibold text-fg focus:outline-none cursor-pointer"
          style={inputStyle}
        >
          {WEEKDAYS.map((name, day) => <option key={day} value={day}>{name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label htmlFor="body-weight" className="block text-xs text-muted mb-1.5">Body weight ({prefs.unit})</label>
          {/* Keyed on the saved value so a reverted (failed) save resets what's shown. */}
          <input
            key={`bw-${shownWeight}`}
            id="body-weight"
            type="number"
            step="0.1"
            min="0"
            inputMode="decimal"
            defaultValue={shownWeight ?? ""}
            onBlur={(e) => {
              const v = parseOrNull(e.target.value);
              if (v !== null && v > 0 && v !== shownWeight) onLogBodyWeight(displayToKg(v, prefs.unit));
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
              if (v !== heightCm) onSaveHeight(v);
            }}
            className={inputClass}
            style={inputStyle}
            placeholder="—"
          />
        </div>
      </div>
      <p className="text-xs text-subtle">Changing your body weight logs a weigh-in for today.</p>
    </div>
  );
}
