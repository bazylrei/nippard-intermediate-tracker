interface Props {
  /** True/false once answered; null before. */
  value: boolean | null;
  onChange: (reachedFailure: boolean) => void;
}

/** "Reached failure?" Yes / No, asked on the last set. */
export default function FailureToggle({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1.5">Reached failure?</label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
            value === true ? "bg-accent text-accent-fg" : "chip-idle text-muted hover:text-fg"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
            value === false ? "text-fg" : "chip-idle text-muted hover:text-fg"
          }`}
          style={value === false ? {
            background: "color-mix(in srgb, var(--fg) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--fg) 20%, transparent)",
          } : undefined}
        >
          No
        </button>
      </div>
    </div>
  );
}
