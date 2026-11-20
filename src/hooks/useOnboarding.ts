import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSignedInUser } from "@/lib/require-user";
import { getPreferences, getPrograms, logBodyWeight, upsertPreferences } from "@/lib/db";
import { localYmd } from "@/lib/dates";
import { checkOnboarded, finishOnboarding } from "@/lib/onboarding";
import { cachePrefs, DEFAULT_PREFS } from "@/lib/prefs-cache";
import { displayToKg, type WeightUnit } from "@/lib/units";
import type { ProgramRow, UserPreferences } from "@/lib/types";
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
  const saveError = useSaveError();
  const { attempt, clear } = saveError;
  const [status, setStatus] = useState<OnboardingStatus>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState<UserPreferences>(DEFAULT_PREFS);
  const [stepIndex, setStepIndex] = useState(0);
  const [unit, setUnit] = useState<WeightUnit>(DEFAULT_PREFS.unit);
  const [weekStartsOn, setWeekStartsOn] = useState(DEFAULT_PREFS.weekStartsOn);
  /** The programs on offer at the last step. */
  const [programs, setPrograms] = useState<ProgramRow[]>([]);

  useEffect(() => {
    async function load() {
      const user = await requireSignedInUser(router);
      if (!user) return;
      try {
        const [done, prefs, offered] = await Promise.all([checkOnboarded(user.id), getPreferences(user.id), getPrograms(user.id)]);
        if (done) { router.replace(HOME); return; }
        setUserId(user.id);
        setSaved(prefs);
        setPrograms(offered);
        setUnit(prefs.unit);
        setWeekStartsOn(prefs.weekStartsOn);
        setStatus("ready");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }
    void load();
  }, [router]);

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
    status, step: ONBOARDING_STEPS[stepIndex], stepIndex, saveError, programs,
    unit, weekStartsOn, setUnit, setWeekStartsOn,
    next, back, saveUnits, saveBodyWeight, finish,
  };
}
