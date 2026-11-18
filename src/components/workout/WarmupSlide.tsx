"use client";

import { CheckCircle } from "lucide-react";
import WarmupChecklist from "@/components/WarmupChecklist";

interface Props {
  steps: string[];
  active: boolean;
  onComplete: () => void;
  prevWorkingWeightKg?: number;
  unit: "kg" | "lbs";
  weightPerSide?: boolean;
}

/** The set carousel's warm-up slide: the checklist while warming up, a read-only recap afterwards. */
export default function WarmupSlide({ steps, active, onComplete, prevWorkingWeightKg, unit, weightPerSide }: Props) {
  if (active) {
    return (
      <div className="glass rounded-2xl p-4">
        <WarmupChecklist
          steps={steps}
          onComplete={onComplete}
          onSkip={onComplete}
          prevWorkingWeightKg={prevWorkingWeightKg}
          unit={unit}
          weightPerSide={weightPerSide}
        />
      </div>
    );
  }
  return (
    <div className="glass rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-display font-bold text-base uppercase tracking-wide text-muted">Warm-up</span>
        <span className="flex items-center gap-1 text-xs font-display font-semibold text-accent">
          <CheckCircle size={14} /> Done
        </span>
      </div>
      <ul className="space-y-1">
        {steps.map((step, i) => <li key={i} className="text-sm text-subtle">{step}</li>)}
      </ul>
    </div>
  );
}
