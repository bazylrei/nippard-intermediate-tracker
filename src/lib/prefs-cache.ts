import { cacheGet, cacheSet } from "./cache";
import type { UserPreferences } from "./types";

const KEY = "prefs";

/** What a user who has never saved preferences gets. */
export const DEFAULT_PREFS: UserPreferences = { unit: "kg", alternateSelections: {}, exerciseNotes: {} };

/** Last preferences seen on this device, so screens can render before the DB answers. */
export function readCachedPrefs(): UserPreferences | null {
  return cacheGet<UserPreferences>(KEY);
}

export function cachePrefs(prefs: UserPreferences): void {
  cacheSet(KEY, prefs);
}
