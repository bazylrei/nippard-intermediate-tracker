import { usePreferences } from "@/context/PreferencesContext";
import type { WeightUnit } from "@/lib/units";

/** The user's display unit: the cached value immediately, the account's once loaded. */
export function useWeightUnit(): WeightUnit {
  return usePreferences().prefs.unit;
}
