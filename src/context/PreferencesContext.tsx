"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPreferences, upsertPreferences } from "@/lib/db";
import { cachePrefs, DEFAULT_PREFS, readCachedPrefs } from "@/lib/prefs-cache";
import type { UserPreferences } from "@/lib/types";

interface PreferencesValue {
  /** The device's cached preferences straight away, the account's once `ready`. */
  prefs: UserPreferences;
  /** The account's preferences have been loaded this session. */
  ready: boolean;
  /** They couldn't be loaded; `prefs` is only the cached copy (or defaults). */
  failed: boolean;
  /**
   * Saves a change. Optimistic: `prefs` shows it at once, and if saving fails the
   * changed fields go back and this rejects, for the caller to report.
   */
  save: (patch: Partial<UserPreferences>) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesValue>({
  prefs: DEFAULT_PREFS,
  ready: false,
  failed: false,
  save: () => Promise.reject(new Error("PreferencesProvider is missing")),
});

/** The one owner of the signed-in user's preferences: one load per session, shared by every screen. */
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const userId = useAuth().user?.id ?? null;
  const [prefs, setPrefs] = useState<UserPreferences>(() => readCachedPrefs() ?? DEFAULT_PREFS);
  /** Which account's preferences have loaded / failed to load: another account's don't count. */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const ready = userId !== null && loadedFor === userId;
  const failed = userId !== null && failedFor === userId;
  const latest = useRef(prefs);
  /** Saves started so far: a load that finishes after one must not overwrite the newer choice. */
  const saves = useRef(0);

  const apply = useCallback((next: UserPreferences) => {
    latest.current = next;
    setPrefs(next);
    cachePrefs(next);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const savesAtStart = saves.current;
    getPreferences(userId)
      .then((loaded) => {
        if (cancelled) return;
        if (saves.current === savesAtStart) apply(loaded);
        setLoadedFor(userId);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setFailedFor(userId);
      });
    return () => { cancelled = true; };
  }, [userId, apply]);

  const save = useCallback(async (patch: Partial<UserPreferences>) => {
    if (!userId) throw new Error("Not signed in");
    const previous = latest.current;
    saves.current += 1;
    apply({ ...previous, ...patch });
    try {
      await upsertPreferences(userId, patch);
    } catch (error) {
      // Put back only what this save changed, in case another save landed meanwhile.
      const reverted = { ...latest.current } as Record<string, unknown>;
      for (const key of Object.keys(patch)) reverted[key] = (previous as unknown as Record<string, unknown>)[key];
      apply(reverted as unknown as UserPreferences);
      throw error;
    }
  }, [userId, apply]);

  const value = useMemo(() => ({ prefs, ready, failed, save }), [prefs, ready, failed, save]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  return useContext(PreferencesContext);
}
