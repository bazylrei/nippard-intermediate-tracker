"use client";

import { Dumbbell, Play, Timer } from "lucide-react";
import { useRestTimer } from "@/context/RestTimerContext";
import type { WorkoutTabProps } from "./props";
import WorkoutClock from "./WorkoutClock";

/**
 * Mobile: the raised centre tab. Starts the next workout when idle; during one it shows the live
 * clock; while resting, the ring around it drains with the rest countdown.
 */
export default function CenterWorkoutTab({ idle, startedAt, active, onSelect }: WorkoutTabProps) {
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
