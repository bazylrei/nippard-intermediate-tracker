import { cacheGet, cacheSet } from "./cache";
import type { UserPreferences } from "./types";

const KEY = "prefs";

/** What a user who has never saved preferences gets. */
export const DEFAULT_PREFS: UserPreferences = { unit: "kg", alternateSelections: {}, exerciseNotes: {}, weekStartsOn: 1 };

/** Last preferences seen on this device, so screens can render before the DB answers. */
export function readCachedPrefs(): UserPreferences | null {
  const cached = cacheGet<UserPreferences>(KEY);
  // Fill fields added since this device cached its copy.
  return cached && { ...DEFAULT_PREFS, ...cached };
}

export function cachePrefs(prefs: UserPreferences): void {
  cacheSet(KEY, prefs);
}
