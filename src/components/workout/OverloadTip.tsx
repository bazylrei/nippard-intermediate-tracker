"use client";

import { TrendingUp, Check } from "lucide-react";
import type { OverloadTip as Tip } from "@/lib/progression";

interface Props {
  tip: Tip;
  topOfRange: number;
  unit: "kg" | "lbs";
  weightPerSide: boolean;
  /** True once the weight field already holds the suggestion. */
  applied: boolean;
  onUse: () => void;
}

/** "You maxed the rep range last time — add weight", with a one-tap fill of the suggested weight. */
export default function OverloadTip({ tip, topOfRange, unit, weightPerSide, applied, onUse }: Props) {
  const weight = `${tip.suggestedWeight}${unit}${weightPerSide ? " per hand" : ""}`;
  return (
    <div
      role="note"
      className="rounded-xl px-4 py-3 flex items-center gap-3"
      style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}
    >
      <TrendingUp size={18} className="text-accent shrink-0" />
      <p className="flex-1 text-xs text-fg leading-snug">
        You hit {tip.reps} reps last time — the top of your range{tip.reps > topOfRange ? " and beyond" : ""}. Time to add weight: try <span className="font-display font-semibold">{weight}</span>.
      </p>
      <button
        type="button"
        onClick={onUse}
        disabled={applied}
        className="shrink-0 flex items-center gap-1 text-xs font-display font-semibold px-3 py-1.5 rounded-lg bg-accent text-accent-fg cursor-pointer disabled:cursor-default disabled:opacity-70"
      >
        {applied ? <><Check size={12} /> Set</> : `Use ${tip.suggestedWeight}${unit}`}
      </button>
    </div>
  );
}
