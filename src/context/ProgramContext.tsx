"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { WeekSchedule, WorkoutDay } from "@/lib/types";
import { loadFullProgram } from "@/lib/program-db";
import { createClient } from "@/lib/supabase";
import { cacheGet, cacheSet } from "@/lib/cache";

interface ProgramContextValue {
  program: WeekSchedule[];
  warmupSteps: Record<string, string[]>;
  failureTechniques: Record<string, { label: string; description: string }>;
  programId: string | null;
  ready: boolean;
  /** The program couldn't be loaded and nothing is cached — screens that need it should say so. */
  failed: boolean;
  getWorkoutDay: (week: number, dayIndex: number) => WorkoutDay | null;
}

type CachedProgram = {
  program: WeekSchedule[];
  warmupSteps: Record<string, string[]>;
  failureTechniques: Record<string, { label: string; description: string }>;
  programId: string | null;
};

const ProgramContext = createContext<ProgramContextValue>({
  program: [],
  warmupSteps: {},
  failureTechniques: {},
  programId: null,
  ready: false,
  failed: false,
  getWorkoutDay: () => null,
});

export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const cached = cacheGet<CachedProgram>("program-v1");
  const [program, setProgram] = useState<WeekSchedule[]>(cached?.program ?? []);
  const [warmupSteps, setWarmupSteps] = useState<Record<string, string[]>>(cached?.warmupSteps ?? {});
  const [failureTechniques, setFailureTechniques] = useState<Record<string, { label: string; description: string }>>(cached?.failureTechniques ?? {});
  const [programId, setProgramId] = useState<string | null>(cached?.programId ?? null);
  const [ready, setReady] = useState(!!cached);
  const [loadFailed, setLoadFailed] = useState(false);
  // A failed refresh is fine while a cached program is on screen.
  const failed = loadFailed && !ready;

  useEffect(() => {
    const sb = createClient();
    loadFullProgram(sb).then((data) => {
      if (!data) { setLoadFailed(true); return; }
      setProgram(data.program);
      setWarmupSteps(data.warmupSteps);
      setFailureTechniques(data.failureTechniques);
      setProgramId(data.programId);
      cacheSet("program-v1", { ...data });
      setReady(true);
    }).catch((error) => {
      console.error(error);
      setLoadFailed(true);
    });
  }, []);

  function getWorkoutDay(week: number, dayIndex: number): WorkoutDay | null {
    return program.find((w) => w.week === week)?.days[dayIndex] ?? null;
  }

  return (
    <ProgramContext.Provider value={{ program, warmupSteps, failureTechniques, programId, ready, failed, getWorkoutDay }}>
      {children}
    </ProgramContext.Provider>
  );
}

export function useProgramContext(): ProgramContextValue {
  return useContext(ProgramContext);
}
