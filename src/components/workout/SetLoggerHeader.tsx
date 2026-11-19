import { Info } from "lucide-react";

interface Props {
  /** Zero-based; shown as "Set N+1". */
  setIndex: number;
  isLastSet: boolean;
  /** The failure technique's label, shown under the last set's heading. */
  techniqueLabel?: string;
  onShowTechnique: () => void;
  targetRpe?: [number, number];
}

/** "Set 3", the failure technique for the last set (with an info button), and the RPE to aim for. */
export default function SetLoggerHeader({ setIndex, isLastSet, techniqueLabel, onShowTechnique, targetRpe }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className={`font-display font-bold text-base uppercase tracking-wide ${isLastSet ? "text-primary" : "text-muted"}`}>
          Set {setIndex + 1}
        </span>
        {isLastSet && techniqueLabel && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-primary/80">{techniqueLabel}</span>
            <button
              onClick={onShowTechnique}
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
  );
}
