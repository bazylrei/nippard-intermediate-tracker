"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { getLatestBodyWeight, logBodyWeight } from "@/lib/db";
import { localYmd } from "@/lib/dates";
import { displayToKg, type WeightUnit } from "@/lib/units";
import type { BodyWeightLog } from "@/lib/types";
import { isWeighInDue, skipWeighInThisWeek } from "@/lib/weigh-in";

interface WeighIn {
  /** Show the prompt: nothing logged since the week started, and not skipped. */
  due: boolean;
  unit: WeightUnit;
  /** Logs today's weight (in the user's unit); rejects if the save fails. */
  save: (weight: number) => Promise<void>;
  skip: () => void;
}

/** The weekly weigh-in prompt's state. A failed check just leaves the prompt hidden. */
export function useWeighIn(): WeighIn {
  const userId = useAuth().user?.id ?? null;
  const { prefs, ready } = usePreferences();
  const { unit, weekStartsOn } = prefs;
  /** The latest weigh-in; undefined until looked up. */
  const [latest, setLatest] = useState<BodyWeightLog | null | undefined>(undefined);
  const [now] = useState(() => new Date());
  /** Saved or skipped this visit. */
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getLatestBodyWeight(userId)
      .then((found) => { if (!cancelled) setLatest(found); })
      .catch((error) => console.error(error));
    return () => { cancelled = true; };
  }, [userId]);

  // Due only once both the week start (preferences) and the last weigh-in are known.
  const due = ready && latest !== undefined && !dismissed && isWeighInDue(latest, now, weekStartsOn);

  const save = useCallback(async (weight: number) => {
    if (!userId) return;
    await logBodyWeight(userId, localYmd(new Date()), displayToKg(weight, unit));
    setDismissed(true);
  }, [userId, unit]);

  const skip = useCallback(() => {
    skipWeighInThisWeek(new Date(), weekStartsOn);
    setDismissed(true);
  }, [weekStartsOn]);

  return { due, unit, save, skip };
}
