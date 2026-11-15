import { useEffect, useState } from "react";
import { getExerciseHistory, getLatestBodyWeight } from "@/lib/db";
import type { Exercise } from "@/lib/types";

export type PostHistory = Record<string, { date: string; weight: number; reps: number }[]>;

/** What the finished-workout report needs beyond the session itself. */
export interface PostWorkoutData {
  /** Each exercise's last-set history, for its progress chart. */
  history: PostHistory;
  /** Latest weigh-in in kg (bodyweight exercises' volume); null before the first. */
  bodyWeightKg: number | null;
}

const EMPTY: PostWorkoutData = { history: {}, bodyWeightKg: null };

/** Loads once the workout is done, in one parallel round trip. */
export function usePostHistory(done: boolean, userId: string | null, exercises: Exercise[]): PostWorkoutData {
  const [data, setData] = useState<PostWorkoutData>(EMPTY);

  useEffect(() => {
    if (!done || !userId || exercises.length === 0) return;
    Promise.all([
      Promise.all(exercises.map((ex) => getExerciseHistory(userId, ex.id).then((h) => [ex.id, h] as const))),
      getLatestBodyWeight(userId),
    ]).then(([results, latest]) => setData({ history: Object.fromEntries(results), bodyWeightKg: latest?.weightKg ?? null }));
  }, [done, userId, exercises]);

  return data;
}
