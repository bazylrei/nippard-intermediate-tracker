import { useEffect, useState } from "react";
import type { Exercise } from "@/lib/types";

/** How long the "done · up next" line stays after moving on from a finished exercise. */
export const FINISHED_NOTICE_MS = 4000;

export type ExerciseDirection = "forward" | "back";

/**
 * What changed when the workout moved to another exercise, so the move can be
 * shown: which way it went (null until the first move, so loading doesn't
 * animate), and the exercise just left if it was finished, for a few seconds.
 */
export function useExerciseTransition(exerciseIndex: number, exercises: Exercise[], isExerciseDone: (index: number) => boolean) {
  const [previousIndex, setPreviousIndex] = useState(exerciseIndex);
  const [direction, setDirection] = useState<ExerciseDirection | null>(null);
  const [finished, setFinished] = useState<Exercise | null>(null);

  // Adjusting state from the previous render (React's recommended alternative to an effect).
  if (previousIndex !== exerciseIndex) {
    setPreviousIndex(exerciseIndex);
    setDirection(exerciseIndex > previousIndex ? "forward" : "back");
    setFinished(isExerciseDone(previousIndex) ? exercises[previousIndex] ?? null : null);
  }

  useEffect(() => {
    if (!finished) return;
    const timer = setTimeout(() => setFinished(null), FINISHED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [finished]);

  return { direction, finished };
}
