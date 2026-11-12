import { useCallback, useEffect, useState } from "react";
import { getExerciseHistory, getLastSessionSetsForExercise } from "@/lib/db";
import type { Exercise, SetLog } from "@/lib/types";

export function usePrevSets(userId: string | null, exerciseId: string | undefined) {
  const [prevSets, setPrevSets] = useState<SetLog[]>([]);

  const loadPrevSets = useCallback(async (uid: string, exId: string) => {
    setPrevSets(await getLastSessionSetsForExercise(uid, exId));
  }, []);

  useEffect(() => {
    if (!userId || !exerciseId) return;
    const uid = userId;
    const exId = exerciseId;
    async function run() { await loadPrevSets(uid, exId); }
    void run();
  }, [userId, exerciseId, loadPrevSets]);

  return { prevSets, loadPrevSets };
}

export type PostHistory = Record<string, { date: string; weight: number; reps: number }[]>;

export function usePostHistory(done: boolean, userId: string | null, exercises: Exercise[]): PostHistory {
  const [postHistory, setPostHistory] = useState<PostHistory>({});

  useEffect(() => {
    if (!done || !userId || exercises.length === 0) return;
    Promise.all(
      exercises.map((ex) => getExerciseHistory(userId, ex.id).then((h) => [ex.id, h] as const))
    ).then((results) => setPostHistory(Object.fromEntries(results)));
  }, [done, userId, exercises]);

  return postHistory;
}
