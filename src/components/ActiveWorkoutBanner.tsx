"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cacheGet } from "@/lib/cache";
import { Dumbbell, ChevronRight } from "lucide-react";
import { DAY_LABELS } from "@/lib/program-data";

export interface ActiveWorkoutInfo {
  week: number;
  dayIndex: number;
  dayType: string;
  exerciseName: string;
  exerciseIndex: number;
  exerciseTotal: number;
}

export default function ActiveWorkoutBanner() {
  const [workout, setWorkout] = useState<ActiveWorkoutInfo | null>(null);
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWorkout(cacheGet<ActiveWorkoutInfo>("active_workout"));

    function sync() {
      setWorkout(cacheGet<ActiveWorkoutInfo>("active_workout"));
    }
    window.addEventListener("active_workout_changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("active_workout_changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!workout) return null;

  const dayLabel = DAY_LABELS[workout.dayType] ?? workout.dayType;

  return (
    <div className="md:hidden fixed left-0 right-0 z-30 px-3" style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}>
      <button
        onClick={() => router.push(`/workout?week=${workout.week}&day=${workout.dayIndex}`)}
        className="w-full gloss rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
        style={{
          background: "color-mix(in srgb, var(--surface) 92%, transparent)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)",
          boxShadow: "0 -2px 20px color-mix(in srgb, var(--bg) 40%, transparent), 0 4px 20px color-mix(in srgb, var(--bg) 30%, transparent)",
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
        >
          <Dumbbell size={17} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[11px] text-muted leading-none mb-0.5">
            Week {workout.week} · {dayLabel}
          </p>
          <p className="font-display font-semibold text-sm text-fg truncate leading-tight">
            {workout.exerciseName}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted font-display">
            {workout.exerciseIndex + 1}/{workout.exerciseTotal}
          </span>
          <ChevronRight size={16} className="text-muted" />
        </div>
      </button>
    </div>
  );
}
