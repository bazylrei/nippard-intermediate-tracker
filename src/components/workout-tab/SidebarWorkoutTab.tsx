"use client";

import { Dumbbell, Play } from "lucide-react";
import type { WorkoutTabProps } from "./props";
import WorkoutClock from "./WorkoutClock";

/** Desktop sidebar row for the workout in progress (live clock on the right), or to start the next one. */
export default function SidebarWorkoutTab({ idle, startedAt, active, onSelect }: WorkoutTabProps) {
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
