"use client";

import { useEffect, useState } from "react";
import { useRequireUser } from "@/context/AuthContext";
import { getLatestBodyWeight, logBodyWeight } from "@/lib/db";
import { usePreferences } from "@/context/PreferencesContext";
import { localYmd } from "@/lib/dates";
import type { BodyWeightLog, UserPreferences } from "@/lib/types";
import { useSaveError } from "./useSaveError";

export type SettingsStatus = "loading" | "ready" | "error";

/**
 * The Settings page's data and saves: preferences and the latest weigh-in load
 * together, and every change shows at once, then reverts with a visible error
 * if it can't be saved.
 */
export function useSettings() {
  const user = useRequireUser();
  const userId = user?.id ?? null;
  const saveError = useSaveError();
  const { attempt } = saveError;
  const { prefs, ready, failed, save } = usePreferences();
  const [weightStatus, setWeightStatus] = useState<"loading" | "ready" | "error">("loading");
  const [bodyWeight, setBodyWeight] = useState<BodyWeightLog | null>(null);
  const status: SettingsStatus = failed || weightStatus === "error" ? "error" : ready && weightStatus === "ready" ? "ready" : "loading";

  useEffect(() => {
    if (!userId) return;
    getLatestBodyWeight(userId)
      .then((latest) => { setBodyWeight(latest); setWeightStatus("ready"); })
      .catch((error) => { console.error(error); setWeightStatus("error"); });
  }, [userId]);

  /** Optimistic (the provider shows the change at once and reverts it if saving fails); the failure is reported here. */
  async function savePrefs(patch: Partial<UserPreferences>, failureMessage: string) {
    await attempt(() => save(patch), failureMessage);
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
