"use client";

import { useState } from "react";
import { Compass, Play, Plus } from "lucide-react";
import type { ProgramRow } from "@/lib/types";
import ProgramOption from "./ProgramOption";

interface Props {
  programs: ProgramRow[];
  /** Follows the chosen program (null: none) and finishes onboarding. Reports its own failure. */
  onChoose: (programId: string | null) => Promise<void>;
  /** Finishes onboarding following no program, and opens "New program". Reports its own failure. */
  onBuild: () => Promise<void>;
}

/** The last step: follow a program now, or start without one. */
export default function ProgramStep({ programs, onChoose, onBuild }: Props) {
  // The first offered program is picked to start with: one tap to begin, as before.
  const [chosen, setChosen] = useState<string | null>(programs[0]?.id ?? null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center gap-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-fg leading-tight">Pick your program</h1>
        <p className="text-sm text-muted">Follow one now, or look around first. You can switch any time.</p>
      </div>

      <div role="radiogroup" aria-label="Program" className="space-y-2.5">
        {programs.map((p) => (
          <ProgramOption
            key={p.id}
            title={p.name}
            detail={`${p.totalWeeks} ${p.totalWeeks === 1 ? "week" : "weeks"}${p.description ? ` · ${p.description}` : ""}`}
            selected={chosen === p.id}
            onSelect={() => setChosen(p.id)}
          />
        ))}
        <ProgramOption
          icon={Compass}
          title="No program for now"
          detail="Explore the app first, then choose or build one."
          selected={chosen === null}
          onSelect={() => setChosen(null)}
        />
      </div>

      <div className="space-y-2">
        <button
          onClick={() => run(() => onChoose(chosen))}
          disabled={busy}
          className="btn-primary gloss w-full flex items-center justify-center gap-2 font-display font-bold text-lg py-4 rounded-2xl cursor-pointer disabled:opacity-60"
        >
          {chosen && <Play size={18} fill="currentColor" />}
          {chosen ? "Start first workout" : "Go to Home"}
        </button>
        <button
          onClick={() => run(onBuild)}
          disabled={busy}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-muted hover:text-fg py-2 cursor-pointer disabled:opacity-60"
        >
          <Plus size={14} />
          Build your own program
        </button>
      </div>
    </div>
  );
}
