import { useEffect, useState } from "react";
import { getSignedInUser } from "@/lib/auth";
import { getPreferences } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/cache";
import type { UserPreferences } from "@/lib/types";
import type { WeightUnit } from "@/lib/units";

/** The user's display unit: cached value immediately, then refreshed from the DB. */
export function useWeightUnit(): WeightUnit {
  const [unit, setUnit] = useState<WeightUnit>(() => cacheGet<UserPreferences>("prefs")?.unit ?? "kg");

  useEffect(() => {
    async function refresh() {
      const user = await getSignedInUser();
      if (!user) return;
      const prefs = await getPreferences(user.id);
      setUnit(prefs.unit);
      cacheSet("prefs", prefs);
    }
    refresh().catch((error) => console.error(error)); // keep the cached unit
  }, []);

  return unit;
}
