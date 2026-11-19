interface Props {
  unit: "kg" | "lbs";
  /** Dumbbells: the number typed is for one hand, and the total is shown beneath. */
  weightPerSide: boolean;
  /** Bodyweight exercise: the number typed is the weight added. */
  isBodyweight: boolean;
  value: string;
  onChange: (value: string) => void;
}

const NUMBER_INPUT_PROPS = {
  type: "number", step: "any", min: "0", inputMode: "decimal", autoComplete: "off", autoCorrect: "off", autoCapitalize: "off", placeholder: "—", required: true,
} as const;

/** The weight box of the set form, in the user's unit. */
export default function WeightField({ unit, weightPerSide, isBodyweight, value, onChange }: Props) {
  const label = weightPerSide ? `Each hand (${unit})` : isBodyweight ? `Added (${unit})` : `Weight (${unit})`;
  const typed = parseFloat(value);

  return (
    <div>
      <label className="block text-xs text-muted mb-1.5">{label}</label>
      {weightPerSide ? (
        <div className="space-y-1.5">
          {/* "2×" overlays the left edge so the number centres across the whole box, like Reps.
              A flex row let the number input's intrinsic width overflow and push the value right. */}
          <div className="input-well relative rounded-xl">
            <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 font-display font-bold text-lg text-muted select-none pointer-events-none">2×</span>
            <input
              {...NUMBER_INPUT_PROPS}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              aria-label={label}
              className="block w-full min-w-0 py-3 px-10 text-fg text-center font-display text-3xl font-bold focus:outline-none bg-transparent"
            />
          </div>
          {value && !isNaN(typed) && typed > 0 && (
            <p className="text-center text-xs text-muted font-display">
              = {typed * 2} {unit} total
            </p>
          )}
        </div>
      ) : (
        <input
          {...NUMBER_INPUT_PROPS}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-well w-full rounded-xl px-3 py-3 text-fg text-center font-display text-3xl font-bold focus:outline-none transition-colors"
        />
      )}
    </div>
  );
}
