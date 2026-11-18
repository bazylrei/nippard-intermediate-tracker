"use client";

import type { Exercise } from "@/lib/types";
import { Repeat2, ExternalLink, Info } from "lucide-react";
import VideoLink from "@/components/VideoLink";

interface Props {
  /** The exercise being done: the slot's own, or the alternate chosen for it. */
  exercise: Exercise;
  /** The slot's own exercise; differs from `exercise` after a swap. */
  originalExercise: Exercise;
  /** False once a set has been logged: the exercise can't change mid-way. */
  canSwap: boolean;
  note: string | undefined;
  onOpenSwap: () => void;
  onOpenNotes: () => void;
}

export default function ExerciseInfo({ exercise, originalExercise, canSwap, note, onOpenSwap, onOpenNotes }: Props) {
  const swapped = exercise.id !== originalExercise.id;
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
        <div className="flex items-center gap-3">
          {canSwap && originalExercise.alternates.length > 0 && (
            <button
              onClick={onOpenSwap}
              className="flex items-center gap-1.5 text-xs text-subtle hover:text-primary transition-colors cursor-pointer"
            >
              <Repeat2 size={13} />
              Swap exercise
            </button>
          )}
          {swapped && <span className="text-xs text-subtle">Instead of {originalExercise.name}</span>}
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
        <VideoLink url={exercise.youtubeUrl} className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-danger transition-colors">
          <ExternalLink size={13} />
          Watch tutorial
        </VideoLink>
      )}
    </>
  );
}
