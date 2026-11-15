"use client";

import { Trophy } from "lucide-react";
import type { SetLog } from "@/lib/types";
import { kgToDisplay } from "@/lib/units";

interface Props {
  lastSet?: SetLog;
  bestSet?: SetLog;
  unit: "kg" | "lbs";
  weightPerSide: boolean;
}

/** "Last time" for this set, plus the all-time best when one is given. */
export default function PreviousPerformance({ lastSet, bestSet, unit, weightPerSide }: Props) {
  if (!lastSet && !bestSet) return null;

  function figures(set: SetLog) {
    return (
      <span className="font-display font-semibold text-sm text-fg">
        {weightPerSide && "2× "}{kgToDisplay(set.weight, unit)}{unit} × {set.reps}
        {set.rpe && <span className="text-muted font-normal"> @ RPE {set.rpe}</span>}
      </span>
    );
  }

  return (
    <div
      className="rounded-xl px-4 py-2.5 space-y-1.5"
      style={{ background: "color-mix(in srgb, var(--fg) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--fg) 7%, transparent)" }}
    >
      {lastSet && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Last time</span>
          {figures(lastSet)}
        </div>
      )}
      {bestSet && (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-primary">
            <Trophy size={12} /> Best
          </span>
          {figures(bestSet)}
        </div>
      )}
    </div>
  );
}
