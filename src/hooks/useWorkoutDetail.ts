import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSignedInUser } from "@/lib/require-user";
import {
  getWorkoutDetail, updateSetLog, deleteSetLog, deleteExerciseSetsFromSession,
  updateExerciseIdForSets, addSetsToSession, deleteWorkoutSession,
} from "@/lib/db";
import { useSaveError } from "./useSaveError";
import type { SetLog, WorkoutSession } from "@/lib/types";

export type WorkoutDetailStatus = "loading" | "ready" | "not-found" | "error";

export interface NewSet {
  weight: number;
  reps: number;
}

/**
 * Loads one workout and owns every edit to it. Each action resolves true on
 * success; on failure it leaves local state untouched and surfaces `saveError`.
 */
export function useWorkoutDetail(sessionId: string) {
  const router = useRouter();
  const saveError = useSaveError();
  const { attempt } = saveError;
  const [status, setStatus] = useState<WorkoutDetailStatus>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [sets, setSets] = useState<SetLog[]>([]);

  useEffect(() => {
    async function load() {
      const user = await requireSignedInUser(router);
      if (!user) return;
      setUserId(user.id);
      try {
        const detail = await getWorkoutDetail(sessionId);
        if (!detail) { setStatus("not-found"); return; }
        setSession(detail.session);
        setSets(detail.sets);
        setStatus("ready");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }
    void load();
  }, [sessionId, router]);

  const updateSet = useCallback(async (setId: string, weight: number, reps: number, rpe: number | null) => {
    const ok = await attempt(() => updateSetLog(setId, weight, reps, rpe), "Couldn't save that set. Try again.");
    if (ok) setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, weight, reps } : s)));
    return ok;
  }, [attempt]);

  const deleteSet = useCallback(async (setId: string) => {
    const ok = await attempt(() => deleteSetLog(setId), "Couldn't delete that set. Try again.");
    if (ok) setSets((prev) => prev.filter((s) => s.id !== setId));
    return ok;
  }, [attempt]);

  const removeExercise = useCallback(async (exerciseId: string) => {
    const ok = await attempt(() => deleteExerciseSetsFromSession(sessionId, exerciseId), "Couldn't remove that exercise. Try again.");
    if (ok) setSets((prev) => prev.filter((s) => s.exerciseId !== exerciseId));
    return ok;
  }, [attempt, sessionId]);

  const swapExercise = useCallback(async (fromId: string, toId: string) => {
    if (fromId === toId) return true;
    const ok = await attempt(() => updateExerciseIdForSets(sessionId, fromId, toId), "Couldn't change the exercise. Try again.");
    if (ok) setSets((prev) => prev.map((s) => (s.exerciseId === fromId ? { ...s, exerciseId: toId } : s)));
    return ok;
  }, [attempt, sessionId]);

  const addExercise = useCallback(async (exerciseId: string, newSets: NewSet[]) => {
    if (!userId) return false;
    let added: SetLog[] = [];
    const ok = await attempt(async () => {
      added = await addSetsToSession(sessionId, exerciseId, userId, newSets);
    }, "Couldn't add that exercise. Try again.");
    if (ok) setSets((prev) => [...prev, ...added]);
    return ok;
  }, [attempt, sessionId, userId]);

  const deleteWorkout = useCallback(
    () => attempt(() => deleteWorkoutSession(sessionId), "Couldn't delete the workout. Try again."),
    [attempt, sessionId],
  );

  return {
    status, session, sets, saveError,
    actions: { updateSet, deleteSet, removeExercise, swapExercise, addExercise, deleteWorkout },
  };
}
