"use client";

import { Dumbbell, Play, Timer } from "lucide-react";
import { useRestTimer } from "@/context/RestTimerContext";
import { useElapsedSeconds } from "@/hooks/useElapsedSeconds";
import { formatElapsed } from "@/lib/dates";

interface Props {
  /** No workout in progress: the tab offers to start the next one, with no clock. */
  idle: boolean;
  /** When the workout began; without it (older saved data) only the rest countdown can show. */
  startedAt?: string;
  active: boolean;
  onSelect: () => void;
}

function ElapsedTime({ startedAt }: { startedAt: string }) {
  return <>{formatElapsed(useElapsedSeconds(startedAt))}</>;
}

/** The rest countdown while resting, otherwise the workout's elapsed time (when known). */
function WorkoutClock({ startedAt }: { startedAt?: string }) {
  const rest = useRestTimer();
  if (rest.isActive) return <span role="timer" aria-label="Rest remaining">{formatElapsed(rest.remaining)}</span>;
  if (!startedAt) return null;
  return <span role="timer" aria-label="Workout duration"><ElapsedTime startedAt={startedAt} /></span>;
}

/**
 * Mobile: the raised centre tab. Starts the next workout when idle; during one it shows the live
 * clock; while resting, the ring around it drains with the rest countdown.
 */
export function CenterWorkoutTab({ idle, startedAt, active, onSelect }: Props) {
  const rest = useRestTimer();
  const restLeft = !idle && rest.isActive && rest.total > 0 ? rest.remaining / rest.total : null;
  const hasClock = !idle && (rest.isActive || !!startedAt);
  const Icon = idle ? Play : rest.isActive ? Timer : Dumbbell;

  return (
    <button
      onClick={onSelect}
      aria-label={idle ? "Start workout" : "Workout"}
      aria-current={active ? "page" : undefined}
      // Taller than the bar: content overflows upwards, raising the circle above it.
      className="flex-1 flex flex-col items-center justify-end gap-1 pb-2.5 cursor-pointer"
    >
      <span
        className="rounded-full p-[3px] shadow-lg"
        style={{
          background: restLeft === null
            ? "var(--surface)"
            : `conic-gradient(var(--accent) ${restLeft * 360}deg, color-mix(in srgb, var(--fg) 15%, transparent) 0)`,
        }}
      >
        <span className="btn-primary gloss w-14 h-14 rounded-full flex flex-col items-center justify-center">
          <Icon size={hasClock ? 14 : 22} />
          {hasClock && (
            <span className="font-display font-bold text-xs leading-none mt-0.5 tabular-nums">
              <WorkoutClock startedAt={startedAt} />
            </span>
          )}
        </span>
      </span>
      <span className={`text-xs font-medium ${active ? "text-primary" : "text-subtle"}`}>{idle ? "Start" : "Workout"}</span>
    </button>
  );
}

/** Desktop sidebar row for the workout in progress (live clock on the right), or to start the next one. */
export function SidebarWorkoutTab({ idle, startedAt, active, onSelect }: Props) {
  return (
    <button
      onClick={onSelect}
      aria-label={idle ? "Start workout" : "Workout"}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full cursor-pointer ${
        active ? "bg-primary/10 text-primary" : "text-muted hover:text-fg hover:bg-elevated"
      }`}
    >
      {idle ? <Play size={18} /> : <Dumbbell size={18} />}
      {idle ? "Start workout" : "Workout"}
      {!idle && (
        <span className="ml-auto font-display font-semibold tabular-nums text-primary">
          <WorkoutClock startedAt={startedAt} />
        </span>
      )}
    </button>
  );
}
