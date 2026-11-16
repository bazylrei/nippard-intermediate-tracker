import { useCallback, useEffect, useMemo, useState } from "react";
import { getBodyWeightLogs, getExerciseHistory, getExerciseWorkingSets, logBodyWeight } from "@/lib/db";
import { localYmd } from "@/lib/dates";
import type { BodyWeightLog, Exercise } from "@/lib/types";
import { sessionVolumes, type SessionSet, type SessionVolume } from "@/lib/volume";

export type PostHistory = Record<string, { date: string; weight: number; reps: number }[]>;

/** What the finished-workout report needs beyond the session itself. */
export interface PostWorkoutData {
  /** Each exercise's last-set history, for its progress chart. */
  history: PostHistory;
  /** Each exercise's volume per session, oldest first, for its volume chart. */
  volumes: Record<string, SessionVolume[]>;
  /** Latest weigh-in in kg (bodyweight exercises' volume); null before the first. */
  bodyWeightKg: number | null;
  /** Logs today's weigh-in (kg) so the report can count body weight; rejects if it fails. */
  logBodyWeight: (weightKg: number) => Promise<void>;
}

interface Loaded {
  history: PostHistory;
  sets: SessionSet[];
  weighIns: BodyWeightLog[];
}
const EMPTY: Loaded = { history: {}, sets: [], weighIns: [] };

/** Loads once the workout is done, in one parallel round trip. */
export function usePostHistory(done: boolean, userId: string | null, exercises: Exercise[]): PostWorkoutData {
  const [data, setData] = useState<Loaded>(EMPTY);

  useEffect(() => {
    if (!done || !userId || exercises.length === 0) return;
    Promise.all([
      Promise.all(exercises.map((ex) => getExerciseHistory(userId, ex.id).then((h) => [ex.id, h] as const))),
      getExerciseWorkingSets(userId, exercises.map((ex) => ex.id)),
      getBodyWeightLogs(userId),
    ]).then(([results, sets, weighIns]) => setData({ history: Object.fromEntries(results), sets, weighIns }));
  }, [done, userId, exercises]);

  // Derived from the loaded sets and weigh-ins, so logging body weight here updates volumes too.
  const volumes = useMemo(
    () => sessionVolumes(data.sets, Object.fromEntries(exercises.map((ex) => [ex.id, ex])), data.weighIns),
    [data, exercises],
  );

  const logWeight = useCallback(async (weightKg: number) => {
    if (!userId) return;
    const loggedOn = localYmd(new Date());
    await logBodyWeight(userId, loggedOn, weightKg);
    setData((d) => ({
      ...d,
      weighIns: [...d.weighIns.filter((w) => w.loggedOn !== loggedOn), { loggedOn, weightKg, source: "manual" as const }],
    }));
  }, [userId]);

  const bodyWeightKg = data.weighIns.at(-1)?.weightKg ?? null;
  return { history: data.history, volumes, bodyWeightKg, logBodyWeight: logWeight };
}
