"use client";

import { useState } from "react";
import WeighInCard from "./WeighInCard";
import { displayToKg, type WeightUnit } from "@/lib/units";

interface Props {
  unit: WeightUnit;
  /** Why a body weight is needed here. */
  message: string;
  /** Logs today's weigh-in, in kg; rejects if it couldn't be saved (the form shows the error). */
  onSave: (weightKg: number) => Promise<void>;
}

/**
 * "No body weight yet" with a call to action that opens a weigh-in in place,
 * so the user never leaves the screen they're on. The parent stops rendering
 * it once a body weight exists.
 */
export default function BodyWeightCta({ unit, message, onSave }: Props) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <WeighInCard
        unit={unit}
        title="Log your body weight"
        dismissLabel="Not now"
        onSave={(weight) => onSave(displayToKg(weight, unit))}
        onDismiss={() => setOpen(false)}
      />
    );
  }
  return (
    <div role="note" className="rounded-xl px-4 py-3 flex items-center gap-3"
      style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}>
      <p className="flex-1 text-xs text-muted leading-snug">{message}</p>
      <button type="button" onClick={() => setOpen(true)}
        className="btn-primary shrink-0 text-xs font-display font-semibold px-3 py-1.5 rounded-lg">
        Log body weight
      </button>
    </div>
  );
}
