import { useEffect, useState } from "react";
import { getExerciseHistory } from "@/lib/db";
import type { Exercise } from "@/lib/types";

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
