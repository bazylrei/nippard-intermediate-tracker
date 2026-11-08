"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { WARMUP_PROTOCOLS } from "@/lib/program-data";
import type { WarmupProtocol } from "@/lib/types";

interface Props {
  protocol: WarmupProtocol;
  onComplete: () => void;
}

export default function WarmupChecklist({ protocol, onComplete }: Props) {
  const steps = WARMUP_PROTOCOLS[protocol];
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
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Warm-Up</h3>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors ${
              checked[i] ? "bg-zinc-800/50" : "bg-zinc-900 hover:bg-zinc-800"
            }`}
          >
            {checked[i] ? (
              <CheckCircle2 size={18} className="text-green-500 mt-0.5 shrink-0" />
            ) : (
              <Circle size={18} className="text-zinc-600 mt-0.5 shrink-0" />
            )}
            <span className={`text-sm ${checked[i] ? "line-through text-zinc-500" : "text-zinc-300"}`}>
              {step}
            </span>
          </button>
        ))}
      </div>
      <p className="text-xs text-zinc-500 text-center">Tap each step when done to continue</p>
    </div>
  );
}
