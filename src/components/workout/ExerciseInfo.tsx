"use client";

import type { Exercise } from "@/lib/types";
import { Repeat2, ExternalLink, Info } from "lucide-react";

interface Props {
  exercise: Exercise;
  originalExercise: Exercise;
  alternateIndex: number;
  note: string | undefined;
  onSwap: () => void;
  onOpenNotes: () => void;
}

export default function ExerciseInfo({ exercise, originalExercise, alternateIndex, note, onSwap, onOpenNotes }: Props) {
  const nextIdx = (alternateIndex + 1) % 3;
  const names = [originalExercise.name, originalExercise.alternates[0], originalExercise.alternates[1]];
  return (
    <>
      <div className="space-y-1">
        <div className="flex items-start gap-2">
          <h2 className="font-display text-4xl font-bold text-fg leading-tight flex-1">{exercise.name}</h2>
          <button
            onClick={onOpenNotes}
            className="mt-1 shrink-0 transition-colors cursor-pointer"
            style={{ color: note ? "var(--primary)" : "var(--subtle)" }}
          >
            <Info size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSwap}
            className="flex items-center gap-1.5 text-xs text-subtle hover:text-primary transition-colors cursor-pointer"
          >
            <Repeat2 size={13} />
            Swap to {names[nextIdx]}
          </button>
        </div>
      </div>

      {exercise.formNote && (
        <p className="text-sm text-muted glass rounded-xl px-4 py-3 leading-relaxed">
          {exercise.formNote}
        </p>
      )}

      {note && (
        <button
          onClick={onOpenNotes}
          className="w-full text-left rounded-xl px-4 py-3 space-y-0.5 cursor-pointer transition-opacity hover:opacity-80"
          style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}
        >
          <p className="text-xs font-display font-semibold text-primary uppercase tracking-widest">My notes</p>
          <p className="text-sm text-fg leading-relaxed">{note}</p>
        </button>
      )}

      {exercise.youtubeUrl && (
        <a
          href={exercise.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-danger transition-colors"
        >
          <ExternalLink size={13} />
          Watch tutorial
        </a>
      )}
    </>
  );
}
