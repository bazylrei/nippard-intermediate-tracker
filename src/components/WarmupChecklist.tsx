"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";

interface Props {
  steps: string[];
  onComplete: () => void;
  onSkip: () => void;
  prevWorkingWeightKg?: number;
  unit: "kg" | "lbs";
}

function suggestWeight(step: string, workingWeightKg: number, unit: "kg" | "lbs"): string | null {
  const match = step.match(/~(\d+)%/);
  if (!match) return null;
  const pct = parseInt(match[1]) / 100;
  const weightKg = workingWeightKg * pct;
  if (unit === "lbs") {
    const lbs = Math.round(weightKg * 2.20462 / 2.5) * 2.5;
    return `~${lbs} lbs`;
  }
  const kg = Math.round(weightKg / 2.5) * 2.5;
  return `~${kg} kg`;
}

export default function WarmupChecklist({ steps, onComplete, onSkip, prevWorkingWeightKg, unit }: Props) {
  const [checked, setChecked] = useState<boolean[]>(steps.map(() => false));

  if (!steps.length) {
    onComplete();
    return null;
  }

  function toggle(i: number) {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
    if (next.every(Boolean)) {
      setTimeout(onComplete, 400);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm tracking-widest text-muted uppercase">Warm-Up</h3>
        <button
          onClick={onSkip}
          className="text-xs text-subtle hover:text-muted transition-colors cursor-pointer"
        >
          Skip →
        </button>
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => {
          const suggestion = prevWorkingWeightKg != null
            ? suggestWeight(step, prevWorkingWeightKg, unit)
            : null;
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors cursor-pointer ${
                checked[i] ? "bg-elevated/50" : "bg-surface hover:bg-elevated"
              }`}
            >
              {checked[i] ? (
                <CheckCircle2 size={18} className="text-accent mt-0.5 shrink-0" />
              ) : (
                <Circle size={18} className="text-subtle mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${checked[i] ? "line-through text-subtle" : "text-fg"}`}>
                  {step}
                </span>
                {suggestion && !checked[i] && (
                  <span className="block text-xs text-primary/80 mt-0.5 font-display font-semibold">{suggestion}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-subtle text-center">Tap each step when done to continue</p>
    </div>
  );
}
