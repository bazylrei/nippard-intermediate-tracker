"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { WeekSchedule, WorkoutDay } from "@/lib/types";
import { loadFullProgram, type LoadedProgram } from "@/lib/program-db";
import { setActiveProgram } from "@/lib/db/preferences";
import { createClient } from "@/lib/supabase";
import { cacheDelete, cacheGet, cacheSet } from "@/lib/cache";

interface ProgramContextValue extends LoadedProgram {
  ready: boolean;
  /** The program couldn't be loaded and nothing is cached — screens that need it should say so. */
  failed: boolean;
  getWorkoutDay: (week: number, dayIndex: number) => WorkoutDay | null;
  /** Follows `programId` (null: none) and loads it; resolves with its schedule. Rejects if saving or loading fails. */
  followProgram: (programId: string | null) => Promise<WeekSchedule[]>;
}

/** Whose program it is, so another account on the device never sees it. */
type CachedProgram = LoadedProgram & { userId: string };

const CACHE_KEY = "program-v2";

const EMPTY: LoadedProgram = { program: [], warmupSteps: {}, failureTechniques: {}, programId: null, programName: null };

const ProgramContext = createContext<ProgramContextValue>({
  ...EMPTY,
  ready: false,
  failed: false,
  getWorkoutDay: () => null,
  followProgram: () => Promise.reject(new Error("No ProgramProvider")),
});

export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState<CachedProgram | null>(() => cacheGet<CachedProgram>(CACHE_KEY));
  const [loadFailed, setLoadFailed] = useState(false);
  const userRef = useRef<string | null>(null);
  // A failed refresh is fine while a cached program is on screen.
  const failed = loadFailed && !loaded;

  const load = useCallback(async (userId: string): Promise<CachedProgram> => {
    const data = await loadFullProgram(createClient(), userId);
    if (!data) throw new Error("Couldn't load the program");
    const fresh = { ...data, userId };
    setLoaded(fresh);
    setLoadFailed(false);
    cacheSet(CACHE_KEY, fresh);
    return fresh;
  }, []);

  useEffect(() => {
    // Loads for whoever is signed in, and again when that changes (sign-in, sign-out, another account).
    const { data } = createClient().auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null;
      if (userId === userRef.current) return; // token refreshes change nothing
      userRef.current = userId;
      setLoaded((prev) => (prev?.userId === userId ? prev : null));
      if (!userId) { cacheDelete(CACHE_KEY); return; }
      // Supabase calls made inside this callback can deadlock its auth lock, so load after it returns.
      setTimeout(() => {
        load(userId).catch((error) => { console.error(error); setLoadFailed(true); });
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const followProgram = useCallback(async (programId: string | null) => {
    const userId = userRef.current;
    if (!userId) throw new Error("Not signed in");
    await setActiveProgram(userId, programId);
    return (await load(userId)).program;
  }, [load]);

  const value = loaded ?? EMPTY;

  function getWorkoutDay(week: number, dayIndex: number): WorkoutDay | null {
    return value.program.find((w) => w.week === week)?.days[dayIndex] ?? null;
  }

  return (
    <ProgramContext.Provider value={{ ...value, ready: !!loaded, failed, getWorkoutDay, followProgram }}>
      {children}
    </ProgramContext.Provider>
  );
}

export function useProgramContext(): ProgramContextValue {
  return useContext(ProgramContext);
}
