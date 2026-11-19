"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getLatestBodyWeight, getPreferences, logBodyWeight } from "@/lib/db";
import { localYmd } from "@/lib/dates";
import { displayToKg, type WeightUnit } from "@/lib/units";
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
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const [weekStartsOn, setWeekStartsOn] = useState(1);
  const [due, setDue] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function check(id: string) {
      const [prefs, latest] = await Promise.all([getPreferences(id), getLatestBodyWeight(id)]);
      if (cancelled) return;
      setUnit(prefs.unit);
      setWeekStartsOn(prefs.weekStartsOn);
      setDue(isWeighInDue(latest, new Date(), prefs.weekStartsOn));
    }
    check(userId).catch((error) => console.error(error));
    return () => { cancelled = true; };
  }, [userId]);

  const save = useCallback(async (weight: number) => {
    if (!userId) return;
    await logBodyWeight(userId, localYmd(new Date()), displayToKg(weight, unit));
    setDue(false);
  }, [userId, unit]);

  const skip = useCallback(() => {
    skipWeighInThisWeek(new Date(), weekStartsOn);
    setDue(false);
  }, [weekStartsOn]);

  return { due, unit, save, skip };
}
