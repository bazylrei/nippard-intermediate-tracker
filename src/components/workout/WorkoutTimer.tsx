"use client";

import { Timer } from "lucide-react";
import { useElapsedSeconds } from "@/hooks/useElapsedSeconds";
import { formatElapsed } from "@/lib/dates";

/** How long the workout has been going. */
export default function WorkoutTimer({ startedAt }: { startedAt: string }) {
  const elapsed = useElapsedSeconds(startedAt);
  return (
    <span
      role="timer"
      aria-label="Workout duration"
      className="flex items-center gap-1 font-display font-semibold text-sm tabular-nums text-fg shrink-0"
    >
      <Timer size={14} className="text-muted" />
      {formatElapsed(elapsed)}
    </span>
  );
}
