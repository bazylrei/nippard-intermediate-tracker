"use client";

import { useRestTimer } from "@/context/RestTimerContext";
import { formatElapsed } from "@/lib/dates";
import ElapsedTime from "./ElapsedTime";

/** The rest countdown while resting, otherwise the workout's elapsed time (when known). */
export default function WorkoutClock({ startedAt }: { startedAt?: string }) {
  const rest = useRestTimer();
  if (rest.isActive) return <span role="timer" aria-label="Rest remaining">{formatElapsed(rest.remaining)}</span>;
  if (!startedAt) return null;
  return <span role="timer" aria-label="Workout duration"><ElapsedTime startedAt={startedAt} /></span>;
}
