import { useCallback, useEffect, useState } from "react";
import { getExerciseHistories, getLatestBodyWeight, logBodyWeight } from "@/lib/db";
import { localYmd } from "@/lib/dates";
import type { Exercise } from "@/lib/types";

export type PostHistory = Record<string, { date: string; weight: number; reps: number }[]>;

/** What the finished-workout report needs beyond the session itself. */
export interface PostWorkoutData {
  /** Each exercise's last-set history, for its progress chart. */
  history: PostHistory;
  /** Latest weigh-in in kg (bodyweight exercises' volume); null before the first. */
  bodyWeightKg: number | null;
  /** Logs today's weigh-in (kg) so the report can count body weight; rejects if it fails. */
  logBodyWeight: (weightKg: number) => Promise<void>;
}

type Loaded = Pick<PostWorkoutData, "history" | "bodyWeightKg">;
const EMPTY: Loaded = { history: {}, bodyWeightKg: null };

/** Loads once the workout is done, in one parallel round trip. */
export function usePostHistory(done: boolean, userId: string | null, exercises: Exercise[]): PostWorkoutData {
  const [data, setData] = useState<Loaded>(EMPTY);

  useEffect(() => {
    if (!done || !userId || exercises.length === 0) return;
    const ids = exercises.map((ex) => ex.id);
    Promise.all([getExerciseHistories(userId, ids), getLatestBodyWeight(userId)])
      .then(([histories, latest]) => setData({
        history: Object.fromEntries(ids.map((id) => [id, histories[id] ?? []])),
        bodyWeightKg: latest?.weightKg ?? null,
      }))
      .catch((error) => console.error(error)); // the report still shows without charts
  }, [done, userId, exercises]);

  const logWeight = useCallback(async (weightKg: number) => {
    if (!userId) return;
    await logBodyWeight(userId, localYmd(new Date()), weightKg);
    setData((d) => ({ ...d, bodyWeightKg: weightKg }));
  }, [userId]);

  return { ...data, logBodyWeight: logWeight };
}
