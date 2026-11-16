import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { saveExerciseSwaps } from "@/lib/db";
import { chooseExercise, exerciseOptions, mergeChoices, type ExerciseChoices } from "@/lib/alternates";
import type { Exercise, WorkoutSession } from "@/lib/types";
import type { ExerciseSwapSheetProps } from "@/components/workout/ExerciseSwapSheet";

interface Params {
  session: WorkoutSession | null;
  setSession: Dispatch<SetStateAction<WorkoutSession | null>>;
  /** Saved defaults: main exercise id -> the alternate to do instead. */
  defaults: ExerciseChoices;
  /** Saves a default; reverts itself and rejects if that fails. */
  setDefaultAlternate: (mainId: string, chosenId: string) => Promise<void>;
}

/**
 * Which exercise to do for each slot: this workout's swaps over the saved
 * defaults. A swap belongs to the session (so it survives leaving and resuming
 * the workout); a default is the user's standing choice. Also owns the swap
 * sheet: `swapSheet` is its props while it's open, null otherwise.
 */
export function useExerciseSwap({ session, setSession, defaults, setDefaultAlternate }: Params) {
  const [swapping, setSwapping] = useState<Exercise | null>(null);
  const swaps = session?.exerciseSwaps;
  const choices = useMemo(() => mergeChoices(defaults, swaps ?? {}), [defaults, swaps]);

  /**
   * Switches `mainId`'s slot to `chosenId` for this workout, and with `makeDefault`
   * for future workouts too. Optimistic; rejects (leaving the sheet open to retry)
   * if saving fails. Choosing the main exercise itself overrides a saved default for today.
   */
  const chooseAlternate = useCallback(async (mainId: string, chosenId: string, makeDefault: boolean) => {
    if (!session) return;
    const previous = session;
    const exerciseSwaps = { ...session.exerciseSwaps, [mainId]: chosenId };
    setSession({ ...session, exerciseSwaps });
    try {
      await saveExerciseSwaps(session.id, exerciseSwaps);
    } catch (error) {
      setSession(previous);
      throw error;
    }
    // Today's swap is saved by now, so a failure here keeps it and lets a retry save just the default.
    if (makeDefault) await setDefaultAlternate(mainId, chosenId);
  }, [session, setSession, setDefaultAlternate]);

  const swapSheet: ExerciseSwapSheetProps | null = swapping && {
    options: exerciseOptions(swapping),
    currentId: chooseExercise(swapping, choices).id,
    defaultId: chooseExercise(swapping, defaults).id,
    onChoose: (chosenId, makeDefault) => chooseAlternate(swapping.id, chosenId, makeDefault),
    onClose: () => setSwapping(null),
  };

  return { choices, swapSheet, openSwap: setSwapping };
}
