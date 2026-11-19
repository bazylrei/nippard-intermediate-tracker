"use client";

import { CheckCircle, Pencil } from "lucide-react";
import type { SetLog } from "@/lib/types";
import { kgToDisplay } from "@/lib/units";

interface Props {
  set: SetLog;
  setNumber: number;
  unit: "kg" | "lbs";
  weightPerSide: boolean;
  onEdit: () => void;
}

/** Carousel slide for a set already logged this session. */
export default function LoggedSetCard({ set, setNumber, unit, weightPerSide, onEdit }: Props) {
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-display font-bold text-base uppercase tracking-wide text-muted">Set {setNumber}</span>
        <span className="flex items-center gap-1 text-xs font-display font-semibold text-accent">
          <CheckCircle size={14} /> Logged
        </span>
      </div>
      <p className="font-display font-bold text-3xl text-fg text-center">
        {weightPerSide && "2× "}{kgToDisplay(set.weight, unit)}{unit} × {set.reps}
      </p>
      {set.rpe && <p className="text-center text-sm text-muted">@ RPE {set.rpe}</p>}
      <button
        type="button"
        onClick={onEdit}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-muted hover:text-fg transition-colors cursor-pointer"
        style={{ background: "color-mix(in srgb, var(--fg) 7%, transparent)" }}
      >
        <Pencil size={14} /> Edit set
      </button>
    </div>
  );
}
