import { useCallback, useState } from "react";
import { completeSession, logSetAndAdvance, updateSessionProgress, updateSetLog } from "@/lib/db";
import {
  isExerciseComplete, loggedWorkingSets, phaseAt, planAfterSet, resumeSetIndex, totalSetsForExercise,
  saveWorkoutInProgress, clearWorkoutInProgress, type WorkoutPhase,
} from "@/lib/workout-helpers";
import type { Exercise, SetLog, WorkoutSession } from "@/lib/types";

const PROGRESS_SAVE_FAILED = "Couldn't save your place in the workout. It will be saved with your next set.";

/** The slice of `useSaveError` this hook reports through. */
interface SaveErrorReporter {
  attempt: (save: () => Promise<unknown>, failureMessage: string) => Promise<boolean>;
  report: (failureMessage: string, error?: unknown) => void;
  clear: () => void;
}

interface Params {
  session: WorkoutSession | null;
  userId: string | null;
  /** Today's exercises, with alternates already resolved. */
  exercises: Exercise[];
  saveError: SaveErrorReporter;
  /** Called with the rest length, in seconds, as soon as a set is logged. */
  onRest: (seconds: number) => void;
}

/** Where a loaded workout picks up. */
export interface WorkoutPosition {
  sessionSets: SetLog[];
  exerciseIndex: number;
  setIndex: number;
  phase: WorkoutPhase;
}

/** A workout with nothing logged yet, on its overview. */
export const START: WorkoutPosition = { sessionSets: [], exerciseIndex: 0, setIndex: 0, phase: "overview" };

/**
 * Where the user is in the workout and the sets logged so far, and every move
 * through it: going to an exercise, skipping, finishing the warm-up, logging
 * and editing sets. Moves are instant; the saves behind them report failures
 * through `saveError`, and a set that fails to save is rolled back.
 */
export function useWorkoutProgress({ session, userId, exercises, saveError, onRest }: Params) {
  const [state, setState] = useState<WorkoutPosition & { done: boolean }>({ ...START, done: false });
  const { exerciseIndex, setIndex, sessionSets } = state;

  const currentExercise: Exercise | undefined = exercises[exerciseIndex];
  // The set to log next: at the warm-up position (-1), or when returning to a
  // partly done exercise, it's the first set not yet logged.
  const loggedCount = currentExercise ? loggedWorkingSets(sessionSets, currentExercise.id).length : 0;
  const workingSetIndex = Math.max(setIndex, loggedCount);

  /** Replaces the whole position, e.g. with a freshly loaded workout. */
  const restore = useCallback((position: WorkoutPosition) => {
    const { sessionSets, exerciseIndex, setIndex, phase } = position;
    setState({ sessionSets, exerciseIndex, setIndex, phase, done: false });
  }, []);

  /** Navigation is instant; if saving the resume point fails, the next logged set saves it anyway. */
  function saveProgress(exIdx: number, sIdx: number) {
    if (!session) return;
    void saveError.attempt(() => updateSessionProgress(session.id, exIdx, sIdx), PROGRESS_SAVE_FAILED);
  }

  /** Opens an exercise where it was left off: its warm-up, or its next set once one is logged. */
  function goToExercise(exIdx: number) {
    if (!session) return;
    const sIdx = resumeSetIndex(exercises[exIdx], sessionSets);
    setState((s) => ({ ...s, exerciseIndex: exIdx, setIndex: sIdx, phase: phaseAt(sIdx) }));
    saveWorkoutInProgress(exIdx, exercises, session);
    saveProgress(exIdx, sIdx);
  }

  /** Ends the workout with whatever is logged (it needn't be done in full); stays on it if saving fails. */
  async function finishWorkout() {
    if (session && !(await saveError.attempt(() => completeSession(session.id), "Couldn't finish the workout. Try again."))) return;
    clearWorkoutInProgress();
    setState((s) => ({ ...s, done: true }));
  }

  async function skipExercise() {
    if (exerciseIndex + 1 < exercises.length) {
      goToExercise(exerciseIndex + 1);
      return;
    }
    await finishWorkout();
  }

  function completeWarmup() {
    setState((s) => ({ ...s, setIndex: workingSetIndex, phase: "sets" }));
    saveProgress(exerciseIndex, workingSetIndex);
  }

  /**
   * Optimistic: the UI advances and the rest starts immediately; the set and
   * the new session position are saved in one atomic call. On failure the UI
   * rolls back so what's on screen never claims a set that wasn't saved.
   */
  async function logSet(weight: number, reps: number, rpe: number | null, failureHit: boolean | null) {
    if (!session || !currentExercise || !userId) return;
    const isLastSet = workingSetIndex === totalSetsForExercise(currentExercise) - 1;
    const newSet: SetLog = {
      id: crypto.randomUUID(), sessionId: session.id, userId, exerciseId: currentExercise.id,
      setIndex: workingSetIndex, isLastSet, weight, reps, rpe, failureHit, loggedAt: new Date().toISOString(),
    };
    const updated = [...sessionSets, newSet];
    const step = planAfterSet(exercises, updated, exerciseIndex, workingSetIndex);
    const previous = state;

    saveError.clear();
    if (step.kind === "complete") {
      // Nothing left to rest for.
      clearWorkoutInProgress();
      setState({ ...state, sessionSets: updated, done: true });
    } else {
      const [restMin, restMax] = currentExercise.restSeconds;
      onRest(Math.round((restMin + restMax) / 2));
      const phase = step.kind === "nextExercise" ? phaseAt(step.setIndex) : state.phase;
      setState({ ...state, sessionSets: updated, exerciseIndex: step.exerciseIndex, setIndex: step.setIndex, phase });
      saveWorkoutInProgress(step.exerciseIndex, exercises, session);
    }

    try {
      await logSetAndAdvance({
        ...newSet, nextExerciseIndex: step.exerciseIndex, nextSetIndex: step.setIndex, completeSession: step.kind === "complete",
      });
    } catch (err) {
      setState(previous);
      saveWorkoutInProgress(previous.exerciseIndex, exercises, session);
      saveError.report("Couldn't save that set. Check your connection and log it again.", err);
    }
  }

  /** Saves an edit to a logged set; rejects (so the caller's sheet can show it) if that fails. */
  async function editSet(setId: string, weightKg: number, reps: number, rpe: number | null) {
    await updateSetLog(setId, weightKg, reps, rpe);
    setState((s) => ({ ...s, sessionSets: s.sessionSets.map((set) => set.id === setId ? { ...set, weight: weightKg, reps, rpe } : set) }));
  }

  const isExerciseDone = (exIdx: number) => !!exercises[exIdx] && isExerciseComplete(exercises[exIdx], sessionSets);
  const begin = () => setState((s) => ({ ...s, phase: "warmup" }));

  return {
    exerciseIndex, phase: state.phase, sessionSets, done: state.done, currentExercise, workingSetIndex,
    restore, begin, goToExercise, skipExercise, finishWorkout, completeWarmup, logSet, editSet, isExerciseDone,
  };
}
