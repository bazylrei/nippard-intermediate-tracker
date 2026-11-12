"use client";

import type { SetLog } from "@/lib/types";

interface Props {
  totalSets: number;
  loggedSets: SetLog[];
  currentSetIndex: number;
  isSetsPhase: boolean;
  onViewSet: (set: SetLog) => void;
}

export default function SetTiles({ totalSets, loggedSets, currentSetIndex, isSetsPhase, onViewSet }: Props) {
  const setsForExercise = loggedSets;
  const setIndex = currentSetIndex;
  return (
        <div className="space-y-2">
          <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">Sets</span>
          <div className="flex gap-2">
            {Array.from({ length: totalSets }).map((_, i) => {
              const logged = setsForExercise[i];
              const isCurrent = i === setIndex && isSetsPhase;
              return logged ? (
                <button
                  key={i}
                  onClick={() => onViewSet(logged)}
                  className="flex-1 h-12 rounded-xl flex flex-col items-center justify-center font-display font-bold text-sm transition-opacity glass cursor-pointer hover:opacity-80 active:scale-95"
                  style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--accent)" }}
                >
                  <span className="text-base leading-none">{logged.reps}</span>
                  <span className="text-[10px] font-normal opacity-70">reps</span>
                </button>
              ) : (
                <div
                  key={i}
                  className="flex-1 h-12 rounded-xl flex items-center justify-center font-display font-bold text-sm glass"
                  style={
                    isCurrent
                      ? { borderColor: "color-mix(in srgb, var(--fg) 20%, transparent)", color: "var(--fg)" }
                      : { color: "var(--subtle)" }
                  }
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
        </div>
  );
}
