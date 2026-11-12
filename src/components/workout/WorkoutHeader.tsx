"use client";

import { DAY_LABELS } from "@/lib/program-data";
import { List, X, ArrowLeft } from "lucide-react";

interface Props {
  week: number;
  dayType: string;
  exerciseIndex: number;
  exerciseCount: number;
  isDone: (index: number) => boolean;
  confirmDiscard: boolean;
  onOpenList: () => void;
  onAskDiscard: () => void;
  onCancelDiscard: () => void;
  onDiscard: () => void;
  onHome: () => void;
}

export default function WorkoutHeader({
  week, dayType, exerciseIndex, exerciseCount, isDone, confirmDiscard,
  onOpenList, onAskDiscard, onCancelDiscard, onDiscard, onHome,
}: Props) {
  const exercises = Array.from({ length: exerciseCount });
  return (
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid color-mix(in srgb, var(--fg) 8%, transparent)" }}>
        <button onClick={() => onOpenList()} className="text-subtle hover:text-fg transition-colors cursor-pointer">
          <List size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-display text-xs font-semibold tracking-widest text-muted uppercase">
            Week {week} · {DAY_LABELS[dayType]}
          </p>
          <p className="text-xs text-muted">
            Exercise {exerciseIndex + 1} of {exerciseCount}
          </p>
        </div>
        {/* Progress dots */}
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
        {/* Back / discard */}
        {confirmDiscard ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onDiscard}
              className="text-xs font-display font-semibold text-danger cursor-pointer"
            >
              Discard
            </button>
            <button onClick={() => onCancelDiscard()} className="text-muted hover:text-fg cursor-pointer">
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onHome()}
              className="text-subtle hover:text-fg transition-colors cursor-pointer"
              title="Go home"
            >
              <ArrowLeft size={20} />
            </button>
            <button
              onClick={() => onAskDiscard()}
              className="text-xs text-subtle hover:text-danger transition-colors cursor-pointer font-display"
              title="Discard workout"
            >
              Discard
            </button>
          </div>
        )}
      </div>
  );
}
