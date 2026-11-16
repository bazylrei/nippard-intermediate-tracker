"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSignedInUser } from "@/lib/require-user";
import { getLatestBodyWeight, getPreferences, logBodyWeight, upsertPreferences } from "@/lib/db";
import { localYmd } from "@/lib/dates";
import { cachePrefs, DEFAULT_PREFS, readCachedPrefs } from "@/lib/prefs-cache";
import type { BodyWeightLog, UserPreferences } from "@/lib/types";
import { useSaveError } from "./useSaveError";

export type SettingsStatus = "loading" | "ready" | "error";

/**
 * The Settings page's data and saves: preferences and the latest weigh-in load
 * together, and every change shows at once, then reverts with a visible error
 * if it can't be saved.
 */
export function useSettings() {
  const router = useRouter();
  const saveError = useSaveError();
  const { attempt } = saveError;
  const [status, setStatus] = useState<SettingsStatus>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences>(() => readCachedPrefs() ?? DEFAULT_PREFS);
  const [bodyWeight, setBodyWeight] = useState<BodyWeightLog | null>(null);

  useEffect(() => {
    async function load() {
      const user = await requireSignedInUser(router);
      if (!user) return;
      setUserId(user.id);
      try {
        const [loadedPrefs, latestWeight] = await Promise.all([getPreferences(user.id), getLatestBodyWeight(user.id)]);
        setPrefs(loadedPrefs);
        setBodyWeight(latestWeight);
        cachePrefs(loadedPrefs);
        setStatus("ready");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }
    void load();
  }, [router]);

  function applyPrefs(next: UserPreferences) {
    setPrefs(next);
    cachePrefs(next);
  }

  /** Optimistic: shows the change at once, reverts it and says so if the save fails. */
  async function savePrefs(patch: Partial<UserPreferences>, failureMessage: string) {
    if (!userId) return;
    const previous = prefs;
    applyPrefs({ ...prefs, ...patch });
    const ok = await attempt(() => upsertPreferences(userId, patch), failureMessage);
    if (!ok) applyPrefs(previous);
  }

  const changeUnit = (unit: UserPreferences["unit"]) =>
    savePrefs({ unit }, "Couldn't change the weight unit. Try again.");

  const saveHeight = (heightCm: number | null) => savePrefs({ heightCm }, "Couldn't save your height. Try again.");

  const changeWeekStart = (weekStartsOn: number) =>
    savePrefs({ weekStartsOn }, "Couldn't change the first day of your week. Try again.");

  /** Optimistic like savePrefs: today's weigh-in shows at once and reverts if saving fails. */
  async function logWeight(weightKg: number) {
    if (!userId) return;
    const previous = bodyWeight;
    const today = localYmd(new Date());
    setBodyWeight({ loggedOn: today, weightKg, source: "manual" });
    const ok = await attempt(() => logBodyWeight(userId, today, weightKg), "Couldn't save your body weight. Try again.");
    if (!ok) setBodyWeight(previous);
  }

  return {
    status, prefs, bodyWeightKg: bodyWeight?.weightKg ?? null, saveError,
    actions: { changeUnit, saveHeight, changeWeekStart, logWeight },
  };
}
