"use client";

import { dayLabel } from "@/lib/day-types";
import { List } from "lucide-react";
import WorkoutTimer from "./WorkoutTimer";

interface Props {
  week: number;
  dayType: string;
  startedAt: string;
  exerciseIndex: number;
  exerciseCount: number;
  isDone: (index: number) => boolean;
  onOpenList: () => void;
}

export default function WorkoutHeader({
  week, dayType, startedAt, exerciseIndex, exerciseCount, isDone, onOpenList,
}: Props) {
  const exercises = Array.from({ length: exerciseCount });
  return (
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid color-mix(in srgb, var(--fg) 8%, transparent)" }}>
        <button onClick={() => onOpenList()} aria-label="Exercise list" className="text-subtle hover:text-fg transition-colors cursor-pointer">
          <List size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-display text-xs font-semibold tracking-widest text-muted uppercase">
            Week {week} · {dayLabel(dayType)}
          </p>
        </div>
        <WorkoutTimer startedAt={startedAt} />
        {/* Progress dots, with the position label directly beneath them */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-1 items-center">
            {exercises.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isDone(i)
                    ? "bg-primary w-4"
                    : i === exerciseIndex
                    ? "w-4"
                    : "w-1.5"
                }`}
                style={i === exerciseIndex && !isDone(i)
                  ? { background: "color-mix(in srgb, var(--primary) 50%, transparent)" }
                  : !isDone(i)
                  ? { background: "color-mix(in srgb, var(--fg) 15%, transparent)" }
                  : {}
                }
              />
            ))}
          </div>
          <p className="text-xs text-muted">
            Exercise {exerciseIndex + 1} of {exerciseCount}
          </p>
        </div>
      </div>
  );
}
