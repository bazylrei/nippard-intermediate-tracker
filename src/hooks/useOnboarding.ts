import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireUser } from "@/context/AuthContext";
import { getPreferences, logBodyWeight, upsertPreferences } from "@/lib/db";
import { localYmd } from "@/lib/dates";
import { checkOnboarded, finishOnboarding } from "@/lib/onboarding";
import { cachePrefs, DEFAULT_PREFS } from "@/lib/prefs-cache";
import { displayToKg, type WeightUnit } from "@/lib/units";
import type { UserPreferences } from "@/lib/types";
import { useSaveError } from "./useSaveError";

export const ONBOARDING_STEPS = ["units", "weight", "program"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
export type OnboardingStatus = "loading" | "ready" | "error";

const HOME = "/";

/**
 * The onboarding flow: which step is showing, what's been chosen, and the saves
 * behind each step. A step only moves on once its save worked; failures show
 * through `saveError`. Someone who has already finished is sent Home.
 */
export function useOnboarding() {
  const router = useRouter();
  const userId = useRequireUser()?.id ?? null;
  const saveError = useSaveError();
  const { attempt, clear } = saveError;
  const [status, setStatus] = useState<OnboardingStatus>("loading");
  const [saved, setSaved] = useState<UserPreferences>(DEFAULT_PREFS);
  const [stepIndex, setStepIndex] = useState(0);
  const [unit, setUnit] = useState<WeightUnit>(DEFAULT_PREFS.unit);
  const [weekStartsOn, setWeekStartsOn] = useState(DEFAULT_PREFS.weekStartsOn);

  useEffect(() => {
    if (!userId) return;
    async function load(id: string) {
      try {
        const [done, prefs] = await Promise.all([checkOnboarded(id), getPreferences(id)]);
        if (done) { router.replace(HOME); return; }
        setSaved(prefs);
        setUnit(prefs.unit);
        setWeekStartsOn(prefs.weekStartsOn);
        setStatus("ready");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }
    void load(userId);
  }, [userId, router]);

  const next = useCallback(() => {
    clear();
    setStepIndex((i) => Math.min(i + 1, ONBOARDING_STEPS.length - 1));
  }, [clear]);

  const back = useCallback(() => {
    clear();
    setStepIndex((i) => Math.max(i - 1, 0));
  }, [clear]);

  /** Saves the unit and first day of the week, then moves on. */
  async function saveUnits() {
    if (!userId) return;
    const ok = await attempt(async () => {
      await upsertPreferences(userId, { unit, weekStartsOn });
      cachePrefs({ ...saved, unit, weekStartsOn });
    }, "Couldn't save your settings. Try again.");
    if (ok) next();
  }

  /** Logs today's weigh-in (typed in the chosen unit), then moves on. Rejects if saving fails, for the form to show. */
  async function saveBodyWeight(weight: number) {
    if (!userId) return;
    await logBodyWeight(userId, localYmd(new Date()), displayToKg(weight, unit));
    next();
  }

  /** Marks onboarding finished; resolves false (with the error shown) if that couldn't be saved. */
  async function finish(): Promise<boolean> {
    if (!userId) return false;
    return attempt(() => finishOnboarding(userId), "Couldn't finish setting up. Try again.");
  }

  return {
    status, step: ONBOARDING_STEPS[stepIndex], stepIndex, saveError,
    unit, weekStartsOn, setUnit, setWeekStartsOn,
    next, back, saveUnits, saveBodyWeight, finish,
  };
}
