import { cacheGet, cacheSet } from "./cache";

/** "system" follows the device's appearance; the others override it on this device. */
export type ThemePreference = "system" | "light" | "dark";

export const THEME_PREFERENCES: ThemePreference[] = ["system", "light", "dark"];

/** cache.ts key; the full localStorage key is `workout_cache_theme`. */
const KEY = "theme";
const STORAGE_KEY = `workout_cache_${KEY}`;

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as string[]).includes(value);
}

export function readThemePreference(): ThemePreference {
  const stored = cacheGet<unknown>(KEY);
  return isThemePreference(stored) ? stored : "system";
}

/** `html.light` / `html.dark` (globals.css) override the device setting; no class follows it. */
export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (theme !== "system") root.classList.add(theme);
}

export function saveThemePreference(theme: ThemePreference): void {
  cacheSet(KEY, theme);
  applyTheme(theme);
}

/**
 * Inlined in <head> so the saved theme applies before first paint (no flash
 * of the wrong theme). Plain ES5, no imports: it runs before the app loads.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}));if(t==="light"||t==="dark")document.documentElement.classList.add(t);}catch(e){}})();`;
