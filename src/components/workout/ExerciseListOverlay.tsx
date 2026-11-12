"use client";

import type { Exercise } from "@/lib/types";
import { X, CheckCircle2 } from "lucide-react";

interface Props {
  exercises: Exercise[];
  currentIndex: number;
  isDone: (index: number) => boolean;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export default function ExerciseListOverlay({ exercises, currentIndex, isDone, onSelect, onClose }: Props) {
  const resolvedExercises = exercises;
  return (
        <div className="absolute inset-0 z-20 flex flex-col" style={{ background: "var(--bg)" }}>
          <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid color-mix(in srgb, var(--fg) 8%, transparent)" }}>
            <button onClick={() => onClose()} className="text-subtle hover:text-fg transition-colors cursor-pointer">
              <X size={20} />
            </button>
            <h2 className="font-display font-bold text-fg">Exercises</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {resolvedExercises.map((ex, i) => {
              const exDone = isDone(i);
              const isCurrent = i === currentIndex;
              return (
                <button
                  key={i}
                  onClick={() => onSelect(i)}
                  className={`w-full glass gloss flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                    isCurrent ? "border-primary/30" : ""
                  }`}
                  style={isCurrent ? { borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)" } : {}}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-display text-xs font-bold shrink-0 ${
                    exDone ? "bg-accent/20 text-accent" : isCurrent ? "bg-primary/20 text-primary" : "text-muted"
                  }`} style={!exDone && !isCurrent ? { background: "color-mix(in srgb, var(--fg) 8%, transparent)" } : {}}>
                    {exDone ? <CheckCircle2 size={14} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-display font-semibold truncate ${isCurrent ? "text-fg" : exDone ? "text-muted" : "text-fg"}`}>
                      {ex.name}
                    </p>
                    <p className="text-xs text-muted">{ex.earlySetCount + ex.lastSetCount} sets · {ex.repRange[0]}–{ex.repRange[1]} reps</p>
                  </div>
                  {exDone && <span className="text-xs text-accent shrink-0">Done</span>}
                  {isCurrent && !exDone && <span className="text-xs text-primary shrink-0">Now</span>}
                </button>
              );
            })}
          </div>
        </div>
  );
}
