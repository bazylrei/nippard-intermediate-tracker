import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPreferences } from "@/lib/db";
import { cachePrefs, readCachedPrefs } from "@/lib/prefs-cache";
import type { WeightUnit } from "@/lib/units";

/** The user's display unit: cached value immediately, then refreshed from the DB. */
export function useWeightUnit(): WeightUnit {
  const userId = useAuth().user?.id;
  const [unit, setUnit] = useState<WeightUnit>(() => readCachedPrefs()?.unit ?? "kg");

  useEffect(() => {
    if (!userId) return;
    async function refresh(id: string) {
      const prefs = await getPreferences(id);
      setUnit(prefs.unit);
      cachePrefs(prefs);
    }
    refresh(userId).catch((error) => console.error(error)); // keep the cached unit
  }, [userId]);

  return unit;
}
