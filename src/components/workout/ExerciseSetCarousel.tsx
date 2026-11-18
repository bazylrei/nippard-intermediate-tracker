"use client";

import type { ReactNode } from "react";
import type { Exercise, ExerciseRecord, SetLog } from "@/lib/types";
import { totalSetsForExercise } from "@/lib/workout-helpers";
import SetLogger from "@/components/SetLogger";
import SetCarousel from "./SetCarousel";
import { UpcomingSetCard } from "./SetCards";

interface Props {
  exercise: Exercise;
  /** The working set being logged now; null while warming up. */
  currentSetIndex: number | null;
  /** Optional first slide, shown before the working sets. */
  warmup?: ReactNode;
  loggedSets: SetLog[];
  record: ExerciseRecord;
  unit: "kg" | "lbs";
  onLog: (weight: number, reps: number, rpe: number | null, failureHit: boolean | null) => void;
  /** Saves a correction to a logged set (weight in kg); rejects if it can't be saved. */
  onEdit: (setId: string, weightKg: number, reps: number, rpe: number | null) => Promise<void>;
}

/**
 * An exercise as carousel slides: an optional warm-up, then each working set —
 * logged (the same form, to correct it), being logged now, or still to come.
 */
export default function ExerciseSetCarousel({ exercise, currentSetIndex, warmup, loggedSets, record, unit, onLog, onEdit }: Props) {
  const totalSets = totalSetsForExercise(exercise);
  const offset = warmup ? 1 : 0;
  const activeIndex = currentSetIndex === null ? 0 : currentSetIndex + offset;

  function renderSetSlide(index: number) {
    const logged = loggedSets[index];
    const isLastSet = index === totalSets - 1;
    if (logged || index === currentSetIndex) {
      return (
        <SetLogger
          exercise={exercise}
          setIndex={index}
          isLastSet={isLastSet}
          previousSets={record.lastSets}
          bestSet={record.bestSet}
          unit={unit}
          onLog={onLog}
          editing={logged && { set: logged, onSave: (weightKg, reps, rpe) => onEdit(logged.id, weightKg, reps, rpe) }}
        />
      );
    }
    return (
      <UpcomingSetCard
        setNumber={index + 1}
        repRange={exercise.repRange}
        targetRpe={isLastSet ? exercise.lastSetRpe : exercise.earlySetRpe}
      />
    );
  }

  return (
    <SetCarousel
      count={totalSets + offset}
      activeIndex={activeIndex}
      slideLabel={(i) => (i < offset ? "Warm-up" : `Set ${i - offset + 1} of ${totalSets}`)}
      renderSlide={(i) => (i < offset ? warmup : renderSetSlide(i - offset))}
    />
  );
}
