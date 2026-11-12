import { useEffect, useState } from "react";
import { getSignedInUser } from "@/lib/auth";
import { getPreferences } from "@/lib/db";
import { cachePrefs, readCachedPrefs } from "@/lib/prefs-cache";
import type { WeightUnit } from "@/lib/units";

/** The user's display unit: cached value immediately, then refreshed from the DB. */
export function useWeightUnit(): WeightUnit {
  const [unit, setUnit] = useState<WeightUnit>(() => readCachedPrefs()?.unit ?? "kg");

  useEffect(() => {
    async function refresh() {
      const user = await getSignedInUser();
      if (!user) return;
      const prefs = await getPreferences(user.id);
      setUnit(prefs.unit);
      cachePrefs(prefs);
    }
    refresh().catch((error) => console.error(error)); // keep the cached unit
  }, []);

  return unit;
}
