"use client";

import { CheckCircle2 } from "lucide-react";

/** "✓ Bench Press done · Up next", shown above the next exercise's name right after moving on. */
export default function FinishedExerciseNotice({ name }: { name: string }) {
  return (
    <p role="status" className="fade-in flex items-center gap-1.5 text-xs font-display font-semibold uppercase tracking-widest">
      <CheckCircle2 size={14} className="text-accent shrink-0" />
      <span className="text-accent truncate">{name} done</span>
      <span className="text-subtle shrink-0">{" "}· Up next</span>
    </p>
  );
}
