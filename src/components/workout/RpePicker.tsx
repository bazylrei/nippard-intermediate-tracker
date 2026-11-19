const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

interface Props {
  /** The chosen RPE as typed text, or "" for none. */
  value: string;
  onChange: (value: string) => void;
}

/** Optional RPE buttons; tapping the chosen one again clears it. */
export default function RpePicker({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1.5">RPE (optional)</label>
      <div className="flex gap-1">
        {RPE_VALUES.map((r) => {
          const chosen = value === String(r);
          return (
            <button
              key={r}
              type="button"
              onClick={() => onChange(chosen ? "" : String(r))}
              className={`flex-1 py-2 rounded-lg text-xs font-display font-semibold transition-colors cursor-pointer ${
                chosen ? "bg-primary text-primary-fg" : "chip-idle text-muted hover:text-fg"
              }`}
            >
              {r}
            </button>
          );
        })}
      </div>
    </div>
  );
}
